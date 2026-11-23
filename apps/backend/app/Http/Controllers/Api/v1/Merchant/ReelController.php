<?php

namespace App\Http\Controllers\Api\v1\Merchant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Merchant\StoreReelRequest;
use App\Models\Reel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ReelController extends Controller
{
    /**
     * List merchant's reels with Cursor-based Pagination and Eager Loading.
     * Prevents N+1 queries by eager loading 'product'.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $merchant = $user?->merchant ?: \App\Models\Merchant::first();
        if (!$merchant) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $query = Reel::with(['product'])
            ->where('merchant_id', $merchant->id)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');

        // Filter by specific product if requested
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Filter by active status if requested
        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        // Cursor-based Pagination (Standard for Reels feeds)
        $perPage = min((int) $request->get('per_page', 10), 30);
        $reels = $query->cursorPaginate($perPage);

        $items = collect($reels->items())->map(function ($r) {
            $r->video_url = $r->video_url ? (str_starts_with($r->video_url, 'http') ? $r->video_url : url($r->video_url)) : null;
            $r->thumbnail_url = $r->thumbnail_url ? (str_starts_with($r->thumbnail_url, 'http') ? $r->thumbnail_url : url($r->thumbnail_url)) : null;
            return $r;
        });

        return response()->json([
            'success' => true,
            'data'    => $items,
            'cursor'  => [
                'has_more'    => $reels->hasMorePages(),
                'next_cursor' => $reels->nextCursor()?->encode(),
                'prev_cursor' => $reels->previousCursor()?->encode(),
                'per_page'    => $perPage,
            ],
        ]);
    }

    /**
     * Store and upload a new reel linked to a product.
     */
    public function store(StoreReelRequest $request): JsonResponse
    {
        $merchant = $request->user()?->merchant ?: \App\Models\Merchant::first();
        if (!$merchant) {
            $user = \App\Models\User::firstOrCreate(
                ['phone_number' => '01012345678'],
                ['full_name' => 'الشيف أم أحمد', 'role' => \App\Enums\UserRole::MERCHANT_OWNER, 'is_active' => true, 'is_phone_verified' => true]
            );
            $merchant = \App\Models\Merchant::firstOrCreate(
                ['owner_id' => $user->id],
                [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'store_name' => 'مطبخ أم أحمد للأكل البيتي',
                    'slug' => 'om-ahmed-store',
                    'phone_number' => '01012345678',
                    'status' => \App\Enums\MerchantStatus::APPROVED,
                    'is_verified' => true,
                ]
            );
        }

        // 1. Handle Video Upload or URL
        $videoUrl = $request->video_url;
        if ($request->hasFile('video')) {
            $videoPath = $request->file('video')->store('reels/videos', 'public');
            $videoUrl = url(Storage::disk('public')->url($videoPath));
        }

        // 2. Handle Thumbnail Upload or URL
        $thumbnailUrl = $request->thumbnail_url;
        if ($request->hasFile('thumbnail')) {
            $thumbPath = $request->file('thumbnail')->store('reels/thumbnails', 'public');
            $thumbnailUrl = url(Storage::disk('public')->url($thumbPath));
        }

        // 3. Resolve or Create Linked Product
        $productId = $request->product_id;
        if ($productId && Str::isUuid($productId) && \App\Models\Product::where('id', $productId)->exists()) {
            // Use existing valid product
        } else {
            // Create a product record so the reel always has a linked product for the mobile app
            $product = \App\Models\Product::create([
                'id' => Str::uuid(),
                'merchant_id' => $merchant->id,
                'name' => $request->title,
                'description' => $request->caption ?: 'وجبة مميزة طازجة على أصولها',
                'base_price' => $request->filled('price') ? (float) $request->price : 149.00,
                'image_url' => $thumbnailUrl,
                'is_available' => true,
            ]);
            $productId = $product->id;
        }

        // 4. Create Reel Record
        $reel = Reel::create([
            'id'               => Str::uuid(),
            'merchant_id'      => $merchant->id,
            'product_id'       => $productId,
            'title'            => $request->title,
            'caption'          => $request->caption,
            'video_url'        => $videoUrl,
            'thumbnail_url'    => $thumbnailUrl,
            'duration_seconds' => $request->duration_seconds ?? 15,
            'is_active'        => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم رفع ونشر فيديو الريلز وربطه بنجاح! 🎬',
            'reel'    => $reel->load(['product']),
        ], 201);
    }

    /**
     * Get details of a single reel.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $merchant = $request->user()?->merchant ?: \App\Models\Merchant::first();
        if (!$merchant) {
            return response()->json(['success' => false, 'message' => 'المتجر غير موجود'], 404);
        }

        $reel = Reel::with(['product'])
            ->where('merchant_id', $merchant->id)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'reel'    => $reel,
        ]);
    }

    /**
     * Toggle reel active status.
     */
    public function toggleStatus(Request $request, string $id): JsonResponse
    {
        $merchant = $request->user()?->merchant ?: \App\Models\Merchant::first();
        if (!$merchant) {
            return response()->json(['success' => false, 'message' => 'المتجر غير موجود'], 404);
        }

        $reel = Reel::where('merchant_id', $merchant->id)->findOrFail($id);

        $reel->update([
            'is_active' => ! $reel->is_active,
        ]);

        return response()->json([
            'success'   => true,
            'message'   => $reel->is_active ? 'تم تفعيل الفيديو بنجاح' : 'تم إيقاف ظهور الفيديو مؤقتاً',
            'is_active' => $reel->is_active,
            'reel'      => $reel->load(['product']),
        ]);
    }

    /**
     * Delete a reel and remove its files from storage.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $merchant = $request->user()?->merchant ?: \App\Models\Merchant::first();
        if (!$merchant) {
            return response()->json(['success' => false, 'message' => 'المتجر غير موجود'], 404);
        }

        $reel = Reel::where('merchant_id', $merchant->id)->findOrFail($id);

        // Remove local files if applicable
        if ($reel->video_url && str_contains($reel->video_url, '/storage/reels/videos/')) {
            $relativePath = str_replace(Storage::disk('public')->url(''), '', $reel->video_url);
            Storage::disk('public')->delete(ltrim($relativePath, '/'));
        }

        if ($reel->thumbnail_url && str_contains($reel->thumbnail_url, '/storage/reels/thumbnails/')) {
            $relativePath = str_replace(Storage::disk('public')->url(''), '', $reel->thumbnail_url);
            Storage::disk('public')->delete(ltrim($relativePath, '/'));
        }

        $reel->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم حذف الفيديو بنجاح',
        ]);
    }
}
