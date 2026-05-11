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

    public function bodyParameters(): array
    {
        return [
            'delivery_address' => [
                'description' => 'Full delivery address including street, area, and city.',
                'example'     => '45 Msimbazi Street, Kariakoo, Dar es Salaam',
            ],
            'items' => [
                'description' => 'List of products to order. At least one item is required.',
            ],
            'items[].product_id' => [
                'description' => 'UUID of the product to order.',
                'example'     => '9d2f1c3a-84b2-4e1f-a3c0-1234567890ab',
            ],
            'items[].quantity' => [
                'description' => 'Number of units to order. Must not exceed available stock.',
                'example'     => 2,
            ],
        ];
    }
}
