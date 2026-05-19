<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\User;
use App\Notifications\StaffLoginOtpNotification;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
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

        // Email OTP required for admins when the setting is on
        if (Setting::get('require_2fa_for_admins', '1') === '1') {
            return $this->sendOtp($user);
        }

        return $this->startSession($request, $user, 'User logged in');
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'challenge_token' => 'required|string',
            'code'            => 'required|string|size:6',
        ]);

        $cacheKey = "otp:{$request->challenge_token}";
        $payload  = Cache::get($cacheKey);

        if (! $payload) {
            return response()->json(['message' => 'Code expired. Please log in again.'], 422);
        }

        if ($payload['ip'] !== $request->ip()) {
            Cache::forget($cacheKey);
            return response()->json(['message' => 'Session mismatch. Please log in again.'], 422);
        }

        $attemptsKey = "otp_attempts:{$request->challenge_token}";
        $attempts    = (int) Cache::get($attemptsKey, 0);

        if ($attempts >= 5) {
            Cache::forget($cacheKey);
            return response()->json(['message' => 'Too many attempts. Please log in again.'], 422);
        }

        if (! hash_equals($payload['otp_hash'], hash('sha256', $request->code))) {
            Cache::put($attemptsKey, $attempts + 1, now()->addMinutes(10));
            return response()->json(['message' => 'Invalid code. Please try again.'], 422);
        }

        Cache::forget($cacheKey);
        Cache::forget($attemptsKey);

        $user = User::findOrFail($payload['user_id']);

        return $this->startSession($request, $user, 'User logged in with email OTP');
    }

    public function logout(Request $request): JsonResponse
    {
        AuditService::log([
            'action'      => 'logout',
            'module'      => 'auth',
            'description' => 'User logged out',
        ]);

        // Revoke Sanctum token if request was token-authenticated
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
        ]);

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

        // Regenerate session after password change (prevents session fixation)
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json(['message' => 'Password updated.']);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

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

    private function sendOtp(User $user): JsonResponse
    {
        $otp            = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $challengeToken = Str::uuid()->toString();

        Cache::put("otp:{$challengeToken}", [
            'user_id'  => $user->id,
            'otp_hash' => hash('sha256', $otp),
            'ip'       => request()->ip(),
        ], now()->addMinutes(10));

        $user->notify(new StaffLoginOtpNotification($otp));

        return response()->json([
            'otp_required'    => true,
            'challenge_token' => $challengeToken,
            'message'         => "A login code has been sent to {$user->email}",
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'role'       => $user->role,
            'avatar_url' => $user->avatar_url,
        ];
    }
}
