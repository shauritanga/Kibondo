<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\SmsGroup;
use App\Models\SmsGroupMember;
use App\Models\User;
use App\Support\ContactListFileParser;
use App\Support\PhoneNumber;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class SmsGroupService
{
    public function __construct(private ContactListFileParser $parser) {}

    public function create(array $data, User $user): SmsGroup
    {
        return SmsGroup::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'created_by' => $user->id,
        ]);
    }

    public function update(SmsGroup $group, array $data): SmsGroup
    {
        $group->update([
            'name' => $data['name'] ?? $group->name,
            'description' => array_key_exists('description', $data)
                ? $data['description']
                : $group->description,
        ]);

        return $group->fresh();
    }

    /**
     * @param  list<string>  $customerIds
     * @return array{added: int, skipped: int}
     */
    public function addCustomers(SmsGroup $group, array $customerIds): array
    {
        $customers = Customer::whereIn('id', $customerIds)->get(['id', 'phone', 'name']);
        $rows = [];
        foreach ($customers as $customer) {
            $phone = PhoneNumber::normalize($customer->phone);
            if (! $phone) {
                continue;
            }
            $rows[] = [
                'phone' => $phone,
                'name' => $customer->name,
                'customer_id' => $customer->id,
            ];
        }

        return $this->upsertMembers($group, $rows);
    }

    /**
     * @param  list<array{phone: string, name?: ?string}>  $entries
     * @return array{added: int, skipped: int}
     */
    public function addPhones(SmsGroup $group, array $entries): array
    {
        $rows = [];
        foreach ($entries as $entry) {
            $phone = PhoneNumber::normalize($entry['phone'] ?? null);
            if (! $phone) {
                continue;
            }
            $rows[] = [
                'phone' => $phone,
                'name' => isset($entry['name']) ? trim((string) $entry['name']) ?: null : null,
                'customer_id' => null,
            ];
        }

        return $this->upsertMembers($group, $rows);
    }

    /**
     * @return array{added: int, skipped: int, total_parsed: int}
     */
    public function importFile(SmsGroup $group, UploadedFile $file): array
    {
        $parsed = $this->parser->parse($file);
        $result = $this->upsertMembers($group, array_map(
            fn (array $row) => [
                'phone' => $row['phone'],
                'name' => $row['name'],
                'customer_id' => null,
            ],
            $parsed
        ));

        return $result + ['total_parsed' => count($parsed)];
    }

    /**
     * @param  list<array{phone: string, name: ?string, customer_id: ?string}>  $rows
     * @return array{added: int, skipped: int}
     */
    private function upsertMembers(SmsGroup $group, array $rows): array
    {
        if ($rows === []) {
            throw ValidationException::withMessages([
                'members' => 'No valid phone numbers to add.',
            ]);
        }

        $existing = $group->members()->pluck('phone')->all();
        $existingSet = array_fill_keys($existing, true);

        $added = 0;
        $skipped = 0;
        $now = now();

        $toInsert = [];
        foreach ($rows as $row) {
            if (isset($existingSet[$row['phone']])) {
                $skipped++;
                continue;
            }
            $existingSet[$row['phone']] = true;
            $toInsert[] = [
                'id' => (string) str()->uuid(),
                'sms_group_id' => $group->id,
                'phone' => $row['phone'],
                'name' => $row['name'],
                'customer_id' => $row['customer_id'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $added++;
        }

        foreach (array_chunk($toInsert, 500) as $chunk) {
            SmsGroupMember::insert($chunk);
        }

        return ['added' => $added, 'skipped' => $skipped];
    }

    /**
     * @return list<string>
     */
    public function phonesForGroup(SmsGroup $group): array
    {
        return $group->members()->orderBy('phone')->pluck('phone')->all();
    }
}
