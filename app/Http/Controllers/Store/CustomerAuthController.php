<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Http\Requests\Store\LoginRequest;
use App\Http\Requests\Store\RegisterRequest;
use App\Http\Resources\Store\CustomerResource;
use App\Models\Customer;
use App\Notifications\SmsOtpNotification;
use App\Services\OtpService;
use App\Support\PhoneNumber;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * @group Store – Customer Auth
 *
 * Register, login, and manage customer sessions for the storefront.
 */
class CustomerAuthController extends Controller
{
    public function __construct(private OtpService $otp) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $phone = PhoneNumber::normalize($request->phone) ?? $request->phone;

        $customer = Customer::create([
            'name'                 => $request->name,
            'phone'                => $phone,
            'email'                => $request->email,
            'password'             => Hash::make($request->password),
            'type'                 => 'retail',
            'sms_marketing_opt_in' => (bool) $request->boolean('sms_marketing_opt_in'),
        ]);

        event(new Registered($customer));

        Auth::guard('customer')->login($customer);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $this->sendPhoneVerificationOtp($customer);

        return response()->json([
            'customer' => new CustomerResource($customer),
            'message'  => 'Registration successful. Please verify your phone and check your email.',
            'phone_verification_required' => true,
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

    public function verifyPhone(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string|size:6']);

        $customer = $request->user('customer');
        $phone = PhoneNumber::normalize($customer->phone);

        if (! $phone) {
            return response()->json(['message' => 'No valid phone on account.'], 422);
        }

        if ($customer->phone_verified_at) {
            return response()->json(['message' => 'Phone already verified.']);
        }

        $result = $this->otp->verifyForKey('customer_phone_verify', $phone, $request->code);

        if (! $result['ok']) {
            return response()->json(['message' => $result['message']], 422);
        }

        $customer->update(['phone_verified_at' => now()]);

        return response()->json([
            'message'  => 'Phone verified successfully.',
            'customer' => new CustomerResource($customer->fresh()),
        ]);
    }

    public function resendPhoneVerification(Request $request): JsonResponse
    {
        $customer = $request->user('customer');

        if ($customer->phone_verified_at) {
            return response()->json(['message' => 'Phone already verified.'], 422);
        }

        $this->sendPhoneVerificationOtp($customer);

        return response()->json(['message' => 'Verification code sent to your phone.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['phone' => 'required|string|max:30']);

        $phone = PhoneNumber::normalize($request->phone);
        if (! $phone) {
            return response()->json(['message' => 'If an account exists for that phone, a reset code was sent.']);
        }

        $customer = Customer::query()
            ->get(['id', 'phone', 'name'])
            ->first(fn (Customer $c) => PhoneNumber::normalize($c->phone) === $phone);

        if ($customer) {
            $issued = $this->otp->issueForKey('customer_password_reset', $phone, [
                'customer_id' => $customer->id,
            ]);
            $customer->notify(new SmsOtpNotification($issued['code'], 'password reset'));
        }

        return response()->json(['message' => 'If an account exists for that phone, a reset code was sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'phone'    => 'required|string|max:30',
            'code'     => 'required|string|size:6',
            'password' => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::min(8)->letters()->numbers()],
        ]);

        $phone = PhoneNumber::normalize($request->phone);
        if (! $phone) {
            return response()->json(['message' => 'Invalid phone number.'], 422);
        }
        $result = $this->otp->verifyForKey('customer_password_reset', $phone, $request->code);

        if (! $result['ok']) {
            return response()->json(['message' => $result['message']], 422);
        }

        $customer = Customer::findOrFail($result['payload']['customer_id']);
        $customer->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Password updated. You can log in now.']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $customer = $request->user('customer');
        $data = $request->validate([
            'name'                 => 'sometimes|string|max:200',
            'phone'                => ['sometimes', 'string', 'max:30', \Illuminate\Validation\Rule::unique('customers', 'phone')->ignore($customer->id)->whereNull('deleted_at')],
            'email'                => ['sometimes', 'email', 'max:180', \Illuminate\Validation\Rule::unique('customers', 'email')->ignore($customer->id)->whereNull('deleted_at')],
            'location'             => 'nullable|string|max:200',
            'sms_marketing_opt_in' => 'sometimes|boolean',
        ]);

        // Phone change requires OTP confirmation to the new number
        if (isset($data['phone'])) {
            $newPhone = PhoneNumber::normalize($data['phone']);
            if (! $newPhone) {
                throw ValidationException::withMessages(['phone' => ['Invalid phone number.']]);
            }

            $current = PhoneNumber::normalize($customer->phone);
            if ($newPhone !== $current) {
                if (! $request->filled('phone_code')) {
                    $issued = $this->otp->issueForKey('customer_change_phone', $newPhone, [
                        'customer_id' => $customer->id,
                        'new_phone'   => $newPhone,
                    ]);
                    Notification::route('sms', $newPhone)
                        ->notify(new SmsOtpNotification($issued['code'], 'phone change'));

                    return response()->json([
                        'phone_change_pending' => true,
                        'message'              => 'A verification code was sent to the new phone number.',
                    ]);
                }

                $result = $this->otp->verifyForKey('customer_change_phone', $newPhone, $request->string('phone_code')->toString());
                if (! $result['ok']) {
                    return response()->json(['message' => $result['message']], 422);
                }

                $data['phone'] = $newPhone;
                $data['phone_verified_at'] = now();
            } else {
                unset($data['phone']);
            }
        }

        $customer->update($data);

        return response()->json(['data' => new CustomerResource($customer->fresh())]);
    }

    private function sendPhoneVerificationOtp(Customer $customer): void
    {
        $phone = PhoneNumber::normalize($customer->phone);
        if (! $phone) {
            return;
        }

        $issued = $this->otp->issueForKey('customer_phone_verify', $phone, [
            'customer_id' => $customer->id,
        ]);

        $customer->notify(new SmsOtpNotification($issued['code'], 'phone verification'));
    }
}
