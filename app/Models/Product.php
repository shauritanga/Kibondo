<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasUuids, SoftDeletes, HasFactory;

    protected $fillable = [
        'category_id', 'name', 'description', 'image_url', 'unit', 'price',
        'cost_price', 'stock_qty', 'min_stock', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'price' => 'integer',
        'cost_price' => 'integer',
        'stock_qty' => 'integer',
        'min_stock' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function recipe(): HasOne
    {
        return $this->hasOne(ProductRecipe::class);
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
