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
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'recipient_filter' => 'required|array',
            'recipient_filter.all' => 'sometimes|boolean',
            'recipient_filter.type' => 'sometimes|array',
            'recipient_filter.type.*' => 'in:retail,wholesale,distributor,hotel,restaurant,repeat_buyer',
        ]);

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
        ]);

        $count = $this->service->recipientCount($filter);

        return response()->json(['count' => $count]);
    }

    private function authorize(string $role, $user): void
    {
        if ($user->role !== $role) {
            abort(403, 'Only admins can send campaigns.');
        }
    }
}
