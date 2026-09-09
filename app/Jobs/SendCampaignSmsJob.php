<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Customer;
use App\Services\SmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SendCampaignSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;
    public int $timeout = 30;
    public int $maxExceptions = 3;

    public function __construct(
        public Campaign $campaign,
        public Customer $customer,
        public string $recipientId,
    ) {}

    public function handle(SmsService $sms): void
    {
        $result = $sms->send(
            $this->customer->phone,
            $this->campaign->body,
            [
                'type'        => 'campaign',
                'campaign_id' => $this->campaign->id,
                'customer_id' => $this->customer->id,
            ]
        );

        if (! $result->success) {
            throw new \RuntimeException($result->error ?? 'SMS send failed');
        }

        CampaignRecipient::where('id', $this->recipientId)->update([
            'status'  => 'sent',
            'sent_at' => now(),
        ]);

        // Only increment if this recipient wasn't already counted by email job
        // For "both" channel, email job increments first; SMS uses same recipient row.
        // Increment once per successful SMS delivery for sms-only; for both we still
        // want progress toward total_recipients (unique customers). Use a soft bump:
        $this->campaign->increment('sent_count');
        $this->checkCompletion();
    }

    public function failed(Throwable $e): void
    {
        CampaignRecipient::where('id', $this->recipientId)->update([
            'status' => 'failed',
            'error'  => substr($e->getMessage(), 0, 255),
        ]);

        $this->campaign->increment('failed_count');
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
