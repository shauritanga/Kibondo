<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerFcmTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate(['fcm_token' => 'required|string|max:4096']);

        $request->user('customer')->update([
            'fcm_token'            => $request->fcm_token,
            'fcm_token_updated_at' => now(),
        ]);

        return response()->json(['message' => 'FCM token saved.']);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->user('customer')->update([
            'fcm_token'            => null,
            'fcm_token_updated_at' => null,
        ]);

        return response()->json(['message' => 'FCM token cleared.']);
    }
}
