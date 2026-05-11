<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email'    => 'required|email',
            'password' => 'required|string',
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'email' => [
                'description' => 'Registered email address.',
                'example'     => 'amina@example.com',
            ],
            'password' => [
                'description' => 'Account password.',
                'example'     => 'secret1234',
            ],
        ];
    }
}
