<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ContactInquiryRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'first_name' => 'required|string|max:80',
            'last_name'  => 'required|string|max:80',
            'phone'      => 'required|string|max:30',
            'email'      => 'required|email:rfc|max:180',
            'message'    => 'nullable|string|max:200',
            'website'    => 'nullable|string|max:200',
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'first_name' => [
                'description' => 'Visitor first name.',
                'example'     => 'John',
            ],
            'last_name' => [
                'description' => 'Visitor last name.',
                'example'     => 'Doe',
            ],
            'phone' => [
                'description' => 'Mobile phone number.',
                'example'     => '+255767524210',
            ],
            'email' => [
                'description' => 'Reply-to email address.',
                'example'     => 'john@example.com',
            ],
            'message' => [
                'description' => 'Optional inquiry, max 200 characters.',
                'example'     => 'I would like to book a farm visit next month.',
            ],
        ];
    }
}
