<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $customer = $request->user('customer');

        $notifications = $customer->notifications()->paginate(20);

        return response()->json([
            'data'         => $notifications->items(),
            'unread_count' => $customer->unreadNotifications()->count(),
            'meta'         => [
                'current_page' => $notifications->currentPage(),
                'last_page'    => $notifications->lastPage(),
                'total'        => $notifications->total(),
            ],
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $customer = $request->user('customer');

        $notification = $customer->notifications()->find($id);
        abort_unless($notification !== null, 404);

        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user('customer')->unreadNotifications->markAsRead();

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function clearRead(Request $request): JsonResponse
    {
        $request->user('customer')->readNotifications()->delete();

        return response()->json(['message' => 'Read notifications cleared.']);
    }
}
