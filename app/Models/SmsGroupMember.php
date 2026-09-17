<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsGroupMember extends Model
{
    use HasUuids;

    protected $fillable = [
        'sms_group_id',
        'phone',
        'name',
        'customer_id',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(SmsGroup::class, 'sms_group_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
