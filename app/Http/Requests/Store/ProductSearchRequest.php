<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;

class ProductSearchRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'category_id' => 'nullable|uuid',
            'search'      => 'nullable|string|max:100',
            'page'        => 'nullable|integer|min:1',
        ];
    }
}
