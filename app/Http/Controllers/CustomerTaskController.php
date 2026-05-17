<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerTaskController extends Controller
{
    public function index(Customer $customer): JsonResponse
    {
        $tasks = $customer->tasks()->with('user:id,name')->orderBy('due_date')->get();

        return response()->json(['data' => $tasks]);
    }

    public function store(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:300',
            'due_date' => 'nullable|date',
        ]);

        $task = $customer->tasks()->create(array_merge($data, [
            'user_id' => $request->user()->id,
        ]));

        return response()->json(['data' => $task], 201);
    }

    public function update(Request $request, CustomerTask $task): JsonResponse
    {
        $user = $request->user();
        abort_unless($task->user_id === $user->id || $user->role === 'admin', 403);

        $data = $request->validate([
            'title'    => 'sometimes|string|max:300',
            'is_done'  => 'sometimes|boolean',
            'due_date' => 'nullable|date',
        ]);

        $task->update($data);

        return response()->json(['data' => $task]);
    }

    public function destroy(Request $request, CustomerTask $task): JsonResponse
    {
        $user = $request->user();
        abort_unless($task->user_id === $user->id || $user->role === 'admin', 403);

        $task->delete();

        return response()->json(['message' => 'Task deleted.']);
    }
}
