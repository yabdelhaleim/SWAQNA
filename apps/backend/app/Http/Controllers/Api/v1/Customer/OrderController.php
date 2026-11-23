<?php

namespace App\Http\Controllers\Api\v1\Customer;

use App\Enums\ActorType;
use App\Enums\DeliveryFulfillmentType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Events\OrderCancelled;
use App\Events\OrderPlaced;
use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Merchant;
use App\Models\ModifierItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * POST /api/v1/customer/orders
     * العميل يبعت طلب جديد من السلة
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'merchant_id'                    => 'required',
            'items'                          => 'required|array|min:1',
            'items.*.dish_id'                => 'required',
            'items.*.variant_id'             => 'nullable|string',
            'items.*.modifier_ids'           => 'nullable|array',
            'items.*.modifier_ids.*'         => 'required|string',
            'items.*.special_instructions'   => 'nullable|string|max:300',
            'items.*.quantity'               => 'required|integer|min:1',
            'delivery_address'               => 'required|string|min:5',
            'notes'                          => 'nullable|string|max:500',
            'coupon_code'                    => 'nullable|string|max:50',
        ]);

        /** @var User $user */
        $user = $request->user();

        // جيب المتجر
        $merchant = Merchant::find($validated['merchant_id']);
        if (!$merchant) {
            return response()->json([
                'success' => false,
                'message' => 'المتجر غير موجود',
            ], 404);
        }

        // احسب الإجمالي وجيب بيانات المنتجات
        $subtotal = 0;
        $orderItems = [];

        foreach ($validated['items'] as $item) {
            $product = Product::find($item['dish_id']);
            if (!$product || !$product->is_available) {
                return response()->json([
                    'success' => false,
                    'message' => 'منتج غير متاح: ' . ($product?->name ?? $item['dish_id']),
                ], 422);
            }

            // فحص وتطبيق الحجم (Variant)
            $variant = null;
            $unitPrice = (float) $product->base_price;
            $productName = $product->name;

            if (!empty($item['variant_id'])) {
                $variant = ProductVariant::where('product_id', $product->id)->find($item['variant_id']);
                if ($variant) {
                    $unitPrice = (float) $variant->price;
                    $productName .= " ({$variant->name})";
                }
            }

            // فحص وتطبيق الإضافات (Modifiers)
            $modifiersData = [];
            $modifiersTotal = 0;
            if (!empty($item['modifier_ids'])) {
                $modifierItems = ModifierItem::whereIn('id', $item['modifier_ids'])->get();
                foreach ($modifierItems as $mod) {
                    $modPrice = (float) $mod->additional_price;
                    $modifiersTotal += $modPrice;
                    $modifiersData[] = [
                        'name'  => $mod->name,
                        'price' => $modPrice,
                    ];
                }
            }

            $totalItemUnitPrice = $unitPrice + $modifiersTotal;
            $qty = (int) $item['quantity'];
            $itemSubtotal = $totalItemUnitPrice * $qty;
            $subtotal += $itemSubtotal;

            $orderItems[] = [
                'product_id'               => $product->id,
                'variant_id'               => $variant?->id,
                'product_name_at_purchase' => $productName,
                'unit_price'               => $totalItemUnitPrice,
                'quantity'                 => $qty,
                'total_price'              => $itemSubtotal,
                'item_notes'               => $item['special_instructions'] ?? null,
                'modifiers'                => $modifiersData,
            ];
        }

        $deliveryFee = 15.00; // ثابت مؤقتاً
        $discountAmount = 0.00;
        $appliedCoupon = null;

        // التحقق من كود الخصم (Promo Code) إذا تم إرساله
        if (!empty($validated['coupon_code'])) {
            $code = strtoupper(trim($validated['coupon_code']));
            $coupon = Coupon::where('code', $code)->first();

            if ($coupon && $coupon->is_active) {
                $now = now();
                $isDateValid = (!$coupon->starts_at || $now->gte($coupon->starts_at)) &&
                               (!$coupon->expires_at || $now->lte($coupon->expires_at));
                $isMerchantValid = !$coupon->merchant_id || $coupon->merchant_id === $merchant->id;
                $isUsesValid = !$coupon->max_uses || $coupon->used_count < $coupon->max_uses;
                $userUses = CouponUsage::where('coupon_id', $coupon->id)->where('user_id', $user->id)->count();
                $isUserValid = $userUses < $coupon->max_uses_per_user;
                $isMinValid = $subtotal >= $coupon->min_order_amount;

                if ($isDateValid && $isMerchantValid && $isUsesValid && $isUserValid && $isMinValid) {
                    $discountAmount = $coupon->calculateDiscount($subtotal);
                    $appliedCoupon = $coupon;
                }
            }
        }

        $total = max(0, $subtotal + $deliveryFee - $discountAmount);

        // إنشاء الطلب داخل transaction
        $order = DB::transaction(function () use ($user, $merchant, $validated, $orderItems, $subtotal, $deliveryFee, $discountAmount, $total, $appliedCoupon) {
            $order = Order::create([
                'merchant_id'      => $merchant->id,
                'customer_id'      => $user->id,
                'customer_name'    => $user->full_name ?? 'عميل',
                'customer_phone'   => $user->phone_number ?? '',
                'delivery_address' => $validated['delivery_address'],
                'fulfillment_type' => DeliveryFulfillmentType::PLATFORM_DELIVERY,
                'payment_method'   => PaymentMethod::CASH_ON_DELIVERY,
                'subtotal_amount'  => $subtotal,
                'delivery_fee'     => $deliveryFee,
                'discount_amount'  => $discountAmount,
                'coupon_code'      => $appliedCoupon?->code,
                'coupon_id'        => $appliedCoupon?->id,
                'total_amount'     => $total,
                'status'           => OrderStatus::PENDING,
                'delivery_pin'     => (string) mt_rand(1000, 9999),
                'prep_time_minutes'=> $merchant->preparation_time_minutes ?? 45,
                'order_notes'      => $validated['notes'] ?? null,
                'order_code'       => strtoupper(Str::random(6)),
            ]);

            if ($appliedCoupon) {
                $appliedCoupon->increment('used_count');
                CouponUsage::create([
                    'coupon_id'       => $appliedCoupon->id,
                    'user_id'         => $user->id,
                    'order_id'        => $order->id,
                    'discount_amount' => $discountAmount,
                    'used_at'         => now(),
                ]);
            }

            foreach ($orderItems as $item) {
                $modifiers = $item['modifiers'];
                unset($item['modifiers']);

                /** @var \App\Models\OrderItem $orderItem */
                $orderItem = $order->items()->create($item);

                foreach ($modifiers as $mod) {
                    $orderItem->modifiers()->create($mod);
                }
            }

            return $order;
        });

        // 🚀 بث الحدث عبر WebSocket للمطعم في أجزاء من الثانية!
        event(new OrderPlaced($order));

        // ⏱️ جدولة إلغاء تلقائي إذا لم يقبل المطعم الطلب خلال 15 دقيقة
        \App\Jobs\AutoCancelUnacceptedOrder::dispatch($order->id)->delay(now()->addMinutes(15));

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال طلبك بنجاح! 🎉',
            'data'    => $this->formatOrder($order->load(['items.product', 'items.variant', 'items.modifiers', 'merchant'])),
        ], 201);
    }

    /**
     * GET /api/v1/customer/orders
     * قائمة طلبات العميل
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $orders = Order::with(['merchant', 'items.product', 'items.variant', 'items.modifiers', 'review'])
            ->where('customer_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success'      => true,
            'data'         => collect($orders->items())->map(fn($o) => $this->formatOrder($o)),
            'current_page' => $orders->currentPage(),
            'last_page'    => $orders->lastPage(),
            'total'        => $orders->total(),
        ]);
    }

    /**
     * GET /api/v1/customer/orders/{id}
     * تفاصيل طلب محدد
     */
    public function show(Request $request, string $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $order = Order::with(['merchant', 'items.product', 'items.variant', 'items.modifiers', 'review'])
            ->where('customer_id', $user->id)
            ->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'الطلب غير موجود',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->formatOrder($order),
        ]);
    }

    /**
     * POST /api/v1/customer/orders/{id}/cancel
     * إلغاء الطلب من طرف العميل إذا كان لا يزال في حالة الانتظار (PENDING)
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $order = Order::with(['merchant', 'items.product'])
            ->where('customer_id', $user->id)
            ->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'الطلب غير موجود',
            ], 404);
        }

        $currentStatus = $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status;

        if ($currentStatus !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'عفواً، لا يمكن إلغاء الطلب بعد قبوله أو بدء تحضيره من المطعم',
            ], 422);
        }

        $reason = $request->input('reason', 'تم الإلغاء بواسطة العميل');

        $order->update([
            'status'       => OrderStatus::CANCELLED,
            'cancelled_at' => now(),
        ]);

        $order->statusHistory()->create([
            'previous_status' => OrderStatus::PENDING,
            'new_status'      => OrderStatus::CANCELLED,
            'actor_id'        => $user->id,
            'actor_type'      => ActorType::CUSTOMER,
            'reason'          => $reason,
        ]);

        // 🚀 بث إلغاء الطلب فورا للمطعم وللعميل عبر WebSocket
        event(new OrderCancelled($order, $reason, 'CUSTOMER'));

        return response()->json([
            'success' => true,
            'message' => 'تم إلغاء الطلب بنجاح',
            'data'    => $this->formatOrder($order->fresh(['merchant', 'items.product'])),
        ]);
    }

    // ─── Formatter ───────────────────────────────────────────────────────────

    private function formatOrder(Order $order): array
    {
        $status = $order->status instanceof \App\Enums\OrderStatus
            ? strtolower($order->status->value)
            : strtolower($order->status ?? 'pending');

        return [
            'id'               => $order->id,
            'order_code'       => $order->order_code,
            'status'           => $status,
            'delivery_pin'     => $order->delivery_pin ?? '1234',
            'prep_time_minutes'=> (int) ($order->prep_time_minutes ?? 45),
            'accepted_at'      => $order->accepted_at?->toIso8601String(),
            'ready_at'         => $order->ready_at?->toIso8601String(),
            'delivered_at'     => $order->delivered_at?->toIso8601String(),
            'total_amount'     => (float) $order->total_amount,
            'subtotal_amount'  => (float) $order->subtotal_amount,
            'delivery_fee'     => (float) $order->delivery_fee,
            'discount_amount'  => (float) ($order->discount_amount ?? 0),
            'coupon_code'      => $order->coupon_code,
            'delivery_address' => $order->delivery_address,
            'order_notes'      => $order->order_notes,
            'created_at'       => $order->created_at?->toIso8601String(),
            'review'           => $order->relationLoaded('review') && $order->review ? [
                'id'         => $order->review->id,
                'rating'     => (int) $order->review->rating,
                'comment'    => $order->review->comment,
                'tags'       => $order->review->tags ?? [],
                'created_at' => $order->review->created_at?->toIso8601String(),
            ] : null,
            'store' => [
                'id'    => $order->merchant?->id,
                'name'  => $order->merchant?->store_name ?? 'متجر',
                'logo'  => $order->merchant?->logo_url,
                'phone' => $order->merchant?->phone_number ?? '01000000000',
            ],
            'items' => $order->items->map(fn($item) => [
                'id'           => $item->id,
                'quantity'     => $item->quantity,
                'unit_price'   => (float) $item->unit_price,
                'subtotal'     => (float) $item->total_price,
                'variant_name' => $item->variant?->name,
                'notes'        => $item->item_notes,
                'dish'         => [
                    'id'   => $item->product?->id,
                    'name' => $item->product_name_at_purchase ?? $item->product?->name ?? 'صنف',
                ],
                'modifiers'    => $item->modifiers->map(fn($m) => [
                    'id'    => $m->id,
                    'name'  => $m->name,
                    'price' => (float) $m->price,
                ])->values(),
            ])->values(),
        ];
    }
}
