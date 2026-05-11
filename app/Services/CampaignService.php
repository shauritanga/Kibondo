<?php

namespace App\Services;

use App\Jobs\SendCampaignEmailJob;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CampaignService
{
    public function createCampaign(array $data, User $user): Campaign
    {
        return Campaign::create([
            'name' => $data['name'],
            'subject' => $data['subject'],
            'body' => $data['body'],
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

        $customers = $this->resolveRecipients($campaign->recipient_filter);

        if ($customers->isEmpty()) {
            throw ValidationException::withMessages(['campaign' => 'No customers with email addresses match the selected filter.']);
        }

        $campaign->update([
            'status' => 'sending',
            'total_recipients' => $customers->count(),
            'sent_count' => 0,
            'failed_count' => 0,
        ]);

        foreach ($customers as $customer) {
            $recipient = CampaignRecipient::create([
                'campaign_id' => $campaign->id,
                'customer_id' => $customer->id,
                'status' => 'pending',
            ]);

            SendCampaignEmailJob::dispatch($campaign, $customer, $recipient->id);
        }
    }

    public function recipientCount(array $filter): int
    {
        return $this->resolveRecipients($filter)->count();
    }

    private function resolveRecipients(array $filter)
    {
        $query = Customer::whereNotNull('email')->where('email', '!=', '');

        if (empty($filter['all']) && !empty($filter['type'])) {
            $query->whereIn('type', $filter['type']);
        }

        return $query->get();
    }
}
