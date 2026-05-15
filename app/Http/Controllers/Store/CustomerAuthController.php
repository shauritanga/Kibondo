<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Http\Requests\Store\LoginRequest;
use App\Http\Requests\Store\RegisterRequest;
use App\Http\Resources\Store\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * @group Store – Customer Auth
 *
 * Register, login, and manage customer sessions for the storefront.
 */
class CustomerAuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $customer = Customer::create([
            'name'     => $request->name,
            'phone'    => $request->phone,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'type'     => 'retail',
        ]);

        $token = $customer->createToken('store')->plainTextToken;

        return response()->json([
            'token'    => $token,
            'customer' => new CustomerResource($customer),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $customer = Customer::where('email', $request->email)->first();

        if (! $customer || ! Hash::check($request->password, $customer->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $customer->createToken('store')->plainTextToken;

        return response()->json([
            'token'    => $token,
            'customer' => new CustomerResource($customer),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user('customer')->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(new CustomerResource($request->user('customer')));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $customer = $request->user('customer');
        $data = $request->validate([
            'name'     => 'sometimes|string|max:200',
            'phone'    => 'sometimes|string|max:30',
            'email'    => 'sometimes|email|max:180|unique:customers,email,' . $customer->id,
            'location' => 'nullable|string|max:200',
        ]);
        $customer->update($data);
        return response()->json(['data' => new CustomerResource($customer)]);
    }
}
