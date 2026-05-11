<?php

namespace App\Jobs;

use App\Mail\CampaignMail;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Customer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendCampaignEmailJob implements ShouldQueue
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

    public function handle(): void
    {
        Mail::to($this->customer->email)->send(new CampaignMail($this->campaign, $this->customer));

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
