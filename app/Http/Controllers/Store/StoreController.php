<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Http\Requests\Store\ProductSearchRequest;
use App\Http\Resources\Store\StoreCategoryResource;
use App\Http\Resources\Store\StoreProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

/**
 * @group Store – Catalog
 *
 * Public endpoints for browsing products and categories. No authentication required.
 */
class StoreController extends Controller
{
    public function products(ProductSearchRequest $request): JsonResponse
    {
        $query = Product::with('category')
            ->where('is_active', true)
            ->where('stock_qty', '>', 0);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        $sort = $request->input('sort', 'name_asc');
        match ($sort) {
            'price_asc'  => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'newest'     => $query->orderByDesc('created_at'),
            default      => $query->orderBy('name'),
        };

        $paginated = $query->paginate(24);

        return response()->json([
            'data'          => StoreProductResource::collection($paginated->items()),
            'current_page'  => $paginated->currentPage(),
            'last_page'     => $paginated->lastPage(),
            'total'         => $paginated->total(),
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'data' => StoreCategoryResource::collection(Category::orderBy('name')->get()),
        ]);
    }
}
