<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfflineQueue extends Model
{
    use HasUuids;

    public $timestamps = false;
    public $incrementing = false;

    protected $table = 'offline_queue';

    protected $fillable = [
        'id', 'user_id', 'payload_type', 'payload',
        'client_created_at', 'synced_at', 'sync_error',
    ];

    protected $casts = [
        'payload' => 'array',
        'client_created_at' => 'datetime',
        'synced_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
