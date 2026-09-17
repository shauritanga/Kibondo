<?php

namespace App\Services;

use App\Jobs\SendCampaignEmailJob;
use App\Jobs\SendCampaignSmsBatchJob;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Customer;
use App\Models\SmsGroupMember;
use App\Models\User;
use App\Support\PhoneNumber;
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
        $filter = $campaign->recipient_filter ?? [];

        $emailRecipients = in_array($channel, ['email', 'both'], true)
            ? $this->resolveEmailRecipients($filter)
            : collect();

        $smsTargets = in_array($channel, ['sms', 'both'], true)
            ? $this->resolveSmsTargets($filter)
            : collect();

        if ($emailRecipients->isEmpty() && $smsTargets->isEmpty()) {
            throw ValidationException::withMessages([
                'campaign' => 'No matching recipients for the selected channel and filter.',
            ]);
        }

        $jobCount = $emailRecipients->count() + $smsTargets->count();

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
                'channel' => 'email',
                'destination' => $customer->email,
                'status' => 'pending',
            ]);
            SendCampaignEmailJob::dispatch($campaign, $customer, $recipient->id);
        }

        if ($smsTargets->isNotEmpty()) {
            $smsRecipientIds = [];

            foreach ($smsTargets as $target) {
                $attrs = [
                    'campaign_id' => $campaign->id,
                    'channel' => 'sms',
                    'destination' => $target['phone'],
                    'status' => 'pending',
                ];

                if (! empty($target['customer_id'])) {
                    $recipient = CampaignRecipient::firstOrCreate(
                        [
                            'campaign_id' => $campaign->id,
                            'customer_id' => $target['customer_id'],
                        ],
                        $attrs
                    );
                    if (! $recipient->wasRecentlyCreated && ! $recipient->destination) {
                        $recipient->update(['destination' => $target['phone'], 'channel' => 'sms']);
                    }
                } else {
                    $recipient = CampaignRecipient::query()
                        ->where('campaign_id', $campaign->id)
                        ->whereNull('customer_id')
                        ->where('destination', $target['phone'])
                        ->first();

                    if (! $recipient) {
                        $recipient = CampaignRecipient::create(array_merge($attrs, [
                            'customer_id' => null,
                        ]));
                    }
                }

                $smsRecipientIds[] = $recipient->id;
            }

            $chunkSize = max(1, (int) config('sms.bulk_chunk_size', 100));

            foreach (array_chunk($smsRecipientIds, $chunkSize) as $chunk) {
                SendCampaignSmsBatchJob::dispatch($campaign, $chunk);
            }
        }
    }

    public function recipientCount(array $filter, string $channel = 'email'): int
    {
        if ($channel === 'sms') {
            return $this->resolveSmsTargets($filter)->count();
        }

        if ($channel === 'both') {
            $emailIds = $this->resolveEmailRecipients($filter)->pluck('id');
            $sms = $this->resolveSmsTargets($filter);
            $linked = $sms->pluck('customer_id')->filter();
            $external = $sms->whereNull('customer_id')->count();

            return $emailIds->merge($linked)->unique()->count() + $external;
        }

        return $this->resolveEmailRecipients($filter)->count();
    }

    private function resolveEmailRecipients(array $filter): Collection
    {
        if (! empty($filter['sms_group_id']) || ! empty($filter['sms_group_ids'])) {
            // Groups are phone-based; email campaigns cannot target groups alone.
            return collect();
        }

        $query = Customer::whereNotNull('email')->where('email', '!=', '');
        $this->applyTypeFilter($query, $filter);

        return $query->get();
    }

    /**
     * @return Collection<int, array{phone: string, customer_id: ?string}>
     */
    private function resolveSmsTargets(array $filter): Collection
    {
        $groupIds = [];
        if (! empty($filter['sms_group_id'])) {
            $groupIds[] = $filter['sms_group_id'];
        }
        if (! empty($filter['sms_group_ids']) && is_array($filter['sms_group_ids'])) {
            $groupIds = array_merge($groupIds, $filter['sms_group_ids']);
        }
        $groupIds = array_values(array_unique(array_filter($groupIds)));

        if ($groupIds !== []) {
            $members = SmsGroupMember::query()
                ->whereIn('sms_group_id', $groupIds)
                ->get(['phone', 'customer_id']);

            $byPhone = [];
            foreach ($members as $member) {
                $phone = PhoneNumber::normalize($member->phone);
                if (! $phone) {
                    continue;
                }
                $byPhone[$phone] = [
                    'phone' => $phone,
                    'customer_id' => $member->customer_id,
                ];
            }

            return collect(array_values($byPhone));
        }

        $query = Customer::whereNotNull('phone')
            ->where('phone', '!=', '')
            ->where('sms_marketing_opt_in', true);
        $this->applyTypeFilter($query, $filter);

        return $query->get()->map(function (Customer $customer) {
            $phone = PhoneNumber::normalize($customer->phone);
            if (! $phone) {
                return null;
            }

            return [
                'phone' => $phone,
                'customer_id' => $customer->id,
            ];
        })->filter()->values();
    }

    private function applyTypeFilter($query, array $filter): void
    {
        if (empty($filter['all']) && ! empty($filter['type'])) {
            $query->whereIn('type', $filter['type']);
        }
    }
}
