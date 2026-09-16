<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Services\SmsService;
use App\Support\PhoneNumber;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendCampaignSmsBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;
    public int $timeout = 120;
    public int $maxExceptions = 3;

    /**
     * @param  list<string>  $recipientIds
     */
    public function __construct(
        public Campaign $campaign,
        public array $recipientIds,
    ) {}

    public function handle(SmsService $sms): void
    {
        $recipients = CampaignRecipient::with('customer:id,phone')
            ->where('campaign_id', $this->campaign->id)
            ->whereIn('id', $this->recipientIds)
            ->get();

        if ($recipients->isEmpty()) {
            return;
        }

        $phoneToRecipientIds = [];
        $phones = [];

        foreach ($recipients as $recipient) {
            $phone = PhoneNumber::normalize($recipient->customer?->phone);
            if (! $phone) {
                $recipient->update([
                    'status' => 'failed',
                    'error'  => 'Invalid phone number',
                ]);
                $this->campaign->increment('failed_count');
                continue;
            }

            $phones[] = $phone;
            $phoneToRecipientIds[$phone][] = $recipient->id;
        }

        $phones = array_values(array_unique($phones));

        if ($phones === []) {
            $this->checkCompletion();

            return;
        }

        $result = $sms->sendMany(
            $phones,
            $this->campaign->body,
            [
                'type'        => 'campaign',
                'campaign_id' => $this->campaign->id,
            ]
        );

        $sent = 0;
        $failed = 0;

        foreach ($phoneToRecipientIds as $phone => $ids) {
            $per = $result->byRecipient[$phone] ?? null;
            $ok = $per?->success ?? false;

            CampaignRecipient::whereIn('id', $ids)->update([
                'status'  => $ok ? 'sent' : 'failed',
                'sent_at' => $ok ? now() : null,
                'error'   => $ok ? null : substr((string) ($per?->error ?? $result->error ?? 'SMS send failed'), 0, 255),
            ]);

            $n = count($ids);
            if ($ok) {
                $sent += $n;
            } else {
                $failed += $n;
            }
        }

        if ($sent > 0) {
            $this->campaign->increment('sent_count', $sent);
        }
        if ($failed > 0) {
            $this->campaign->increment('failed_count', $failed);
        }

        $this->checkCompletion();
    }

    public function failed(Throwable $e): void
    {
        Log::error('Campaign SMS batch failed', [
            'campaign_id' => $this->campaign->id,
            'error'       => $e->getMessage(),
        ]);

        $updated = CampaignRecipient::where('campaign_id', $this->campaign->id)
            ->whereIn('id', $this->recipientIds)
            ->where('status', 'pending')
            ->update([
                'status' => 'failed',
                'error'  => substr($e->getMessage(), 0, 255),
            ]);

        if ($updated > 0) {
            $this->campaign->increment('failed_count', $updated);
        }

        $this->checkCompletion();
    }

    private function checkCompletion(): void
    {
        $this->campaign->refresh();
        $done = $this->campaign->sent_count + $this->campaign->failed_count;
        if ($done >= $this->campaign->total_recipients) {
            $status = $this->campaign->failed_count === $this->campaign->total_recipients ? 'failed' : 'sent';
            $this->campaign->update(['status' => $status, 'sent_at' => now()]);
        }
    }
}
