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
            'sort'        => 'nullable|in:name_asc,price_asc,price_desc,newest',
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'category_id' => [
                'description' => 'Filter products by category UUID.',
                'example'     => null,
            ],
            'search' => [
                'description' => 'Search products by name (partial match, max 100 chars).',
                'example'     => 'avocado',
            ],
            'page' => [
                'description' => 'Page number for paginated results.',
                'example'     => 1,
            ],
        ];
    }
}
