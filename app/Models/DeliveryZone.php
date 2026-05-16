<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DeliveryZone extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'delivery_cost', 'is_active'];

    protected $casts = [
        'delivery_cost' => 'integer',
        'is_active'     => 'boolean',
    ];
}
