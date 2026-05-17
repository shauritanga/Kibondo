<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'avatar_url',
        'password',
        'role',
        'is_active',
        'fcm_token',
        'fcm_token_updated_at',
        'two_factor_secret',
        'two_factor_confirmed_at',
    ];

    protected $hidden = [
        'password',
        'two_factor_secret',
    ];

    protected function casts(): array
    {
        return [
            'password'                => 'hashed',
            'is_active'               => 'boolean',
            'fcm_token_updated_at'    => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles);
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }
}
