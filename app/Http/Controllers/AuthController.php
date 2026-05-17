<?php

namespace App\Http\Controllers;

use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
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
            'user' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'role'       => $user->role,
                'avatar_url' => $user->avatar_url,
            ],
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
        return response()->json([
            'id'         => $request->user()->id,
            'name'       => $request->user()->name,
            'email'      => $request->user()->email,
            'role'       => $request->user()->role,
            'avatar_url' => $request->user()->avatar_url,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'required|string|max:200',
            'email' => 'required|email|max:180|unique:users,email,' . $request->user()->id,
        ]);

        $request->user()->update($data);

        return response()->json([
            'id'         => $request->user()->id,
            'name'       => $request->user()->name,
            'email'      => $request->user()->email,
            'role'       => $request->user()->role,
            'avatar_url' => $request->user()->avatar_url,
        ]);
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
            'password'         => 'required|string|min:8|confirmed',
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
