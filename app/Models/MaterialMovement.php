<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialMovement extends Model
{
    use HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'material_id',
        'user_id',
        'movement_type',
        'quantity',
        'quantity_before',
        'quantity_after',
        'unit_cost',
        'reference_id',
        'note',
    ];

    protected $casts = [
        'quantity'        => 'integer',
        'quantity_before' => 'integer',
        'quantity_after'  => 'integer',
        'unit_cost'       => 'integer',
    ];

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
