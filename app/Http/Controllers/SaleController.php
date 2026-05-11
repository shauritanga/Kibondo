<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Services\SaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function __construct(private SaleService $sales) {}

    public function index(Request $request): JsonResponse
    {
        $query = Sale::with(['customer:id,name', 'user:id,name'])
            ->withCount('items');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        if ($request->filled('search')) {
            $query->where('sale_number', 'ilike', '%' . $request->search . '%');
        }

        return response()->json($query->orderByDesc('created_at')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'customer_id' => 'nullable|uuid|exists:customers,id',
            'discount_amount' => 'sometimes|integer|min:0',
            'note' => 'nullable|string|max:500',
            'is_offline_sync' => 'sometimes|boolean',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|integer|min:0',
        ]);

        $sale = $this->sales->createSale($request->all(), $request->user()->id);

        return response()->json(['data' => $sale], 201);
    }

    public function show(Sale $sale): JsonResponse
    {
        $sale->load(['customer', 'user:id,name', 'items.product', 'payments']);

        return response()->json(['data' => $sale]);
    }

    public function updateStatus(Request $request, Sale $sale): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:completed,cancelled',
        ]);

        if ($sale->status === 'cancelled') {
            return response()->json(['message' => 'Cannot update a cancelled sale.'], 422);
        }

        if ($request->status === 'cancelled' && $sale->paid_amount > 0) {
            return response()->json(['message' => 'Cannot cancel a sale with recorded payments. Void the payments first.'], 422);
        }

        if ($sale->status === $request->status) {
            return response()->json(['message' => "Sale is already {$request->status}."], 422);
        }

        $sale->update(['status' => $request->status]);

        return response()->json(['data' => $sale]);
    }

    public function destroy(Sale $sale): JsonResponse
    {
        if ($sale->paid_amount > 0) {
            return response()->json(['message' => 'Cannot delete a sale with recorded payments.'], 422);
        }

        $sale->delete();

        return response()->json(['message' => 'Sale deleted.']);
    }
}
