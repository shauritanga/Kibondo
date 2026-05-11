<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('category')->where('is_active', true);

        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        if ($request->filled('category')) {
            $query->where('category_id', $request->category);
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('stock_qty', '<=', 'min_stock');
        }

        $products = $query->orderBy('name')->get();

        return response()->json(['data' => $products]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_id' => 'required|uuid|exists:categories,id',
            'name' => 'required|string|max:200',
            'unit' => 'required|in:crate,kg,box,litre,piece',
            'price' => 'required|integer|min:0',
            'cost_price' => 'sometimes|integer|min:0',
            'stock_qty' => 'sometimes|integer|min:0',
            'min_stock' => 'sometimes|integer|min:0',
        ]);

        $product = Product::create($data);

        return response()->json(['data' => $product->load('category')], 201);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(['data' => $product->load('category')]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'category_id' => 'sometimes|uuid|exists:categories,id',
            'name' => 'sometimes|string|max:200',
            'unit' => 'sometimes|in:crate,kg,box,litre,piece',
            'price' => 'sometimes|integer|min:0',
            'cost_price' => 'sometimes|integer|min:0',
            'min_stock' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $product->update($data);

        return response()->json(['data' => $product->load('category')]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->update(['is_active' => false]);
        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }

    public function movements(Request $request, Product $product): JsonResponse
    {
        $movements = $product->stockMovements()
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($movements);
    }
}
