<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmDeliveryRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'feedback' => 'nullable|string|max:1000',
        ];
    }
}
