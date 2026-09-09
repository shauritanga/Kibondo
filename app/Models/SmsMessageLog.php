<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SmsMessageLog extends Model
{
    use HasUuids;

    protected $table = 'sms_messages';

    protected $fillable = [
        'provider',
        'to',
        'body',
        'status',
        'provider_message_id',
        'error',
        'context',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
        ];
    }
}
