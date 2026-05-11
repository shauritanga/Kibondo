<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;

class PlaceOrderRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'delivery_address'         => 'required|string|max:500',
            'items'                    => 'required|array|min:1',
            'items.*.product_id'       => 'required|uuid|exists:products,id',
            'items.*.quantity'         => 'required|integer|min:1',
        ];
    }
}
