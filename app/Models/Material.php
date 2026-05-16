<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Material extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'unit',
        'stock_qty',
        'min_stock',
        'cost_per_unit',
    ];

    protected $casts = [
        'stock_qty'     => 'integer',
        'min_stock'     => 'integer',
        'cost_per_unit' => 'integer',
    ];

    public function movements(): HasMany
    {
        return $this->hasMany(MaterialMovement::class);
    }

    public function recipes(): HasMany
    {
        return $this->hasMany(ProductRecipe::class);
    }

    public function packagingRuns(): HasMany
    {
        return $this->hasMany(PackagingRun::class);
    }

    public function isLowStock(): bool
    {
        return $this->stock_qty <= $this->min_stock;
    }
}
