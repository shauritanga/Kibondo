<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Services\CampaignService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function __construct(private CampaignService $service) {}

    public function index(): JsonResponse
    {
        $campaigns = Campaign::with('creator:id,name')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($campaigns);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'channel' => 'sometimes|in:email,sms,both',
            'subject' => 'required_unless:channel,sms|nullable|string|max:255',
            'body' => 'required|string|max:1000',
            'recipient_filter' => 'required|array',
            'recipient_filter.all' => 'sometimes|boolean',
            'recipient_filter.type' => 'sometimes|array',
            'recipient_filter.type.*' => 'in:retail,wholesale,distributor,hotel,restaurant,repeat_buyer',
            'recipient_filter.sms_group_id' => 'sometimes|uuid|exists:sms_groups,id',
            'recipient_filter.sms_group_ids' => 'sometimes|array',
            'recipient_filter.sms_group_ids.*' => 'uuid|exists:sms_groups,id',
            'scheduled_at' => 'sometimes|nullable|date|after:now',
        ]);

        $data['channel'] = $data['channel'] ?? 'email';
        if ($data['channel'] === 'sms' && empty($data['subject'])) {
            $data['subject'] = 'SMS';
        }

        $filter = $data['recipient_filter'];
        $hasGroup = ! empty($filter['sms_group_id']) || ! empty($filter['sms_group_ids']);
        $hasType = ! empty($filter['all']) || ! empty($filter['type']);
        if (! $hasGroup && ! $hasType) {
            return response()->json([
                'message' => 'Select customer types, all customers, or an SMS group.',
            ], 422);
        }
        if ($hasGroup && in_array($data['channel'], ['email', 'both'], true)) {
            return response()->json([
                'message' => 'SMS groups can only be used with the SMS channel.',
            ], 422);
        }

        $campaign = $this->service->createCampaign($data, $request->user());

        if (! empty($data['scheduled_at'])) {
            $campaign = $this->service->schedule(
                $campaign,
                Carbon::parse($data['scheduled_at'], config('app.timezone'))
            );
        }

        return response()->json(['data' => $campaign], 201);
    }

    /**
     * Schedule one SMS per selected group on consecutive days at the same time.
     */
    public function scheduleSeries(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'body' => 'required|string|max:1000',
            'group_ids' => 'required|array|min:1',
            'group_ids.*' => 'uuid|exists:sms_groups,id',
            'start_date' => 'required|date',
            'send_time' => ['required', 'regex:/^\d{2}:\d{2}$/'],
        ]);

        $campaigns = $this->service->scheduleDailyGroupSeries($data, $request->user());

        return response()->json([
            'message' => 'Scheduled '.$campaigns->count().' daily group campaign(s).',
            'data' => $campaigns->values(),
        ], 201);
    }

    public function schedule(Request $request, Campaign $campaign): JsonResponse
    {
        $data = $request->validate([
            'scheduled_at' => 'required|date|after:now',
        ]);

        $updated = $this->service->schedule(
            $campaign,
            Carbon::parse($data['scheduled_at'], config('app.timezone'))
        );

        return response()->json([
            'message' => 'Campaign scheduled.',
            'data' => $updated,
        ]);
    }

    public function cancelSchedule(Campaign $campaign): JsonResponse
    {
        $updated = $this->service->cancelSchedule($campaign);

        return response()->json([
            'message' => 'Schedule cancelled. Campaign is now a draft.',
            'data' => $updated,
        ]);
    }

    public function show(Campaign $campaign): JsonResponse
    {
        $campaign->load('creator:id,name');
        $campaign->loadCount(['recipients', 'recipients as pending_count' => fn ($q) => $q->where('status', 'pending')]);

        return response()->json(['data' => $campaign]);
    }

    public function destroy(Campaign $campaign): JsonResponse
    {
        abort_if($campaign->status === 'sending', 422, 'Cannot delete a campaign that is currently sending.');
        $campaign->delete();

        return response()->json(['message' => 'Campaign deleted.']);
    }

    public function send(Request $request, Campaign $campaign): JsonResponse
    {
        $this->authorizeAdmin($request->user());
        $this->service->send($campaign);

        return response()->json(['message' => 'Campaign queued for sending.', 'data' => $campaign->fresh()]);
    }

    public function recipientPreview(Request $request): JsonResponse
    {
        $filter = $request->validate([
            'all' => 'sometimes|boolean',
            'type' => 'sometimes|array',
            'type.*' => 'in:retail,wholesale,distributor,hotel,restaurant,repeat_buyer',
            'sms_group_id' => 'sometimes|uuid|exists:sms_groups,id',
            'sms_group_ids' => 'sometimes|array',
            'sms_group_ids.*' => 'uuid|exists:sms_groups,id',
            'channel' => 'sometimes|in:email,sms,both',
        ]);

        $channel = $filter['channel'] ?? 'email';
        unset($filter['channel']);

        $count = $this->service->recipientCount($filter, $channel);

        return response()->json(['count' => $count]);
    }

    private function authorizeAdmin($user): void
    {
        if ($user->role !== 'admin') {
            abort(403, 'Only admins can send campaigns.');
        }
    }
}
