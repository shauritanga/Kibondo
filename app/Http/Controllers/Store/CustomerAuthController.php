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
use Illuminate\Http\Response;
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
            'location' => $request->location,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'type'     => 'retail',
        ]);

        event(new Registered($customer));

        Auth::guard('customer')->login($customer);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

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
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

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

    public function verifyEmail(Request $request, string $id, string $hash): Response
    {
        $customer = Customer::find($id);

        if (! $customer) {
            return $this->verificationResult(
                'Invalid verification link',
                'We could not find the account for this verification link.',
                'error',
                404
            );
        }

        $expires = (int) $request->query('expires', 0);

        if ($expires <= 0 || $expires < now()->timestamp) {
            return $this->verificationResult(
                'Verification link expired',
                'This verification link has expired. Please sign in and request a new verification email.',
                'error',
                403
            );
        }

        $expected = hash_hmac(
            'sha256',
            $customer->getKey() . '|' . $customer->getEmailForVerification() . '|' . $expires,
            config('app.key')
        );

        if (! hash_equals($expected, $hash)) {
            return $this->verificationResult(
                'Invalid verification link',
                'This verification link is invalid or has been changed.',
                'error',
                403
            );
        }

        if ($customer->hasVerifiedEmail()) {
            return $this->verificationResult(
                'Email already verified',
                'Your email address has already been verified. You can continue shopping.',
                'success'
            );
        }

        $customer->markEmailAsVerified();

        return $this->verificationResult(
            'Email verified successfully',
            'Your Kibondo account is ready. Continue to the store to browse products and place orders.',
            'success'
        );
    }

    private function verificationResult(string $title, string $message, string $tone, int $status = 200): Response
    {
        return response()->view('store.email-verification-result', [
            'title'   => $title,
            'message' => $message,
            'tone'    => $tone,
        ], $status);
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
