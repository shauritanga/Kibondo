<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\User;
use App\Notifications\SmsOtpNotification;
use App\Notifications\StaffLoginOtpNotification;
use App\Services\AuditService;
use App\Services\OtpService;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function __construct(private OtpService $otp) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
            'otp_channel' => 'sometimes|in:email,sms',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            AuditService::log([
                'action'      => 'login_failed',
                'module'      => 'auth',
                'description' => "Failed login attempt for {$request->email}",
                'user_email'  => $request->email,
                'status'      => 'failed',
            ]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->is_active) {
            AuditService::log([
                'action'      => 'login_failed',
                'module'      => 'auth',
                'description' => "Login blocked — account deactivated: {$user->email}",
                'user_id'     => $user->id,
                'user_name'   => $user->name,
                'user_email'  => $user->email,
                'user_role'   => $user->role,
                'status'      => 'failed',
            ]);
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated.'],
            ]);
        }

        if (Setting::get('require_2fa_for_admins', '1') === '1') {
            $defaultChannel = filled($user->phone) ? 'sms' : 'email';

            return $this->sendOtp($user, $request->input('otp_channel', $defaultChannel));
        }

        return $this->startSession($request, $user, 'User logged in');
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'challenge_token' => 'required|string',
            'code'            => 'required|string|size:6',
        ]);

        $result = $this->otp->verify('staff_login', $request->challenge_token, $request->code, $request->ip());

        if (! $result['ok']) {
            return response()->json(['message' => $result['message']], 422);
        }

        $user = User::findOrFail($result['payload']['user_id']);

        return $this->startSession($request, $user, 'User logged in with OTP');
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string|max:30',
        ]);

        $phone = PhoneNumber::normalize($request->phone);
        if (! $phone) {
            return response()->json(['message' => 'If an account exists for that phone, a reset code was sent.']);
        }

        $user = User::whereNotNull('phone')->get(['id', 'phone', 'name'])
            ->first(fn (User $u) => PhoneNumber::normalize($u->phone) === $phone);

        // Always return success to avoid account enumeration
        if (! $user) {
            return response()->json(['message' => 'If an account exists for that phone, a reset code was sent.']);
        }

        $issued = $this->otp->issueForKey('staff_password_reset', $phone, [
            'user_id' => $user->id,
        ]);

        $user->notify(new SmsOtpNotification($issued['code'], 'password reset'));

        return response()->json(['message' => 'If an account exists for that phone, a reset code was sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'phone'                 => 'required|string|max:30',
            'code'                  => 'required|string|size:6',
            'password'              => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::min(8)->letters()->numbers()],
        ]);

        $phone = PhoneNumber::normalize($request->phone);
        if (! $phone) {
            return response()->json(['message' => 'Invalid phone number.'], 422);
        }
        $result = $this->otp->verifyForKey('staff_password_reset', $phone, $request->code);

        if (! $result['ok']) {
            return response()->json(['message' => $result['message']], 422);
        }

        $user = User::findOrFail($result['payload']['user_id']);
        $user->update(['password' => $request->password]);

        return response()->json(['message' => 'Password updated. You can log in now.']);
    }

    public function logout(Request $request): JsonResponse
    {
        AuditService::log([
            'action'      => 'logout',
            'module'      => 'auth',
            'description' => 'User logged out',
        ]);

        $token = $request->user()->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userPayload($request->user()));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'required|string|max:200',
            'email' => 'required|email|max:180|unique:users,email,' . $request->user()->id,
            'phone' => [
                'required',
                'string',
                'max:40',
                Rule::unique('users', 'phone')->ignore($request->user()->id)->whereNull('deleted_at'),
            ],
        ]);

        if (! empty($data['phone'])) {
            $normalized = PhoneNumber::normalize($data['phone']);
            if (! $normalized) {
                throw ValidationException::withMessages(['phone' => ['Invalid phone number.']]);
            }
            $data['phone'] = $normalized;
        }

        $request->user()->update($data);

        return response()->json($this->userPayload($request->user()));
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate(['avatar' => 'required|file|mimes:jpg,jpeg,png,webp,gif|max:2048']);

        $user = $request->user();

        if ($user->avatar_url && str_starts_with($user->avatar_url, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar_url));
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar_url' => Storage::url($path)]);

        return response()->json(['avatar_url' => $user->avatar_url]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|current_password',
            'password'         => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::min(8)->letters()->numbers()],
        ]);

        $request->user()->update(['password' => $request->password]);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json(['message' => 'Password updated.']);
    }

    private function startSession(Request $request, User $user, string $description): JsonResponse
    {
        Auth::login($user);
        $request->session()->regenerate();

        AuditService::log([
            'action'      => 'login',
            'module'      => 'auth',
            'description' => $description,
            'user_id'     => $user->id,
            'user_name'   => $user->name,
            'user_email'  => $user->email,
            'user_role'   => $user->role,
        ]);

        return response()->json(['user' => $this->userPayload($user)]);
    }

    private function sendOtp(User $user, string $channel): JsonResponse
    {
        if ($channel === 'sms' && blank($user->phone)) {
            throw ValidationException::withMessages([
                'otp_channel' => ['Your account does not have a phone number for SMS login codes.'],
            ]);
        }

        $issued = $this->otp->issue('staff_login', [
            'user_id' => $user->id,
            'ip'      => request()->ip(),
        ]);

        $user->notify(new StaffLoginOtpNotification($issued['code'], $channel));

        return response()->json([
            'otp_required'    => true,
            'challenge_token' => $issued['challenge_token'],
            'message'         => $channel === 'sms'
                ? 'A login code has been sent to your phone.'
                : "A login code has been sent to {$user->email}",
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'phone'      => $user->phone,
            'role'       => $user->role,
            'avatar_url' => $user->avatar_url,
        ];
    }
}
