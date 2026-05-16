<?php

namespace App\Http\Controllers;

use App\Models\PackagingRun;
use App\Models\Product;
use App\Services\MaterialService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PackagingRunController extends Controller
{
    public function __construct(
        private MaterialService $materialService,
        private StockService $stockService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $runs = PackagingRun::with(['product:id,name,unit', 'material:id,name,unit', 'user:id,name'])
            ->orderByDesc('created_at')
            ->paginate(30);

        return response()->json($runs);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id'     => 'required|uuid|exists:products,id',
            'units_produced' => 'required|integer|min:1',
            'notes'          => 'nullable|string|max:500',
        ]);

        $product = Product::with('recipe.material')->findOrFail($data['product_id']);

        if (! $product->recipe) {
            return response()->json([
                'message' => 'This product has no recipe. Please set a recipe before creating a packaging run.',
            ], 422);
        }

        $recipe  = $product->recipe;
        $material = $recipe->material;
        $materialNeeded = (int) ceil($data['units_produced'] * $recipe->quantity_per_unit);

        if ($material->stock_qty < $materialNeeded) {
            return response()->json([
                'message' => "Not enough {$material->name}. Need {$materialNeeded} {$material->unit}, only {$material->stock_qty} available.",
            ], 422);
        }

        $userId = $request->user()->id;

        $run = DB::transaction(function () use ($product, $recipe, $material, $materialNeeded, $data, $userId) {
            $run = PackagingRun::create([
                'product_id'        => $product->id,
                'material_id'       => $material->id,
                'units_produced'    => $data['units_produced'],
                'material_consumed' => $materialNeeded,
                'user_id'           => $userId,
                'notes'             => $data['notes'] ?? null,
            ]);

            $this->materialService->consume(
                $material,
                $materialNeeded,
                $userId,
                $run->id,
                "Packaging run: {$data['units_produced']} × {$product->name}"
            );

            $this->stockService->stockIn(
                $product,
                $data['units_produced'],
                $userId,
                "Packaging run: {$materialNeeded} {$material->unit} of {$material->name}"
            );

            return $run;
        });

        $product->refresh();
        $material->refresh();

        return response()->json([
            'data' => [
                'packaging_run'        => $run,
                'product_stock_after'  => $product->stock_qty,
                'material_stock_after' => $material->stock_qty,
            ],
        ], 201);
    }
}
