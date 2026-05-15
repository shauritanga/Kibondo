<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Customer extends Authenticatable
{
    use HasUuids, SoftDeletes, HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'business_name', 'type', 'phone', 'alt_phone', 'email', 'password',
        'location', 'payment_terms', 'crm_stage', 'crm_score', 'next_follow_up',
        'outstanding_balance', 'credit_limit', 'total_spend',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'crm_score'           => 'integer',
        'outstanding_balance' => 'integer',
        'credit_limit'        => 'integer',
        'total_spend'         => 'integer',
        'next_follow_up'      => 'date',
    ];

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(CustomerNote::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(CustomerTask::class);
    }
}
