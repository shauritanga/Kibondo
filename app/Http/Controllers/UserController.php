<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::orderBy('name')->get(['id', 'name', 'email', 'role', 'is_active', 'created_at']);

        return response()->json(['data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,sales,stock_manager,accountant',
        ]);

        $user = User::create($data);

        return response()->json(['data' => $user->only('id', 'name', 'email', 'role', 'is_active')], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => $user->only('id', 'name', 'email', 'role', 'is_active', 'created_at')]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:admin,sales,stock_manager,accountant',
            'is_active' => 'sometimes|boolean',
            'password' => 'sometimes|string|min:8',
        ]);

        $user->update($data);

        return response()->json(['data' => $user->only('id', 'name', 'email', 'role', 'is_active')]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === request()->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }
}
