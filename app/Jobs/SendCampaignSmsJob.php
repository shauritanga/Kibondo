<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Customer;
use App\Services\Sms\SmsClient;
use App\Services\Sms\PhoneNumber;
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

    public function handle(SmsClient $sms): void
    {
        $phone = PhoneNumber::normalize($this->customer->phone);

        if (! $phone) {
            throw new \RuntimeException('Customer has no valid phone number.');
        }

        $result = $sms->send($phone, $this->campaign->body);

        if (! $result->successful) {
            throw new \RuntimeException($result->error ?: 'SMS delivery failed.');
        }

        CampaignRecipient::where('id', $this->recipientId)->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $this->campaign->increment('sent_count');
        $this->checkCompletion();
    }

    public function failed(Throwable $e): void
    {
        CampaignRecipient::where('id', $this->recipientId)->update([
            'status' => 'failed',
            'error' => substr($e->getMessage(), 0, 255),
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
