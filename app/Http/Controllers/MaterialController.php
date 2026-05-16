<?php

namespace App\Http\Controllers;

use App\Models\Material;
use App\Services\MaterialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialController extends Controller
{
    public function __construct(private MaterialService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = Material::query()->orderBy('name');

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $materials = $query->get()->map(fn($m) => [
            'id'            => $m->id,
            'name'          => $m->name,
            'unit'          => $m->unit,
            'stock_qty'     => $m->stock_qty,
            'min_stock'     => $m->min_stock,
            'cost_per_unit' => $m->cost_per_unit,
            'is_low_stock'  => $m->isLowStock(),
        ]);

        return response()->json(['data' => $materials]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:100|unique:materials,name',
            'unit'          => 'required|string|max:30',
            'stock_qty'     => 'required|integer|min:0',
            'min_stock'     => 'required|integer|min:0',
            'cost_per_unit' => 'required|integer|min:0',
        ]);

        $material = Material::create($data);

        return response()->json(['data' => $material], 201);
    }

    public function update(Request $request, Material $material): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:100|unique:materials,name,' . $material->id,
            'unit'          => 'required|string|max:30',
            'min_stock'     => 'required|integer|min:0',
            'cost_per_unit' => 'required|integer|min:0',
        ]);

        $material->update($data);

        return response()->json(['data' => $material]);
    }

    public function destroy(Material $material): JsonResponse
    {
        if ($material->packagingRuns()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a material that has packaging runs recorded against it.',
            ], 422);
        }

        $material->delete();

        return response()->json(null, 204);
    }

    public function movements(Request $request, Material $material): JsonResponse
    {
        $movements = $material->movements()
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($movements);
    }

    public function recordMovement(Request $request, Material $material): JsonResponse
    {
        $data = $request->validate([
            'movement_type' => 'required|in:purchase,adjusted,damaged',
            'quantity'      => 'required|integer|min:1',
            'note'          => 'nullable|string|max:500',
        ]);

        $userId = $request->user()->id;

        $movement = match ($data['movement_type']) {
            'purchase' => $this->service->purchase($material, $data['quantity'], $userId, $data['note'] ?? null),
            'adjusted' => $this->service->adjust($material, $data['quantity'], $userId, $data['note'] ?? null),
            'damaged'  => $this->service->damaged($material, $data['quantity'], $userId, $data['note'] ?? null),
        };

        $material->refresh();

        return response()->json([
            'movement'          => $movement,
            'stock_qty_after'   => $material->stock_qty,
        ]);
    }
}
