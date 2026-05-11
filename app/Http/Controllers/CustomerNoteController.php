<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerNoteController extends Controller
{
    public function index(Customer $customer): JsonResponse
    {
        $notes = $customer->notes()->with('user:id,name')->orderByDesc('created_at')->get();

        return response()->json(['data' => $notes]);
    }

    public function store(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate(['body' => 'required|string']);

        $note = $customer->notes()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return response()->json(['data' => $note->load('user:id,name')], 201);
    }

    public function update(Request $request, CustomerNote $note): JsonResponse
    {
        $data = $request->validate(['body' => 'required|string']);

        $note->update($data);

        return response()->json(['data' => $note]);
    }

    public function destroy(CustomerNote $note): JsonResponse
    {
        $note->delete();

        return response()->json(['message' => 'Note deleted.']);
    }
}
