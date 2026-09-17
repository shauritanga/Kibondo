<?php

namespace App\Http\Controllers;

use App\Models\SmsGroup;
use App\Models\SmsGroupMember;
use App\Services\SmsGroupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsGroupController extends Controller
{
    public function __construct(private SmsGroupService $service) {}

    public function index(): JsonResponse
    {
        $groups = SmsGroup::with('creator:id,name')
            ->withCount('members')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $groups]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        $group = $this->service->create($data, $request->user());

        return response()->json(['data' => $group->loadCount('members')], 201);
    }

    public function show(SmsGroup $smsGroup): JsonResponse
    {
        $smsGroup->load(['creator:id,name', 'members' => fn ($q) => $q->orderBy('name')->orderBy('phone')]);
        $smsGroup->loadCount('members');

        return response()->json(['data' => $smsGroup]);
    }

    public function update(Request $request, SmsGroup $smsGroup): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        $group = $this->service->update($smsGroup, $data);

        return response()->json(['data' => $group->loadCount('members')]);
    }

    public function destroy(SmsGroup $smsGroup): JsonResponse
    {
        $smsGroup->delete();

        return response()->json(['message' => 'SMS group deleted.']);
    }

    public function addMembers(Request $request, SmsGroup $smsGroup): JsonResponse
    {
        $data = $request->validate([
            'customer_ids' => 'sometimes|array',
            'customer_ids.*' => 'uuid|exists:customers,id',
            'phones' => 'sometimes|array',
            'phones.*.phone' => 'required|string|max:30',
            'phones.*.name' => 'nullable|string|max:255',
        ]);

        if (empty($data['customer_ids']) && empty($data['phones'])) {
            return response()->json(['message' => 'Provide customer_ids and/or phones.'], 422);
        }

        $added = 0;
        $skipped = 0;

        if (! empty($data['customer_ids'])) {
            $r = $this->service->addCustomers($smsGroup, $data['customer_ids']);
            $added += $r['added'];
            $skipped += $r['skipped'];
        }

        if (! empty($data['phones'])) {
            $r = $this->service->addPhones($smsGroup, $data['phones']);
            $added += $r['added'];
            $skipped += $r['skipped'];
        }

        return response()->json([
            'message' => 'Members updated.',
            'added' => $added,
            'skipped' => $skipped,
            'members_count' => $smsGroup->members()->count(),
        ]);
    }

    public function importMembers(Request $request, SmsGroup $smsGroup): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:5120',
        ]);

        $result = $this->service->importFile($smsGroup, $request->file('file'));

        return response()->json([
            'message' => 'Import complete.',
            'added' => $result['added'],
            'skipped' => $result['skipped'],
            'total_parsed' => $result['total_parsed'],
            'members_count' => $smsGroup->members()->count(),
        ]);
    }

    public function destroyMember(SmsGroup $smsGroup, SmsGroupMember $member): JsonResponse
    {
        abort_unless($member->sms_group_id === $smsGroup->id, 404);
        $member->delete();

        return response()->json(['message' => 'Member removed.']);
    }

    public function clearMembers(SmsGroup $smsGroup): JsonResponse
    {
        $smsGroup->members()->delete();

        return response()->json(['message' => 'All members removed.']);
    }
}
