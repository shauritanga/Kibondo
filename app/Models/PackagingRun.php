<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackagingRun extends Model
{
    use HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'product_id',
        'material_id',
        'units_produced',
        'material_consumed',
        'user_id',
        'notes',
    ];

    protected $casts = [
        'units_produced'   => 'integer',
        'material_consumed' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
