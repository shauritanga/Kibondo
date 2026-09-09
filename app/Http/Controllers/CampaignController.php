<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Services\CampaignService;
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
        ]);

        $data['channel'] = $data['channel'] ?? 'email';
        if ($data['channel'] === 'sms' && empty($data['subject'])) {
            $data['subject'] = 'SMS';
        }

        $campaign = $this->service->createCampaign($data, $request->user());

        return response()->json(['data' => $campaign], 201);
    }

    public function show(Campaign $campaign): JsonResponse
    {
        $campaign->load('creator:id,name');
        $campaign->loadCount(['recipients', 'recipients as pending_count' => fn($q) => $q->where('status', 'pending')]);

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
        $this->authorize('admin', $request->user());
        $this->service->send($campaign);

        return response()->json(['message' => 'Campaign queued for sending.', 'data' => $campaign->fresh()]);
    }

    public function recipientPreview(Request $request): JsonResponse
    {
        $filter = $request->validate([
            'all' => 'sometimes|boolean',
            'type' => 'sometimes|array',
            'type.*' => 'in:retail,wholesale,distributor,hotel,restaurant,repeat_buyer',
            'channel' => 'sometimes|in:email,sms,both',
        ]);

        $channel = $filter['channel'] ?? 'email';
        unset($filter['channel']);

        $count = $this->service->recipientCount($filter, $channel);

        return response()->json(['count' => $count]);
    }

    private function authorize(string $role, $user): void
    {
        if ($user->role !== $role) {
            abort(403, 'Only admins can send campaigns.');
        }
    }
}
