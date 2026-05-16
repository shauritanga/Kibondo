<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'recipe.material'])->where('is_active', true);

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
            'name'        => 'required|string|max:200',
            'unit'        => 'required|string|max:20',
            'price'       => 'required|integer|min:0',
            'cost_price'  => 'sometimes|integer|min:0',
            'stock_qty'   => 'sometimes|integer|min:0',
            'min_stock'   => 'sometimes|integer|min:0',
            'image'       => 'sometimes|nullable|image|max:4096',
            'image_url'   => 'sometimes|nullable|url|max:500',
        ]);

        if ($request->hasFile('image')) {
            $data['image_url'] = Storage::url(
                $request->file('image')->store('products', 'public')
            );
        }
        unset($data['image']);

        $product = Product::create($data);

        AuditService::log([
            'action'      => 'product_created',
            'module'      => 'products',
            'description' => "Created product: {$product->name}",
            'record_id'   => $product->id,
            'table_name'  => 'products',
            'new_values'  => $product->only('name', 'unit', 'price', 'stock_qty'),
        ]);

        return response()->json(['data' => $product->load(['category', 'recipe.material'])], 201);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(['data' => $product->load(['category', 'recipe.material'])]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'category_id' => 'sometimes|uuid|exists:categories,id',
            'name'        => 'sometimes|string|max:200',
            'unit'        => 'sometimes|string|max:20',
            'price'       => 'sometimes|integer|min:0',
            'cost_price'  => 'sometimes|integer|min:0',
            'min_stock'   => 'sometimes|integer|min:0',
            'is_active'   => 'sometimes|boolean',
            'image'       => 'sometimes|nullable|image|max:4096',
            'image_url'   => 'sometimes|nullable|url|max:500',
        ]);

        if ($request->hasFile('image')) {
            if ($product->image_url && str_starts_with($product->image_url, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $product->image_url));
            }
            $data['image_url'] = Storage::url(
                $request->file('image')->store('products', 'public')
            );
        }
        unset($data['image']);

        $before = $product->only('name', 'unit', 'price', 'stock_qty', 'is_active');

        $product->update($data);

        AuditService::log([
            'action'      => 'product_updated',
            'module'      => 'products',
            'description' => "Updated product: {$product->name}",
            'record_id'   => $product->id,
            'table_name'  => 'products',
            'old_values'  => $before,
            'new_values'  => $product->only('name', 'unit', 'price', 'stock_qty', 'is_active'),
        ]);

        return response()->json(['data' => $product->load(['category', 'recipe.material'])]);
    }

    public function destroy(Product $product): JsonResponse
    {
        AuditService::log([
            'action'      => 'product_deleted',
            'module'      => 'products',
            'description' => "Deleted product: {$product->name}",
            'record_id'   => $product->id,
            'table_name'  => 'products',
            'old_values'  => $product->only('name', 'unit', 'price', 'stock_qty'),
        ]);

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
