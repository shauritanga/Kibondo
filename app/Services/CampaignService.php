<?php

namespace App\Services;

use App\Jobs\SendCampaignEmailJob;
use App\Jobs\SendCampaignSmsJob;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class CampaignService
{
    public function createCampaign(array $data, User $user): Campaign
    {
        $channel = $data['channel'] ?? 'email';

        return Campaign::create([
            'name' => $data['name'],
            'subject' => $channel === 'sms' ? ($data['subject'] ?? 'SMS') : $data['subject'],
            'body' => $data['body'],
            'channel' => $channel,
            'recipient_filter' => $data['recipient_filter'] ?? [],
            'status' => 'draft',
            'created_by' => $user->id,
        ]);
    }

    public function send(Campaign $campaign): void
    {
        if ($campaign->status !== 'draft') {
            throw ValidationException::withMessages(['campaign' => 'Only draft campaigns can be sent.']);
        }

        $channel = $campaign->channel ?? 'email';
        $emailRecipients = in_array($channel, ['email', 'both'], true)
            ? $this->resolveEmailRecipients($campaign->recipient_filter ?? [])
            : collect();
        $smsRecipients = in_array($channel, ['sms', 'both'], true)
            ? $this->resolveSmsRecipients($campaign->recipient_filter ?? [])
            : collect();

        if ($emailRecipients->isEmpty() && $smsRecipients->isEmpty()) {
            throw ValidationException::withMessages([
                'campaign' => 'No matching recipients for the selected channel and filter.',
            ]);
        }

        $jobCount = $emailRecipients->count() + $smsRecipients->count();

        $campaign->update([
            'status' => 'sending',
            'total_recipients' => $jobCount,
            'sent_count' => 0,
            'failed_count' => 0,
        ]);

        foreach ($emailRecipients as $customer) {
            $recipient = CampaignRecipient::create([
                'campaign_id' => $campaign->id,
                'customer_id' => $customer->id,
                'status' => 'pending',
            ]);
            SendCampaignEmailJob::dispatch($campaign, $customer, $recipient->id);
        }

        foreach ($smsRecipients as $customer) {
            $recipient = CampaignRecipient::firstOrCreate(
                [
                    'campaign_id' => $campaign->id,
                    'customer_id' => $customer->id,
                ],
                ['status' => 'pending']
            );
            SendCampaignSmsJob::dispatch($campaign, $customer, $recipient->id);
        }
    }

    public function recipientCount(array $filter, string $channel = 'email'): int
    {
        return match ($channel) {
            'sms' => $this->resolveSmsRecipients($filter)->count(),
            'both' => $this->resolveEmailRecipients($filter)->pluck('id')
                ->merge($this->resolveSmsRecipients($filter)->pluck('id'))
                ->unique()
                ->count(),
            default => $this->resolveEmailRecipients($filter)->count(),
        };
    }

    private function resolveEmailRecipients(array $filter): Collection
    {
        $query = Customer::whereNotNull('email')->where('email', '!=', '');
        $this->applyTypeFilter($query, $filter);

        return $query->get();
    }

    private function resolveSmsRecipients(array $filter): Collection
    {
        $query = Customer::whereNotNull('phone')
            ->where('phone', '!=', '')
            ->where('sms_marketing_opt_in', true);
        $this->applyTypeFilter($query, $filter);

        return $query->get();
    }

    private function applyTypeFilter($query, array $filter): void
    {
        if (empty($filter['all']) && ! empty($filter['type'])) {
            $query->whereIn('type', $filter['type']);
        }
    }
}
