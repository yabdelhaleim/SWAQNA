<?php

namespace App\Http\Controllers\Api\v1\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get user notifications with unread count.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = $user->notifications()
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        $unreadCount = $user->unreadNotifications()->count();

        $items = collect($notifications->items())->map(function ($n) {
            $data = is_array($n->data) ? $n->data : json_decode($n->data, true);
            return [
                'id'         => $n->id,
                'title'      => $data['title'] ?? 'إشعار جديد 🔔',
                'body'       => $data['body'] ?? '',
                'icon'       => $data['icon'] ?? '🔔',
                'type'       => $data['type'] ?? 'ORDER_STATUS',
                'order_id'   => $data['order_id'] ?? null,
                'is_read'    => $n->read_at !== null,
                'created_at' => $n->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success'      => true,
            'unread_count' => $unreadCount,
            'data'         => $items,
            'current_page' => $notifications->currentPage(),
            'last_page'    => $notifications->lastPage(),
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $notification = $user->notifications()->where('id', $id)->firstOrFail();
        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'تم تعليم الإشعار كمقروء',
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->unreadNotifications->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'تم تعليم جميع الإشعارات كمقروءة ✅',
        ]);
    }
}
