<?php

namespace App\Http\Requests\Store;

use App\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;

class PlaceOrderRequest extends FormRequest
{
    public function rules(): array
    {
        $isGuest = !($this->user('customer') instanceof Customer);

        return [
            'delivery_address'         => 'required|string|max:500',
            'delivery_zone_id'         => 'nullable|uuid|exists:delivery_zones,id',
            'items'                    => [
                'required', 'array', 'min:1',
                function ($attribute, $value, $fail) {
                    $ids = array_column($value, 'product_id');
                    if (count($ids) !== count(array_unique($ids))) {
                        $fail('Duplicate products in order. Combine quantities into a single item.');
                    }
                },
            ],
            'items.*.product_id'       => 'required|uuid|exists:products,id',
            'items.*.quantity'         => 'required|integer|min:1',
            'guest_name'               => $isGuest ? 'required|string|max:100' : 'nullable|string|max:100',
            'guest_phone'              => $isGuest ? 'required|string|max:30' : 'nullable|string|max:30',
            'guest_email'              => 'nullable|email|max:255',
            'guest_company'            => 'nullable|string|max:100',
            'billing_address'          => 'nullable|string|max:1000',
            'payment_method'           => 'nullable|in:cash',
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
