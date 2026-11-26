<?php

namespace App\Http\Controllers\Api\v1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\Reel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModerationController extends Controller
{
    public function reels(): JsonResponse
    {
        $reels = Reel::with(['merchant:id,name', 'product:id,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($r) => [
                'id'            => $r->id,
                'store_name'    => $r->merchant?->name ?? 'متجر',
                'product_name'  => $r->product?->name ?? $r->title,
                'video_url'     => $r->video_url,
                'thumbnail_url' => $r->thumbnail_url,
                'views_count'   => (int) ($r->views_count ?? 0),
                'likes_count'   => (int) $r->likes_count,
                'is_active'     => (bool) $r->is_active,
                'created_at'    => $r->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'reels'   => $reels,
        ]);
    }

    public function toggleReel(string $id): JsonResponse
    {
        $reel = Reel::findOrFail($id);
        $reel->update(['is_active' => !$reel->is_active]);

        return response()->json([
            'success'   => true,
            'is_active' => (bool) $reel->is_active,
            'message'   => $reel->is_active ? 'تم تفعيل الريلز.' : 'تم إخفاء الريلز.',
        ]);
    }

    public function deleteReel(string $id): JsonResponse
    {
        Reel::findOrFail($id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم حذف الريلز نهائياً.',
        ]);
    }

    public function coupons(): JsonResponse
    {
        $coupons = Coupon::orderBy('created_at', 'desc')->get()->map(fn($c) => [
            'id'                  => $c->id,
            'code'                => $c->code,
            'discount_type'       => $c->type,
            'discount_value'      => (float) $c->value,
            'max_discount_amount' => (float) ($c->max_discount_amount ?? 0),
            'min_order_amount'    => (float) ($c->min_order_amount ?? 0),
            'usage_count'         => (int) $c->used_count,
            'max_usage_limit'     => (int) ($c->max_uses ?? 0),
            'is_active'           => (bool) $c->is_active,
            'expires_at'          => $c->expires_at?->toDateString(),
        ]);

        return response()->json([
            'success' => true,
            'coupons' => $coupons,
        ]);
    }

    public function storeCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'                => 'required|string|max:50|unique:coupons,code',
            'discount_type'       => 'nullable|in:PERCENTAGE,FIXED',
            'discount_value'      => 'required|numeric|min:1',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount'    => 'nullable|numeric|min:0',
            'max_uses'            => 'nullable|integer|min:1',
            'expires_at'          => 'nullable|date',
        ]);

        $coupon = Coupon::create([
            'code'                => strtoupper(trim($validated['code'])),
            'type'                => $validated['discount_type'] ?? 'PERCENTAGE',
            'value'               => $validated['discount_value'],
            'max_discount_amount' => $validated['max_discount_amount'] ?? null,
            'min_order_amount'    => $validated['min_order_amount'] ?? 0,
            'max_uses'            => $validated['max_uses'] ?? 1000,
            'max_uses_per_user'   => 1,
            'is_active'           => true,
            'expires_at'          => $validated['expires_at'] ?? now()->addMonths(3),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء الكوبون بنجاح.',
            'coupon'  => $coupon,
        ], 201);
    }

    public function toggleCoupon(string $id): JsonResponse
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->update(['is_active' => !$coupon->is_active]);

        return response()->json([
            'success'   => true,
            'is_active' => (bool) $coupon->is_active,
            'message'   => $coupon->is_active ? 'تم تفعيل الكوبون.' : 'تم تعطيل الكوبون.',
        ]);
    }
}
