<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'     => 'required|string|max:200',
            'phone'    => 'required|string|max:30|unique:customers,phone',
            'email'    => 'required|email|max:180|unique:customers,email',
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'name' => [
                'description' => 'Full name of the customer.',
                'example'     => 'Amina Juma',
            ],
            'phone' => [
                'description' => 'Mobile phone number. Must be unique across all customers.',
                'example'     => '+255712345678',
            ],
            'email' => [
                'description' => 'Email address. Must be unique across all customers.',
                'example'     => 'amina@example.com',
            ],
            'password' => [
                'description' => 'Password (minimum 8 characters).',
                'example'     => 'secret1234',
            ],
            'password_confirmation' => [
                'description' => 'Must match the password field.',
                'example'     => 'secret1234',
            ],
        ];
    }
}
