<?php

namespace App\Http\Controllers\Api\v1\Admin;

use App\Enums\ActorType;
use App\Enums\OrderStatus;
use App\Enums\WalletType;
use App\Events\OrderStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\DeliveryCaptain;
use App\Models\Order;
use App\Models\Wallet;
use App\Notifications\OrderStatusNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['merchant:id,name,commission_rate', 'captain:id,name,phone', 'items'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'ALL') {
            $query->where('status', strtoupper($request->status));
        }

        $orders = $query->take(100)->get()->map(function ($order) {
            $rate = (float) ($order->merchant?->commission_rate ?? 10);
            $itemsSummary = $order->items->map(fn($i) => "{$i->product_name_at_purchase} ({$i->quantity})")->implode(' + ');

            return [
                'id'                  => $order->id,
                'order_code'          => $order->order_code,
                'customer_name'       => $order->customer_name,
                'customer_phone'      => $order->customer_phone,
                'store_id'            => $order->merchant_id,
                'store_name'          => $order->merchant?->name ?? 'متجر',
                'status'              => strtolower($order->status instanceof OrderStatus ? $order->status->value : (string) $order->status),
                'delivery_address'    => $order->delivery_address,
                'total_amount'        => (float) $order->total_amount,
                'platform_commission' => round(((float) $order->total_amount) * ($rate / 100), 2),
                'delivery_pin'        => $order->delivery_pin,
                'captain_id'          => $order->captain_id,
                'captain_name'        => $order->captain?->name,
                'items_summary'       => $itemsSummary ?: 'طلب جديد',
                'items_count'         => $order->items->sum('quantity'),
                'created_at'          => $order->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'orders'  => $orders,
        ]);
    }

    public function assignCaptain(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'captain_id' => 'required|exists:delivery_captains,id',
        ]);

        $order = Order::findOrFail($id);
        $captain = DeliveryCaptain::findOrFail($validated['captain_id']);

        DB::transaction(function () use ($order, $captain) {
            $order->update(['captain_id' => $captain->id]);
            $captain->update(['status' => 'BUSY']);
        });

        return response()->json([
            'success' => true,
            'message' => "تم تعيين الكابتن {$captain->name} للطلب بنجاح.",
        ]);
    }

    public function confirmDelivery(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'delivery_pin' => 'required|string|size:4',
        ]);

        $order = Order::with('merchant', 'captain')->findOrFail($id);

        if ($order->status === OrderStatus::DELIVERED) {
            return response()->json([
                'success' => false,
                'message' => 'تم تأكيد تسليم هذا الطلب مسبقاً.',
            ], 422);
        }

        if ($order->delivery_pin && $order->delivery_pin !== $validated['delivery_pin']) {
            return response()->json([
                'success' => false,
                'message' => 'رمز التسليم (Delivery PIN) غير صحيح.',
            ], 422);
        }

        DB::transaction(function () use ($order, $request) {
            $prevStatus = $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status;

            $order->update([
                'status'       => OrderStatus::DELIVERED,
                'delivered_at' => now(),
                'is_paid'      => true,
            ]);

            $order->statusHistory()->create([
                'previous_status' => $prevStatus,
                'new_status'      => OrderStatus::DELIVERED->value,
                'actor_id'        => $request->user()->id,
                'actor_type'      => ActorType::ADMIN,
                'reason'          => 'تأكيد التسليم عبر لوحة الإدارة باستخدام Delivery PIN',
            ]);

            // Credit merchant wallet with net amount
            $rate = (float) ($order->merchant?->commission_rate ?? 10);
            $net = round(((float) $order->total_amount) * (1 - $rate / 100), 2);
            $wallet = Wallet::firstOrCreate(
                ['merchant_id' => $order->merchant_id, 'wallet_type' => WalletType::MERCHANT],
                ['balance' => 0, 'locked_amount' => 0, 'currency' => 'EGP']
            );
            $wallet->increment('balance', $net);

            if ($order->captain) {
                $order->captain->update([
                    'status'               => 'AVAILABLE',
                    'completed_today'      => $order->captain->completed_today + 1,
                    'total_earnings_today' => $order->captain->total_earnings_today + (float) $order->delivery_fee,
                ]);
            }
        });

        event(new OrderStatusUpdated($order->fresh(), 'تم تسليم الطلب للعميل بنجاح'));
        $order->customer?->notify(new OrderStatusNotification($order, 'DELIVERED'));

        return response()->json([
            'success' => true,
            'message' => 'تم تأكيد التسليم وإضافة الأرباح لمحفظة التاجر بنجاح.',
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:PENDING,PREPARING,READY,DELIVERED,CANCELLED',
            'reason' => 'nullable|string|max:300',
        ]);

        $order = Order::findOrFail($id);
        $prevStatus = $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status;

        $order->update([
            'status'       => $validated['status'],
            'cancelled_at' => $validated['status'] === 'CANCELLED' ? now() : $order->cancelled_at,
            'delivered_at' => $validated['status'] === 'DELIVERED' ? now() : $order->delivered_at,
        ]);

        $order->statusHistory()->create([
            'previous_status' => $prevStatus,
            'new_status'      => $validated['status'],
            'actor_id'        => $request->user()->id,
            'actor_type'      => ActorType::ADMIN,
            'reason'          => $validated['reason'] ?? 'تعديل الحالة من لوحة الإدارة',
        ]);

        event(new OrderStatusUpdated($order->fresh(), 'تم تحديث حالة الطلب من الإدارة'));

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث حالة الطلب بنجاح.',
        ]);
    }
}
