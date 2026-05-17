<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Http\Requests\Store\LoginRequest;
use App\Http\Requests\Store\RegisterRequest;
use App\Http\Resources\Store\CustomerResource;
use App\Models\Customer;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        event(new Registered($customer));

        Auth::guard('customer')->login($customer);
        $request->session()->regenerate();

        return response()->json([
            'customer' => new CustomerResource($customer),
            'message'  => 'Registration successful. Please check your email to verify your account.',
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

        Auth::guard('customer')->login($customer);
        $request->session()->regenerate();

        return response()->json([
            'customer' => new CustomerResource($customer),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('customer')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(new CustomerResource(Auth::guard('customer')->user()));
    }

    public function verifyEmail(Request $request, string $id, string $hash): JsonResponse
    {
        $customer = Customer::findOrFail($id);

        $expires = (int) $request->query('expires', 0);

        abort_unless($expires > 0 && $expires >= now()->timestamp, 403, 'Verification link has expired.');

        $expected = hash_hmac(
            'sha256',
            $customer->getKey() . '|' . $customer->getEmailForVerification() . '|' . $expires,
            config('app.key')
        );

        abort_unless(hash_equals($expected, $hash), 403, 'Invalid verification link.');
        abort_if($customer->hasVerifiedEmail(), 422, 'Email already verified.');

        $customer->markEmailAsVerified();

        return response()->json(['message' => 'Email verified successfully.']);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $customer = $request->user('customer');

        if ($customer->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.'], 422);
        }

        $customer->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification email sent.']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $customer = $request->user('customer');
        $data = $request->validate([
            'name'     => 'sometimes|string|max:200',
            'phone'    => ['sometimes', 'string', 'max:30', \Illuminate\Validation\Rule::unique('customers', 'phone')->ignore($customer->id)->whereNull('deleted_at')],
            'email'    => ['sometimes', 'email', 'max:180', \Illuminate\Validation\Rule::unique('customers', 'email')->ignore($customer->id)->whereNull('deleted_at')],
            'location' => 'nullable|string|max:200',
        ]);
        $customer->update($data);
        return response()->json(['data' => new CustomerResource($customer)]);
    }
}
