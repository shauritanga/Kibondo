<?php

namespace App\Services;

use App\Jobs\SendCampaignEmailJob;
use App\Jobs\SendCampaignSmsBatchJob;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Customer;
use App\Models\SmsGroup;
use App\Models\SmsGroupMember;
use App\Models\User;
use App\Support\PhoneNumber;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
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

    public function schedule(Campaign $campaign, Carbon $when): Campaign
    {
        if (! in_array($campaign->status, ['draft', 'scheduled'], true)) {
            throw ValidationException::withMessages([
                'campaign' => 'Only draft or scheduled campaigns can be (re)scheduled.',
            ]);
        }

        if ($when->lessThanOrEqualTo(now())) {
            throw ValidationException::withMessages([
                'scheduled_at' => 'Schedule time must be in the future.',
            ]);
        }

        $campaign->update([
            'status' => 'scheduled',
            'scheduled_at' => $when,
        ]);

        return $campaign->fresh();
    }

    /**
     * Create one scheduled SMS campaign per group on consecutive days at the same clock time.
     * Day 0 = start_date at send_time, day 1 = next day, etc. (ordered by group_ids).
     *
     * @param  list<string>  $groupIds
     * @return Collection<int, Campaign>
     */
    public function scheduleDailyGroupSeries(array $data, User $user): Collection
    {
        $groupIds = array_values(array_unique($data['group_ids'] ?? []));
        if ($groupIds === []) {
            throw ValidationException::withMessages(['group_ids' => 'Select at least one SMS group.']);
        }

        $groups = SmsGroup::whereIn('id', $groupIds)->get()->keyBy('id');
        foreach ($groupIds as $id) {
            if (! $groups->has($id)) {
                throw ValidationException::withMessages(['group_ids' => "Unknown SMS group: {$id}"]);
            }
        }

        $startDate = Carbon::parse($data['start_date'], config('app.timezone'))->startOfDay();
        [$hour, $minute] = array_map('intval', explode(':', $data['send_time']));

        $body = trim((string) $data['body']);
        $baseName = trim((string) $data['name']);

        $campaigns = collect();

        DB::transaction(function () use ($groupIds, $groups, $startDate, $hour, $minute, $body, $baseName, $user, &$campaigns) {
            foreach ($groupIds as $index => $groupId) {
                $when = $startDate->copy()->addDays($index)->setTime($hour, $minute, 0);

                if ($when->lessThanOrEqualTo(now())) {
                    throw ValidationException::withMessages([
                        'start_date' => 'First send time must be in the future. Pick a later date or time.',
                    ]);
                }

                $group = $groups->get($groupId);
                $campaigns->push(Campaign::create([
                    'name' => sprintf('%s — %s (Day %d)', $baseName, $group->name, $index + 1),
                    'subject' => 'SMS',
                    'body' => $body,
                    'channel' => 'sms',
                    'recipient_filter' => ['sms_group_id' => $groupId],
                    'status' => 'scheduled',
                    'scheduled_at' => $when,
                    'created_by' => $user->id,
                ]));
            }
        });

        return $campaigns;
    }

    /**
     * Dispatch all due scheduled campaigns. Returns how many were started.
     */
    public function dispatchDue(): int
    {
        $dueIds = Campaign::query()
            ->where('status', 'scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->orderBy('scheduled_at')
            ->pluck('id');

        $started = 0;

        foreach ($dueIds as $id) {
            $campaign = Campaign::query()
                ->where('id', $id)
                ->where('status', 'scheduled')
                ->first();

            if (! $campaign) {
                continue;
            }

            try {
                $this->send($campaign);
                $started++;
            } catch (\Throwable $e) {
                // Re-load in case status already moved past scheduled.
                $campaign->refresh();
                if ($campaign->status === 'scheduled' || $campaign->status === 'draft') {
                    $campaign->update([
                        'status' => 'failed',
                        'failed_count' => max(1, (int) $campaign->failed_count),
                    ]);
                }
                report($e);
            }
        }

        return $started;
    }

    public function cancelSchedule(Campaign $campaign): Campaign
    {
        if ($campaign->status !== 'scheduled') {
            throw ValidationException::withMessages([
                'campaign' => 'Only scheduled campaigns can be cancelled back to draft.',
            ]);
        }

        $campaign->update([
            'status' => 'draft',
            'scheduled_at' => null,
        ]);

        return $campaign->fresh();
    }

    public function send(Campaign $campaign): void
    {
        $claimed = Campaign::query()
            ->where('id', $campaign->id)
            ->whereIn('status', ['draft', 'scheduled'])
            ->update([
                'status' => 'sending',
                'sent_count' => 0,
                'failed_count' => 0,
            ]);

        if ($claimed !== 1) {
            throw ValidationException::withMessages([
                'campaign' => 'Only draft or scheduled campaigns can be sent.',
            ]);
        }

        $campaign->refresh();

        $channel = $campaign->channel ?? 'email';
        $filter = $campaign->recipient_filter ?? [];

        $emailRecipients = in_array($channel, ['email', 'both'], true)
            ? $this->resolveEmailRecipients($filter)
            : collect();

        $smsTargets = in_array($channel, ['sms', 'both'], true)
            ? $this->resolveSmsTargets($filter)
            : collect();

        if ($emailRecipients->isEmpty() && $smsTargets->isEmpty()) {
            $campaign->update(['status' => 'failed']);
            throw ValidationException::withMessages([
                'campaign' => 'No matching recipients for the selected channel and filter.',
            ]);
        }

        $jobCount = $emailRecipients->count() + $smsTargets->count();
        $campaign->update(['total_recipients' => $jobCount]);

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
