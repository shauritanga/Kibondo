<?php

namespace App\Services;

use App\Models\Material;
use App\Models\MaterialMovement;
use Illuminate\Support\Facades\DB;

class MaterialService
{
    public function recordMovement(
        Material $material,
        string $type,
        int $quantity,
        ?string $userId,
        ?string $referenceId = null,
        ?string $note = null
    ): MaterialMovement {
        return DB::transaction(function () use ($material, $type, $quantity, $userId, $referenceId, $note) {
            $before = $material->stock_qty;
            $after  = $before + $quantity;

            if ($after < 0) {
                throw new \InvalidArgumentException(
                    "Cannot reduce {$material->name} stock below zero. Current: {$before}, attempted change: {$quantity}."
                );
            }

            $movement = MaterialMovement::create([
                'material_id'     => $material->id,
                'user_id'         => $userId,
                'movement_type'   => $type,
                'quantity'        => $quantity,
                'quantity_before' => $before,
                'quantity_after'  => $after,
                'reference_id'    => $referenceId,
                'note'            => $note,
            ]);

            $material->update(['stock_qty' => $after]);

            return $movement;
        });
    }

    public function purchase(Material $material, int $qty, ?string $userId, ?string $note = null): MaterialMovement
    {
        return $this->recordMovement($material, 'purchase', abs($qty), $userId, null, $note);
    }

    public function consume(Material $material, int $qty, ?string $userId, ?string $referenceId = null, ?string $note = null): MaterialMovement
    {
        return $this->recordMovement($material, 'consumed', -abs($qty), $userId, $referenceId, $note);
    }

    public function adjust(Material $material, int $newQty, ?string $userId, ?string $note = null): MaterialMovement
    {
        $delta = $newQty - $material->stock_qty;
        return $this->recordMovement($material, 'adjusted', $delta, $userId, null, $note);
    }

    public function damaged(Material $material, int $qty, ?string $userId, ?string $note = null): MaterialMovement
    {
        return $this->recordMovement($material, 'damaged', -abs($qty), $userId, null, $note);
    }
}
