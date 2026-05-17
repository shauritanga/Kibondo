<?php

namespace App\Http\Controllers;

use App\Http\Resources\DeliveryZoneResource;
use App\Models\DeliveryZone;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DeliveryZoneController extends Controller
{
    public function index(): JsonResponse
    {
        $zones = DeliveryZone::orderBy('name')->get();

        return response()->json(['data' => DeliveryZoneResource::collection($zones)]);
    }

    public function publicIndex(): JsonResponse
    {
        $zones = Cache::remember('delivery_zones_public', 3600, function () {
            return DeliveryZone::where('is_active', true)->orderBy('name')->get();
        });

        return response()->json(['data' => DeliveryZoneResource::collection($zones)]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'          => 'required|string|max:100|unique:delivery_zones,name',
            'delivery_cost' => 'required|integer|min:0',
            'is_active'     => 'sometimes|boolean',
        ]);

        $zone = DeliveryZone::create([
            'name'          => $request->name,
            'delivery_cost' => $request->delivery_cost,
            'is_active'     => $request->boolean('is_active', true),
        ]);

        Cache::forget('delivery_zones_public');

        return response()->json(['data' => new DeliveryZoneResource($zone)], 201);
    }

    public function update(Request $request, DeliveryZone $deliveryZone): JsonResponse
    {
        $request->validate([
            'name'          => "sometimes|string|max:100|unique:delivery_zones,name,{$deliveryZone->id},id",
            'delivery_cost' => 'sometimes|integer|min:0',
            'is_active'     => 'sometimes|boolean',
        ]);

        $deliveryZone->update($request->only(['name', 'delivery_cost', 'is_active']));

        Cache::forget('delivery_zones_public');

        return response()->json(['data' => new DeliveryZoneResource($deliveryZone)]);
    }

    public function destroy(DeliveryZone $deliveryZone): JsonResponse
    {
        $activeOrdersExist = Sale::where('delivery_zone_id', $deliveryZone->id)
            ->whereIn('status', ['pending', 'confirmed', 'out_for_delivery'])
            ->exists();

        if ($activeOrdersExist) {
            return response()->json([
                'message' => 'Cannot delete this zone — it has active orders assigned to it.',
            ], 422);
        }

        $deliveryZone->delete();

        Cache::forget('delivery_zones_public');

        return response()->json(['message' => 'Delivery zone deleted.']);
    }
}
