<?php

namespace App\Http\Controllers\Api\v1\Customer;

use App\Events\ReelLiked;
use App\Events\ReelSaved;
use App\Http\Controllers\Controller;
use App\Models\Reel;
use App\Models\ReelLike;
use App\Models\ReelSave;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReelInteractionController extends Controller
{
    /**
     * تبديل حالة الإعجاب (Toggle Like)
     * POST /api/v1/reels/{id}/like
     */
    public function toggleLike(Request $request, string $reelId): JsonResponse
    {
        $user = $request->user();
        $reel = Reel::findOrFail($reelId);

        $result = DB::transaction(function () use ($user, $reel) {
            $like = ReelLike::where('user_id', $user->id)
                ->where('reel_id', $reel->id)
                ->first();

            if ($like) {
                // كان عامِل لايك ➔ احذف اللايك ونقص العداد ذرّياً
                $like->delete();
                $reel->decrement('likes_count');
                $isLiked = false;
            } else {
                // لم يكن عامِل لايك ➔ سجّل لايك جديد وزد العداد ذرّياً
                ReelLike::create([
                    'user_id' => $user->id,
                    'reel_id' => $reel->id,
                ]);
                $reel->increment('likes_count');
                $isLiked = true;
            }

            // قراءة العداد المحدث مباشرة
            $reel->refresh();

            return [
                'is_liked'    => $isLiked,
                'likes_count' => (int) $reel->likes_count,
            ];
        });

        // 🚀 إطلاق الحدث لمعالجة الإشعارات والتحليلات في الخلفية (Background Queued Job)
        if ($result['is_liked']) {
            ReelLiked::dispatch($user, $reel);
        }

        return response()->json([
            'success'     => true,
            'message'     => $result['is_liked'] ? 'تم تسجيل الإعجاب ❤️' : 'تم إلغاء الإعجاب',
            'is_liked'    => $result['is_liked'],
            'likes_count' => $result['likes_count'],
        ]);
    }

    /**
     * تبديل حالة الحفظ في المفضلة (Toggle Save / Bookmark)
     * POST /api/v1/reels/{id}/save
     */
    public function toggleSave(Request $request, string $reelId): JsonResponse
    {
        $user = $request->user();
        $reel = Reel::findOrFail($reelId);

        $result = DB::transaction(function () use ($user, $reel) {
            $save = ReelSave::where('user_id', $user->id)
                ->where('reel_id', $reel->id)
                ->first();

            if ($save) {
                // كان محفوظاً ➔ احذف من المفضلة
                $save->delete();
                $reel->decrement('saves_count');
                $isSaved = false;
            } else {
                // احفظه في المفضلة واربطه بالمنتج للشراء السريع
                ReelSave::create([
                    'user_id'    => $user->id,
                    'reel_id'    => $reel->id,
                    'product_id' => $reel->product_id,
                ]);
                $reel->increment('saves_count');
                $isSaved = true;
            }

            $reel->refresh();

            return [
                'is_saved'    => $isSaved,
                'saves_count' => (int) $reel->saves_count,
            ];
        });

        // 🔖 إطلاق حدث حفظ الفيديو في المفضلة
        if ($result['is_saved']) {
            ReelSaved::dispatch($user, $reel);
        }

        return response()->json([
            'success'     => true,
            'message'     => $result['is_saved'] ? 'تم الحفظ في مفضلتك 🔖' : 'تمت الإزالة من المفضلة',
            'is_saved'    => $result['is_saved'],
            'saves_count' => $result['saves_count'],
        ]);
    }

    /**
     * جلب قائمة المفضلة والمحفوظات للعميل
     * GET /api/v1/customer/favorites
     */
    public function favorites(Request $request): JsonResponse
    {
        $user = $request->user();

        $saves = ReelSave::with(['reel.product', 'reel.merchant', 'product.merchant'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $items = collect($saves->items())->map(function ($save) {
            $reel = $save->reel;
            $product = $save->product ?: $reel?->product;
            $merchant = $product?->merchant ?: $reel?->merchant;

            return [
                'id'            => $save->id,
                'saved_at'      => $save->created_at?->toIso8601String(),
                'reel_id'       => $reel?->id,
                'title'         => $reel?->title ?: ($product?->name ?? 'وجبة محفوظة'),
                'video_url'     => $reel?->video_url,
                'thumbnail_url' => $reel?->thumbnail_url ?: $product?->image_url,
                'product' => [
                    'id'          => $product?->id,
                    'name'        => $product?->name ?? 'وجبة مميزة',
                    'description' => $product?->description ?? '',
                    'price'       => (float) ($product?->base_price ?? 100),
                    'image_url'   => $product?->image_url,
                    'store_id'    => $merchant?->id,
                    'store_name'  => $merchant?->store_name ?: ($merchant?->name ?: 'متجر سوقنا'),
                ],
            ];
        });

        return response()->json([
            'success'      => true,
            'data'         => $items,
            'current_page' => $saves->currentPage(),
            'last_page'    => $saves->lastPage(),
            'total'        => $saves->total(),
        ]);
    }
}
