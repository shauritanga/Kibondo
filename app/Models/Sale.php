<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'sale_number', 'customer_id', 'user_id',
        'subtotal', 'discount_amount', 'total_amount',
        'paid_amount', 'outstanding', 'status', 'payment_status',
        'note', 'is_offline_sync', 'synced_at',
        'delivery_confirmed_at', 'customer_feedback',
    ];

    protected $casts = [
        'subtotal' => 'integer',
        'discount_amount' => 'integer',
        'total_amount' => 'integer',
        'paid_amount' => 'integer',
        'outstanding' => 'integer',
        'is_offline_sync' => 'boolean',
        'synced_at' => 'datetime',
        'delivery_confirmed_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
