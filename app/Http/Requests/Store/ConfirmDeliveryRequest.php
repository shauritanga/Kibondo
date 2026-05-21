<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmDeliveryRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'feedback'       => 'nullable|string|max:1000',
            'payment_type'   => 'nullable|in:paid_full,paid_partial,not_paid',
            'payment_amount' => 'nullable|integer|min:1',
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'feedback' => [
                'description' => 'Optional delivery feedback from the customer (max 1000 characters).',
                'example'     => 'Delivery was on time, produce was fresh.',
            ],
        ];
    }
}
