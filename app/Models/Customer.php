<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Customer extends Authenticatable implements MustVerifyEmail
{
    use HasUuids, SoftDeletes, HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'business_name', 'type', 'phone', 'alt_phone', 'email', 'password',
        'location', 'payment_terms', 'crm_stage', 'crm_score', 'next_follow_up',
        'outstanding_balance', 'credit_limit', 'total_spend',
        'fcm_token', 'fcm_token_updated_at',
        'phone_verified_at', 'sms_marketing_opt_in',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'crm_score'            => 'integer',
        'outstanding_balance'  => 'integer',
        'credit_limit'         => 'integer',
        'total_spend'          => 'integer',
        'next_follow_up'       => 'date',
        'email_verified_at'    => 'datetime',
        'phone_verified_at'    => 'datetime',
        'sms_marketing_opt_in' => 'boolean',
        'fcm_token_updated_at' => 'datetime',
    ];

    public function routeNotificationForSms(): ?string
    {
        return \App\Support\PhoneNumber::normalize($this->phone);
    }

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

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new \App\Notifications\CustomerEmailVerificationNotification);
    }
}
