<?php

namespace App\Http\Controllers;

use App\Models\SmsMessageLog;
use App\Services\SmsComposeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsComposeController extends Controller
{
    public function __construct(private SmsComposeService $compose) {}

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'to' => 'required|string|max:30',
            'body' => 'required|string|max:1000',
        ]);

        $result = $this->compose->sendSingle($data['to'], $data['body'], [
            'sent_by' => $request->user()->id,
        ]);

        if (! $result->success) {
            return response()->json([
                'message' => $result->error ?? 'SMS failed to send.',
            ], 422);
        }

        return response()->json([
            'message' => 'SMS sent.',
            'provider_message_id' => $result->providerMessageId,
        ]);
    }

    public function sendBulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'body' => 'required|string|max:1000',
            'source' => 'required|in:phones,group,customers,file',
            'phones' => 'required_if:source,phones|array',
            'phones.*' => 'string|max:30',
            'group_id' => 'required_if:source,group|nullable|uuid|exists:sms_groups,id',
            'customer_ids' => 'sometimes|array',
            'customer_ids.*' => 'uuid|exists:customers,id',
            'customer_filter' => 'sometimes|array',
            'customer_filter.all' => 'sometimes|boolean',
            'customer_filter.type' => 'sometimes|array',
            'customer_filter.type.*' => 'in:retail,wholesale,distributor,hotel,restaurant,repeat_buyer',
            'file' => 'required_if:source,file|file|max:5120',
        ]);

        if ($data['source'] === 'file') {
            $data['file'] = $request->file('file');
        }

        $result = $this->compose->sendBulk($data);

        return response()->json([
            'message' => 'Bulk SMS finished.',
            'total' => $result['total'],
            'success' => $result['success'],
            'failed' => $result['failed'],
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source' => 'required|in:phones,group,customers,file',
            'phones' => 'sometimes|array',
            'phones.*' => 'string|max:30',
            'group_id' => 'nullable|uuid|exists:sms_groups,id',
            'customer_ids' => 'sometimes|array',
            'customer_ids.*' => 'uuid|exists:customers,id',
            'customer_filter' => 'sometimes|array',
            'customer_filter.all' => 'sometimes|boolean',
            'customer_filter.type' => 'sometimes|array',
            'customer_filter.type.*' => 'in:retail,wholesale,distributor,hotel,restaurant,repeat_buyer',
            'file' => 'sometimes|file|max:5120',
        ]);

        if ($data['source'] === 'file' && $request->hasFile('file')) {
            $data['file'] = $request->file('file');
        }

        $phones = $this->compose->resolvePhones($data);

        return response()->json(['count' => count($phones)]);
    }

    public function recent(): JsonResponse
    {
        $logs = SmsMessageLog::query()
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'provider', 'to', 'body', 'status', 'error', 'context', 'created_at']);

        return response()->json(['data' => $logs]);
    }
}
