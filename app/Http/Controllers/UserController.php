<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::orderBy('name');

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->get(['id', 'name', 'email', 'role', 'is_active', 'created_at']);

        return response()->json(['data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,sales,stock_manager,accountant,delivery',
        ]);

        $user = User::create($data);

        AuditService::log([
            'action'      => 'user_created',
            'module'      => 'users',
            'description' => "Created user {$user->email} with role {$user->role}",
            'record_id'   => $user->id,
            'table_name'  => 'users',
            'new_values'  => $user->only('name', 'email', 'role', 'is_active'),
        ]);

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
            'role' => 'sometimes|in:admin,sales,stock_manager,accountant,delivery',
            'is_active' => 'sometimes|boolean',
            'password' => 'sometimes|string|min:8',
        ]);

        $before = $user->only('name', 'email', 'role', 'is_active');

        $user->update($data);

        $after = $user->only('name', 'email', 'role', 'is_active');

        $desc = "Updated user {$user->email}";
        if (isset($data['role']) && ($before['role'] ?? null) !== $data['role']) {
            $desc = "Role changed from {$before['role']} to {$data['role']} for {$user->email}";
        } elseif (isset($data['is_active'])) {
            $desc = $data['is_active'] ? "Enabled account {$user->email}" : "Disabled account {$user->email}";
        }

        AuditService::log([
            'action'      => 'user_updated',
            'module'      => 'users',
            'description' => $desc,
            'record_id'   => $user->id,
            'table_name'  => 'users',
            'old_values'  => $before,
            'new_values'  => $after,
        ]);

        return response()->json(['data' => $user->only('id', 'name', 'email', 'role', 'is_active')]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === request()->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        AuditService::log([
            'action'      => 'user_deleted',
            'module'      => 'users',
            'description' => "Deleted user {$user->email}",
            'record_id'   => $user->id,
            'table_name'  => 'users',
            'old_values'  => $user->only('name', 'email', 'role'),
        ]);

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }
}
