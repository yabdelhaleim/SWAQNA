<?php

namespace App\Http\Controllers\Api\v1\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * Submit or update a review for an order.
     */
    public function store(Request $request, string $orderId): JsonResponse
    {
        $validated = $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'tags'    => 'nullable|array',
            'tags.*'  => 'required|string|max:50',
        ]);

        $user = $request->user();

        $order = Order::where('customer_id', $user->id)
            ->where('id', $orderId)
            ->firstOrFail();

        $status = strtolower($order->status instanceof \App\Enums\OrderStatus ? $order->status->value : (string) $order->status);

        // تقييم الطلب متاح للطلبات المستلمة (DELIVERED)
        if ($status !== 'delivered' && $status !== 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'يمكنك تقييم الطلب فقط بعد استلامه بنجاح',
            ], 422);
        }

        $review = Review::updateOrCreate(
            ['order_id' => $order->id],
            [
                'customer_id' => $user->id,
                'merchant_id' => $order->merchant_id,
                'rating'      => $validated['rating'],
                'comment'     => $validated['comment'] ?? null,
                'tags'        => $validated['tags'] ?? [],
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'شكراً لرأيك! تقييمك بيساعدنا نقدملك أحسن خدمة دايماً ❤️',
            'data'    => [
                'id'         => $review->id,
                'order_id'   => $review->order_id,
                'rating'     => (int) $review->rating,
                'comment'    => $review->comment,
                'tags'       => $review->tags ?? [],
                'created_at' => $review->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Get review for a specific order if exists.
     */
    public function show(Request $request, string $orderId): JsonResponse
    {
        $user = $request->user();

        $review = Review::where('customer_id', $user->id)
            ->where('order_id', $orderId)
            ->first();

        return response()->json([
            'success' => true,
            'data'    => $review ? [
                'id'         => $review->id,
                'order_id'   => $review->order_id,
                'rating'     => (int) $review->rating,
                'comment'    => $review->comment,
                'tags'       => $review->tags ?? [],
                'created_at' => $review->created_at?->toIso8601String(),
            ] : null,
        ]);
    }
}
