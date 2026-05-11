<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    public function __construct(private StockService $stock) {}

    public function index(Request $request): JsonResponse
    {
        $query = StockMovement::with(['product:id,name', 'user:id,name'])
            ->orderByDesc('created_at');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('type')) {
            $query->where('movement_type', $request->type);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        return response()->json($query->paginate(30));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => 'required|uuid|exists:products,id',
            'movement_type' => 'required|in:stock_in,adjustment,damaged,returned',
            'quantity' => 'required|integer|min:1',
            'note' => 'nullable|string|max:500',
        ]);

        $product = Product::findOrFail($data['product_id']);
        $userId = $request->user()->id;

        $movement = match ($data['movement_type']) {
            'stock_in' => $this->stock->stockIn($product, $data['quantity'], $userId, $data['note'] ?? null),
            'adjustment' => $this->stock->adjust($product, $data['quantity'], $userId, $data['note'] ?? null),
            'damaged' => $this->stock->damaged($product, $data['quantity'], $userId, $data['note'] ?? null),
            'returned' => $this->stock->returned($product, $data['quantity'], $userId, $data['note'] ?? null),
        };

        return response()->json(['data' => $movement->load('product:id,name', 'user:id,name')], 201);
    }
}
