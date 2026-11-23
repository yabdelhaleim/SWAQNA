<?php

namespace App\Http\Controllers\Api\v1\Customer;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\CouponUsage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    /**
     * Validate a coupon code for the customer's current cart.
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'subtotal' => 'required|numeric|min:0',
            'merchant_id' => 'nullable|uuid',
        ]);

        $code = strtoupper(trim($validated['code']));
        $subtotal = (float) $validated['subtotal'];
        $user = $request->user();

        $coupon = Coupon::where('code', $code)->first();

        if (!$coupon) {
            return response()->json([
                'success' => false,
                'message' => 'كوبون الخصم غير صحيح أو غير موجود',
            ], 404);
        }

        if (!$coupon->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'هذا الكوبون غير مفعّل حالياً',
            ], 422);
        }

        $now = now();
        if ($coupon->starts_at && $now->lt($coupon->starts_at)) {
            return response()->json([
                'success' => false,
                'message' => 'هذا الكوبون لم يبدأ العمل به بعد',
            ], 422);
        }

        if ($coupon->expires_at && $now->gt($coupon->expires_at)) {
            return response()->json([
                'success' => false,
                'message' => 'عذراً، هذا الكوبون منتهي الصلاحية',
            ], 422);
        }

        if ($coupon->merchant_id && $coupon->merchant_id !== $request->merchant_id) {
            return response()->json([
                'success' => false,
                'message' => 'هذا الكوبون مخصص لمطعم محدد فقط',
            ], 422);
        }

        if ($coupon->max_uses && $coupon->used_count >= $coupon->max_uses) {
            return response()->json([
                'success' => false,
                'message' => 'تم استنفاد الحد الأقصى لاستخدام هذا الكوبون',
            ], 422);
        }

        if ($user) {
            $userUsage = CouponUsage::where('coupon_id', $coupon->id)
                ->where('user_id', $user->id)
                ->count();

            if ($userUsage >= $coupon->max_uses_per_user) {
                return response()->json([
                    'success' => false,
                    'message' => 'لقد استخدمت هذا الكوبون بالحد الأقصى المسموح به لك',
                ], 422);
            }
        }

        if ($subtotal < $coupon->min_order_amount) {
            return response()->json([
                'success' => false,
                'message' => "الحد الأدنى للطلب لتفعيل هذا الكوبون هو {$coupon->min_order_amount} جنيه",
            ], 422);
        }

        $discount = $coupon->calculateDiscount($subtotal);

        return response()->json([
            'success' => true,
            'message' => 'تم تطبيق كود الخصم بنجاح! 🎉',
            'data' => [
                'coupon_id' => $coupon->id,
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => $coupon->value,
                'discount_amount' => $discount,
                'description' => $coupon->description,
            ],
        ]);
    }
}
