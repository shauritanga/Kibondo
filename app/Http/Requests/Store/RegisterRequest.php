<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'     => 'required|string|max:200',
            'phone'    => 'required|string|max:30|unique:customers,phone',
            'email'    => 'required|email|max:180|unique:customers,email',
            'password' => 'required|string|min:8|confirmed',
        ];
    }
}
