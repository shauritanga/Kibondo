<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FALaravel\Google2FA;

class AuthController extends Controller
{
    public function __construct(private Google2FA $google2fa) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($request->only('email', 'password'))) {
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

        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();
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

        $require2fa = Setting::get('require_2fa_for_admins', '0') === '1' && $user->role === 'admin';

        if ($require2fa || $user->hasTwoFactorEnabled()) {
            $setupToken = Str::uuid()->toString();
            Cache::put("2fa_setup:{$setupToken}", $user->id, now()->addMinutes(10));

            // Admin has 2FA confirmed → challenge step
            if ($user->hasTwoFactorEnabled()) {
                return response()->json([
                    'two_factor'      => true,
                    'challenge_token' => $setupToken,
                ]);
            }

            // Admin required but not yet set up → inline setup step
            return response()->json([
                'two_factor_setup_required' => true,
                'setup_token'               => $setupToken,
            ]);
        }

        $token = $user->createToken('spa')->plainTextToken;

        AuditService::log([
            'action'      => 'login',
            'module'      => 'auth',
            'description' => "User logged in",
            'user_id'     => $user->id,
            'user_name'   => $user->name,
            'user_email'  => $user->email,
            'user_role'   => $user->role,
        ]);

        return response()->json([
            'token' => $token,
            'user'  => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        AuditService::log([
            'action'      => 'logout',
            'module'      => 'auth',
            'description' => 'User logged out',
        ]);

        $request->user()->currentAccessToken()->delete();

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

    // ─── Two-Factor Authentication ────────────────────────────────────────────

    /** Step 1 of setup: generate a new secret and return the QR URI. */
    public function twoFactorSetup(Request $request): JsonResponse
    {
        $user   = $request->user();
        $secret = $this->google2fa->generateSecretKey();

        $user->update(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => null]);

        $qrUri = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret
        );

        return response()->json(['secret' => $secret, 'qr_uri' => $qrUri]);
    }

    /** Step 2 of setup: verify first TOTP code and mark 2FA as confirmed. */
    public function twoFactorConfirm(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string|size:6']);

        $user = $request->user();

        if (!$user->two_factor_secret) {
            return response()->json(['message' => '2FA setup not started.'], 422);
        }

        $valid = $this->google2fa->verifyKey($user->two_factor_secret, $request->code);

        if (!$valid) {
            return response()->json(['message' => 'Invalid verification code.'], 422);
        }

        $user->update(['two_factor_confirmed_at' => now()]);

        return response()->json(['message' => 'Two-factor authentication enabled.', 'user' => $this->userPayload($user->fresh())]);
    }

    /** Disable 2FA — requires current password for confirmation. */
    public function twoFactorDisable(Request $request): JsonResponse
    {
        $request->validate(['password' => 'required|current_password']);

        $request->user()->update([
            'two_factor_secret'       => null,
            'two_factor_confirmed_at' => null,
        ]);

        return response()->json(['message' => 'Two-factor authentication disabled.', 'user' => $this->userPayload($request->user()->fresh())]);
    }

    /** Verify a TOTP code during the login 2FA challenge step. */
    public function twoFactorChallenge(Request $request): JsonResponse
    {
        $request->validate([
            'challenge_token' => 'required|string',
            'code'            => 'required|string|size:6',
        ]);

        $cacheKey = "2fa_setup:{$request->challenge_token}";
        $userId   = Cache::get($cacheKey);

        if (!$userId) {
            return response()->json(['message' => 'Challenge expired. Please log in again.'], 422);
        }

        $user = \App\Models\User::find($userId);

        if (!$user || !$user->two_factor_secret) {
            Cache::forget($cacheKey);
            return response()->json(['message' => 'Invalid challenge.'], 422);
        }

        $valid = $this->google2fa->verifyKey($user->two_factor_secret, $request->code);

        if (!$valid) {
            return response()->json(['message' => 'Invalid authentication code.'], 422);
        }

        Cache::forget($cacheKey);

        $token = $user->createToken('spa')->plainTextToken;

        AuditService::log([
            'action'      => 'login',
            'module'      => 'auth',
            'description' => 'User logged in with 2FA',
            'user_id'     => $user->id,
            'user_name'   => $user->name,
            'user_email'  => $user->email,
            'user_role'   => $user->role,
        ]);

        return response()->json(['token' => $token, 'user' => $this->userPayload($user)]);
    }

    /** Generate a secret for an admin who is being forced to set up 2FA during login. */
    public function twoFactorSetupInit(Request $request): JsonResponse
    {
        $request->validate(['setup_token' => 'required|string']);

        $userId = Cache::get("2fa_setup:{$request->setup_token}");
        if (!$userId) {
            return response()->json(['message' => 'Setup session expired. Please log in again.'], 422);
        }

        $user   = \App\Models\User::findOrFail($userId);
        $secret = $this->google2fa->generateSecretKey();
        $user->update(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => null]);

        $qrUri = $this->google2fa->getQRCodeUrl(config('app.name'), $user->email, $secret);

        return response()->json(['secret' => $secret, 'qr_uri' => $qrUri]);
    }

    /** Complete forced 2FA setup during login: verify code, confirm, issue real token. */
    public function twoFactorSetupComplete(Request $request): JsonResponse
    {
        $request->validate([
            'setup_token' => 'required|string',
            'code'        => 'required|string|size:6',
        ]);

        $cacheKey = "2fa_setup:{$request->setup_token}";
        $userId   = Cache::get($cacheKey);

        if (!$userId) {
            return response()->json(['message' => 'Setup session expired. Please log in again.'], 422);
        }

        $user = \App\Models\User::findOrFail($userId);

        if (!$user->two_factor_secret) {
            return response()->json(['message' => 'Setup not started.'], 422);
        }

        $valid = $this->google2fa->verifyKey($user->two_factor_secret, $request->code);

        if (!$valid) {
            return response()->json(['message' => 'Invalid verification code.'], 422);
        }

        $user->update(['two_factor_confirmed_at' => now()]);
        Cache::forget($cacheKey);

        $token = $user->createToken('spa')->plainTextToken;

        AuditService::log([
            'action'      => 'login',
            'module'      => 'auth',
            'description' => 'Admin logged in after completing forced 2FA setup',
            'user_id'     => $user->id,
            'user_name'   => $user->name,
            'user_email'  => $user->email,
            'user_role'   => $user->role,
        ]);

        return response()->json(['token' => $token, 'user' => $this->userPayload($user)]);
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

    private function userPayload(\App\Models\User $user): array
    {
        return [
            'id'                  => $user->id,
            'name'                => $user->name,
            'email'               => $user->email,
            'role'                => $user->role,
            'avatar_url'          => $user->avatar_url,
            'two_factor_enabled'  => $user->hasTwoFactorEnabled(),
        ];
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|current_password',
            'password'         => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::min(8)->letters()->numbers()],
        ]);

        $user = $request->user();
        $user->update(['password' => $request->password]);

        // Revoke all tokens so other devices are logged out
        $user->tokens()->delete();

        // Issue a fresh token for the current session
        $newToken = $user->createToken('spa')->plainTextToken;

        return response()->json(['message' => 'Password updated.', 'token' => $newToken]);
    }
}
