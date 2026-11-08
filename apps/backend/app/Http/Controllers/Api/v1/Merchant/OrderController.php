<?php

namespace App\Http\Controllers\Api\v1\Merchant;

use App\Enums\ActorType;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Merchant\AcceptOrderRequest;
use App\Http\Requests\Merchant\RejectOrderRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderItemModifier;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * List orders for the authenticated merchant.
     * Supports optional ?status=PENDING,PREPARING filter.
     * Always uses Eager Loading — no N+1 queries.
     */
    public function index(Request $request): JsonResponse
    {
        $merchant = $request->user()->merchant;

        $query = Order::with([
            'items.product',
            'items.variant',
            'items.modifiers',
            'statusHistory',
        ])->where('merchant_id', $merchant->id)
          ->orderBy('created_at', 'desc');

        // Filter by status (comma-separated)
        if ($request->filled('status')) {
            $statuses = explode(',', $request->status);
            $query->whereIn('status', $statuses);
        }

        $orders = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $orders,
        ]);
    }

    /**
     * Show a single order with full eager-loaded relationships.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $merchant = $request->user()->merchant;

        $order = Order::with([
            'items.product',
            'items.variant',
            'items.modifiers',
            'statusHistory',
        ])->where('merchant_id', $merchant->id)
          ->findOrFail($id);

        return response()->json([
            'success' => true,
            'order'   => $order,
        ]);
    }

    /**
     * Accept a PENDING order → move to PREPARING.
     */
    public function accept(AcceptOrderRequest $request, string $id): JsonResponse
    {
        $merchant = $request->user()->merchant;

        $order = Order::with(['items.product', 'items.variant', 'items.modifiers'])
            ->where('merchant_id', $merchant->id)
            ->findOrFail($id);

        if ($order->status !== OrderStatus::PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'الطلب ليس في حالة انتظار، لا يمكن قبوله',
            ], 422);
        }

        $order->update([
            'status'            => OrderStatus::PREPARING,
            'accepted_at'       => now(),
            'prep_time_minutes' => $request->prep_time_minutes ?? $order->prep_time_minutes,
        ]);

        $order->statusHistory()->create([
            'previous_status' => OrderStatus::PENDING,
            'new_status'      => OrderStatus::PREPARING,
            'actor_id'        => $request->user()->id,
            'actor_type'      => ActorType::MERCHANT,
            'reason'          => 'تم قبول الطلب من قِبل التاجر',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم قبول الطلب بنجاح',
            'order'   => $order->fresh(['items.product', 'items.variant', 'items.modifiers']),
        ]);
    }

    /**
     * Reject a PENDING order with a reason.
     */
    public function reject(RejectOrderRequest $request, string $id): JsonResponse
    {
        $merchant = $request->user()->merchant;

        $order = Order::with(['items.product', 'items.variant', 'items.modifiers'])
            ->where('merchant_id', $merchant->id)
            ->findOrFail($id);

        if ($order->status !== OrderStatus::PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'الطلب ليس في حالة انتظار، لا يمكن رفضه',
            ], 422);
        }

        $order->update([
            'status'           => OrderStatus::REJECTED,
            'rejection_reason' => $request->rejection_reason,
            'cancelled_at'     => now(),
        ]);

        $order->statusHistory()->create([
            'previous_status' => OrderStatus::PENDING,
            'new_status'      => OrderStatus::REJECTED,
            'actor_id'        => $request->user()->id,
            'actor_type'      => ActorType::MERCHANT,
            'reason'          => 'تم رفض الطلب: ' . $request->rejection_reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم رفض الطلب',
            'order'   => $order->fresh(['items.product', 'items.variant', 'items.modifiers']),
        ]);
    }

    /**
     * Mark a PREPARING order as READY.
     */
    public function markReady(Request $request, string $id): JsonResponse
    {
        $merchant = $request->user()->merchant;

        $order = Order::with(['items.product', 'items.variant', 'items.modifiers'])
            ->where('merchant_id', $merchant->id)
            ->findOrFail($id);

        if ($order->status !== OrderStatus::PREPARING) {
            return response()->json([
                'success' => false,
                'message' => 'الطلب ليس في مرحلة التحضير',
            ], 422);
        }

        $order->update([
            'status'   => OrderStatus::READY,
            'ready_at' => now(),
        ]);

        $order->statusHistory()->create([
            'previous_status' => OrderStatus::PREPARING,
            'new_status'      => OrderStatus::READY,
            'actor_id'        => $request->user()->id,
            'actor_type'      => ActorType::MERCHANT,
            'reason'          => 'الطلب جاهز للتسليم',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'الطلب جاهز للتسليم',
            'order'   => $order->fresh(['items.product', 'items.variant', 'items.modifiers']),
        ]);
    }

    /**
     * Get order stats for the merchant dashboard header.
     */
    public function stats(Request $request): JsonResponse
    {
        $merchant = $request->user()->merchant;

        $pending   = Order::where('merchant_id', $merchant->id)->where('status', OrderStatus::PENDING)->count();
        $preparing = Order::where('merchant_id', $merchant->id)->where('status', OrderStatus::PREPARING)->count();
        $ready     = Order::where('merchant_id', $merchant->id)->where('status', OrderStatus::READY)->count();

        $todaySales = Order::where('merchant_id', $merchant->id)
            ->whereIn('status', [OrderStatus::DELIVERED, OrderStatus::READY, OrderStatus::PREPARING])
            ->whereDate('created_at', today())
            ->sum('total_amount');

        return response()->json([
            'success' => true,
            'stats'   => [
                'pending'      => $pending,
                'preparing'    => $preparing,
                'ready'        => $ready,
                'today_sales'  => (float) $todaySales,
                'active_total' => $pending + $preparing + $ready,
            ],
        ]);
    }

    /**
     * Create a test order — only available in local/testing environment.
     */
    public function createTestOrder(Request $request): JsonResponse
    {
        if (! app()->isLocal() && ! app()->environment('testing')) {
            return response()->json(['success' => false, 'message' => 'غير متاح في بيئة الإنتاج'], 403);
        }

        $merchant = $request->user()->merchant;

        // Pick a random product from this merchant's categories
        $product = Product::whereHas('category', fn ($q) => $q->where('merchant_id', $merchant->id))
            ->first();

        $order = Order::create([
            'id'                => Str::uuid(),
            'order_code'        => 'ORD-' . strtoupper(Str::random(6)),
            'merchant_id'       => $merchant->id,
            'status'            => OrderStatus::PENDING,
            'payment_method'    => 'CASH_ON_DELIVERY',
            'fulfillment_type'  => 'MERCHANT_DELIVERY',
            'customer_name'     => 'عميل تجريبي',
            'customer_phone'    => '01000000000',
            'delivery_address'  => 'شارع التحرير، القاهرة',
            'subtotal_amount'   => 85.00,
            'delivery_fee'      => 15.00,
            'total_amount'      => 100.00,
            'prep_time_minutes' => $merchant->preparation_time_minutes ?? 30,
            'order_notes'       => 'بدون بصل من فضلك',
        ]);

        if ($product) {
            OrderItem::create([
                'id'                       => Str::uuid(),
                'order_id'                 => $order->id,
                'product_id'               => $product->id,
                'product_name_at_purchase' => $product->name,
                'unit_price'               => $product->base_price,
                'quantity'                 => 2,
                'total_price'              => $product->base_price * 2,
            ]);
        }

        $order->statusHistory()->create([
            'previous_status' => null,
            'new_status'      => OrderStatus::PENDING,
            'actor_id'        => $request->user()->id,
            'actor_type'      => ActorType::SYSTEM,
            'reason'          => 'طلب تجريبي تم إنشاؤه تلقائياً',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء طلب تجريبي بنجاح',
            'order'   => $order->load(['items.product', 'items.variant', 'items.modifiers']),
        ], 201);
    }
}
