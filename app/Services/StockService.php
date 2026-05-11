<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

class StockService
{
    public function recordMovement(
        Product $product,
        string $type,
        int $quantity,
        ?string $userId,
        ?string $referenceId = null,
        ?string $note = null
    ): StockMovement {
        return DB::transaction(function () use ($product, $type, $quantity, $userId, $referenceId, $note) {
            $before = $product->stock_qty;
            $after = $before + $quantity;

            $movement = StockMovement::create([
                'product_id' => $product->id,
                'user_id' => $userId,
                'movement_type' => $type,
                'quantity' => $quantity,
                'quantity_before' => $before,
                'quantity_after' => $after,
                'reference_id' => $referenceId,
                'note' => $note,
                'created_at' => now(),
            ]);

            $product->update(['stock_qty' => $after]);

            return $movement;
        });
    }

    public function stockIn(Product $product, int $qty, ?string $userId, ?string $note = null): StockMovement
    {
        return $this->recordMovement($product, 'stock_in', abs($qty), $userId, null, $note);
    }

    public function stockOut(Product $product, int $qty, ?string $userId, string $saleId, ?string $note = null): StockMovement
    {
        return $this->recordMovement($product, 'sale', -abs($qty), $userId, $saleId, $note);
    }

    public function adjust(Product $product, int $newQty, ?string $userId, ?string $note = null): StockMovement
    {
        $diff = $newQty - $product->stock_qty;
        return $this->recordMovement($product, 'adjustment', $diff, $userId, null, $note);
    }

    public function damaged(Product $product, int $qty, ?string $userId, ?string $note = null): StockMovement
    {
        return $this->recordMovement($product, 'damaged', -abs($qty), $userId, null, $note);
    }

    public function returned(Product $product, int $qty, ?string $userId, ?string $note = null): StockMovement
    {
        return $this->recordMovement($product, 'returned', abs($qty), $userId, null, $note);
    }
}
