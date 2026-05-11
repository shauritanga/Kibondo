<?php

namespace App\Http\Controllers;

use App\Services\SaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfflineQueueController extends Controller
{
    public function __construct(private SaleService $sales) {}

    public function sync(Request $request): JsonResponse
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|string',
            'items.*.payload_type' => 'required|in:sale,payment,stock_adjustment',
            'items.*.payload' => 'required|array',
            'items.*.client_created_at' => 'required|date',
        ]);

        $results = [];

        foreach ($request->items as $item) {
            try {
                if ($item['payload_type'] === 'sale') {
                    $payload = array_merge($item['payload'], ['is_offline_sync' => true]);
                    $sale = $this->sales->createSale($payload, $request->user()->id);
                    $results[] = ['id' => $item['id'], 'status' => 'synced', 'server_id' => $sale->id];
                } else {
                    $results[] = ['id' => $item['id'], 'status' => 'skipped', 'message' => 'Payload type not yet supported.'];
                }
            } catch (\Throwable $e) {
                $results[] = ['id' => $item['id'], 'status' => 'error', 'message' => $e->getMessage()];
            }
        }

        return response()->json(['results' => $results]);
    }
}
