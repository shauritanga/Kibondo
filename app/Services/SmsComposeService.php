<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\SmsGroup;
use App\Sms\SmsBulkResult;
use App\Sms\SmsResult;
use App\Support\ContactListFileParser;
use App\Support\PhoneNumber;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class SmsComposeService
{
    public function __construct(
        private SmsService $sms,
        private SmsGroupService $groups,
        private ContactListFileParser $parser,
    ) {}

    public function sendSingle(string $to, string $body, array $meta = []): SmsResult
    {
        $phone = PhoneNumber::normalize($to);
        if (! $phone) {
            throw ValidationException::withMessages(['to' => 'Invalid phone number.']);
        }

        return $this->sms->send($phone, $body, array_merge([
            'type' => 'admin_single',
        ], $meta));
    }

    /**
     * @param  array{
     *   source: 'phones'|'group'|'customers'|'file',
     *   phones?: list<string>,
     *   group_id?: string,
     *   customer_ids?: list<string>,
     *   customer_filter?: array{all?: bool, type?: list<string>},
     *   file?: UploadedFile,
     * }  $payload
     * @return list<string>
     */
    public function resolvePhones(array $payload): array
    {
        return match ($payload['source'] ?? '') {
            'phones' => $this->normalizeList($payload['phones'] ?? []),
            'group' => $this->phonesFromGroup($payload['group_id'] ?? null),
            'customers' => $this->phonesFromCustomers(
                $payload['customer_ids'] ?? null,
                $payload['customer_filter'] ?? null,
            ),
            'file' => $this->phonesFromFile($payload['file'] ?? null),
            default => throw ValidationException::withMessages([
                'source' => 'Source must be phones, group, customers, or file.',
            ]),
        };
    }

    /**
     * @param  array{
     *   body: string,
     *   source: 'phones'|'group'|'customers'|'file',
     *   phones?: list<string>,
     *   group_id?: string,
     *   customer_ids?: list<string>,
     *   customer_filter?: array{all?: bool, type?: list<string>},
     *   file?: UploadedFile,
     * }  $payload
     * @return array{success: int, failed: int, total: int, result: SmsBulkResult}
     */
    public function sendBulk(array $payload): array
    {
        $body = trim((string) ($payload['body'] ?? ''));
        if ($body === '') {
            throw ValidationException::withMessages(['body' => 'Message body is required.']);
        }
        if (mb_strlen($body) > 1000) {
            throw ValidationException::withMessages(['body' => 'Message must be 1000 characters or fewer.']);
        }

        $phones = $this->resolvePhones($payload);

        if ($phones === []) {
            throw ValidationException::withMessages([
                'recipients' => 'No valid recipients found.',
            ]);
        }

        $result = $this->sms->sendMany($phones, $body, [
            'type' => 'admin_bulk',
            'source' => $payload['source'],
            'group_id' => $payload['group_id'] ?? null,
        ]);

        $success = $result->sentCount();
        $failed = $result->failedCount();
        if ($success + $failed === 0) {
            $success = $result->success ? count($phones) : 0;
            $failed = $result->success ? 0 : count($phones);
        }

        return [
            'success' => $success,
            'failed' => $failed,
            'total' => count($phones),
            'result' => $result,
        ];
    }

    /**
     * @param  list<string>  $phones
     * @return list<string>
     */
    private function normalizeList(array $phones): array
    {
        $unique = [];
        foreach ($phones as $phone) {
            $n = PhoneNumber::normalize(is_string($phone) ? $phone : null);
            if ($n) {
                $unique[$n] = true;
            }
        }

        return array_map('strval', array_keys($unique));
    }

    /**
     * @return list<string>
     */
    private function phonesFromGroup(?string $groupId): array
    {
        if (! $groupId) {
            throw ValidationException::withMessages(['group_id' => 'Group is required.']);
        }

        $group = SmsGroup::find($groupId);
        if (! $group) {
            throw ValidationException::withMessages(['group_id' => 'SMS group not found.']);
        }

        return array_map('strval', $this->groups->phonesForGroup($group));
    }

    /**
     * @param  list<string>|null  $ids
     * @param  array{all?: bool, type?: list<string>}|null  $filter
     * @return list<string>
     */
    private function phonesFromCustomers(?array $ids, ?array $filter): array
    {
        $query = Customer::query()
            ->whereNotNull('phone')
            ->where('phone', '!=', '');

        if (! empty($ids)) {
            $query->whereIn('id', $ids);
        } elseif (! empty($filter['type'])) {
            $query->whereIn('type', $filter['type']);
        } elseif (empty($filter['all'])) {
            throw ValidationException::withMessages([
                'customer_ids' => 'Provide customer_ids, customer_filter.all, or customer_filter.type.',
            ]);
        }

        $unique = [];
        foreach ($query->pluck('phone') as $phone) {
            $n = PhoneNumber::normalize($phone);
            if ($n) {
                $unique[$n] = true;
            }
        }

        return array_map('strval', array_keys($unique));
    }

    /**
     * @return list<string>
     */
    private function phonesFromFile(mixed $file): array
    {
        if (! $file instanceof UploadedFile) {
            throw ValidationException::withMessages(['file' => 'Upload an .xlsx, .csv, or .txt file.']);
        }

        return array_map('strval', array_column($this->parser->parse($file), 'phone'));
    }
}
