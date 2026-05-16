<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductRecipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductRecipeController extends Controller
{
    public function upsert(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'material_id'       => 'required|uuid|exists:materials,id',
            'quantity_per_unit' => 'required|numeric|min:0.001',
        ]);

        $recipe = ProductRecipe::updateOrCreate(
            ['product_id' => $product->id],
            ['material_id' => $data['material_id'], 'quantity_per_unit' => $data['quantity_per_unit']]
        );

        $recipe->load('material:id,name,unit');

        return response()->json(['data' => [
            'material_id'       => $recipe->material_id,
            'material_name'     => $recipe->material->name,
            'material_unit'     => $recipe->material->unit,
            'quantity_per_unit' => $recipe->quantity_per_unit,
        ]]);
    }

    public function destroy(Product $product): JsonResponse
    {
        ProductRecipe::where('product_id', $product->id)->delete();
        return response()->json(null, 204);
    }
}
