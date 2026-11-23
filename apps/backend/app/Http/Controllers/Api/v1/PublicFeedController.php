<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\Reel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicFeedController extends Controller
{
    /**
     * Get public feed of active reels for customer mobile app.
     */
    public function reels(Request $request): JsonResponse
    {
        $query = Reel::with([
            'product.variants' => fn($q) => $q->where('is_available', true)->orderBy('sort_order'),
            'product.modifierGroups.items' => fn($q) => $q->where('is_available', true)->orderBy('sort_order'),
            'merchant',
        ])
            ->where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('category')) {
            $cat = $request->category;
            $query->whereHas('product', function ($q) use ($cat) {
                $q->where('category_name', 'like', "%{$cat}%");
            });
        }

        $perPage = min((int) $request->get('per_page', 15), 30);
        $reels = $query->paginate($perPage);

        $currentUser = auth('sanctum')->user();

        // Format items to match mobile client structure
        $items = collect($reels->items())->map(function ($reel) use ($currentUser) {
            $product = $reel->product;
            $merchant = $reel->merchant;

            // إصلاح video URL — استخدام url() بدل Cloudflare hardcoded
            $rawUrl = $reel->video_url ?? '';
            if ($rawUrl && !str_starts_with($rawUrl, 'http')) {
                $videoUrl = url($rawUrl);
            } elseif (str_contains($rawUrl, 'localhost') || str_contains($rawUrl, '127.0.0.1')) {
                // استبدال localhost بـ IP السيرفر الحقيقي
                $path = parse_url($rawUrl, PHP_URL_PATH);
                $videoUrl = url($path);
            } else {
                $videoUrl = $rawUrl;
            }

            return [
                'id' => $reel->id,
                'title' => $reel->title,
                'caption' => $reel->caption,
                'video_url' => $videoUrl,
                'thumbnail_url' => $reel->thumbnail_url ?: ($product?->image_url ?: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'),
                'duration_seconds' => $reel->duration_seconds,
                'likes_count' => (int) $reel->likes_count,
                'comments_count' => (int) ($reel->comments_count ?? 0),
                'shares_count' => (int) $reel->shares_count,
                'saves_count' => (int) $reel->saves_count,
                'is_liked' => $currentUser ? $reel->isLikedBy($currentUser) : false,
                'is_saved' => $currentUser ? $reel->isSavedBy($currentUser) : false,
                'rating' => (float) ($merchant?->avg_rating > 0 ? $merchant->avg_rating : 4.8),
                'category' => $product?->category_name ?: 'أكل بيتي',
                'product' => [
                    'id' => $product?->id,
                    'name' => $product?->name ?: $reel->title,
                    'description' => $product?->description ?: $reel->caption,
                    'base_price' => (float) ($product?->base_price ?: 149),
                    'compare_at_price' => (float) ($product?->compare_at_price ?: ($product?->base_price ? round($product->base_price * 1.35) : 209)),
                    'image_url' => $product?->image_url,
                    'variants' => $product ? $product->variants->map(fn($v) => [
                        'id' => $v->id,
                        'name' => $v->name,
                        'price' => (float) $v->price,
                        'difference' => (float) ($v->price - $product->base_price),
                    ])->values() : [],
                    'modifier_groups' => $product ? $product->modifierGroups->map(fn($g) => [
                        'id' => $g->id,
                        'name' => $g->name,
                        'is_required' => (bool) $g->is_required,
                        'min_selection' => (int) $g->min_selection,
                        'max_selection' => (int) $g->max_selection,
                        'items' => $g->items->map(fn($item) => [
                            'id' => $item->id,
                            'name' => $item->name,
                            'additional_price' => (float) $item->additional_price,
                        ])->values(),
                    ])->values() : [],
                ],
                'store' => [
                    'id' => $merchant?->id,
                    'name' => $merchant?->store_name ?: 'مطبخ أم أحمد',
                    'logo' => $merchant?->logo_url ?: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200',
                    'is_verified' => true,
                ],
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $items,
            'current_page' => $reels->currentPage(),
            'last_page' => $reels->lastPage(),
            'total' => $reels->total(),
        ]);
    }

    /**
     * استكشاف الأقسام والمتاجر والأطباق المميزة
     */
    public function explore(Request $request): JsonResponse
    {
        $categories = [
            ['id' => 'homemade', 'title' => 'أكل بيتي', 'icon' => 'soup_kitchen', 'image' => 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300'],
            ['id' => 'restaurants', 'title' => 'مطاعم', 'icon' => 'restaurant', 'image' => 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300'],
            ['id' => 'desserts', 'title' => 'حلويات', 'icon' => 'cake', 'image' => 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=300'],
            ['id' => 'fashion', 'title' => 'أزياء وموضة', 'icon' => 'checkroom', 'image' => 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300'],
            ['id' => 'beauty', 'title' => 'تجميل وعناية', 'icon' => 'brush', 'image' => 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300'],
            ['id' => 'electronics', 'title' => 'إلكترونيات', 'icon' => 'phone_android', 'image' => 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300'],
        ];

        $merchants = Merchant::take(6)->get()->map(fn($m) => [
            'id' => $m->id,
            'name' => $m->store_name ?: ($m->name ?: 'متجر سوقنا'),
            'logo' => $m->logo_url ?: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150',
            'cover' => $m->cover_image_url ?: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
            'rating' => (float) ($m->avg_rating > 0 ? $m->avg_rating : 4.8),
            'prep_time' => (int) ($m->preparation_time_minutes ?: 30),
            'is_open' => $m->isOpenNow(),
        ]);

        $productsQuery = Product::with('merchant')->where('is_available', true);

        if ($request->filled('category') && $request->category !== 'الكل') {
            $cat = $request->category;
            $productsQuery->where(function ($q) use ($cat) {
                $q->where('name', 'like', "%{$cat}%")
                  ->orWhere('description', 'like', "%{$cat}%");
            });
        }

        // خيارات الترتيب والفلترة
        $sort = $request->get('sort', 'default');
        if ($sort === 'price_asc') {
            $productsQuery->orderBy('base_price', 'asc');
        } elseif ($sort === 'price_desc') {
            $productsQuery->orderBy('base_price', 'desc');
        } else {
            $productsQuery->orderBy('created_at', 'desc');
        }

        $trendingProducts = $productsQuery->take(16)->get()->map(fn($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'description' => $p->description,
            'price' => (float) $p->base_price,
            'image_url' => $p->image_url ?: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
            'store_id' => $p->merchant_id,
            'store_name' => $p->merchant?->store_name ?: ($p->merchant?->name ?: 'مطبخ سوقنا'),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'categories' => $categories,
                'featured_merchants' => $merchants,
                'trending_products' => $trendingProducts,
            ]
        ]);
    }

    /**
     * بحث فوري في الأكلات والمتاجر
     */
    public function search(Request $request): JsonResponse
    {
        $q = trim($request->get('q', ''));
        if (empty($q)) {
            return response()->json([
                'success' => true,
                'data' => [
                    'products' => [],
                    'merchants' => [],
                ]
            ]);
        }

        $products = Product::with('merchant')
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")
                      ->orWhere('description', 'like', "%{$q}%");
            })
            ->take(20)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'description' => $p->description,
                'price' => (float) $p->base_price,
                'image_url' => $p->image_url ?: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
                'store_id' => $p->merchant_id,
                'store_name' => $p->merchant?->store_name ?: ($p->merchant?->name ?: 'متجر'),
            ]);

        $merchants = Merchant::where('name', 'like', "%{$q}%")
            ->take(10)
            ->get()
            ->map(fn($m) => [
                'id' => $m->id,
                'name' => $m->store_name ?: ($m->name ?: 'متجر سوقنا'),
                'logo' => $m->logo_url ?: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150',
                'rating' => (float) ($m->avg_rating > 0 ? $m->avg_rating : 4.8),
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'products' => $products,
                'merchants' => $merchants,
            ]
        ]);
    }

    /**
     * صفحة تفاصيل المتجر وقائمته الكاملة للعميل
     */
    public function merchantDetails(string $id): JsonResponse
    {
        $merchant = Merchant::with(['products' => fn($q) => $q->where('is_available', true)])->find($id);
        if (!$merchant) {
            return response()->json([
                'success' => false,
                'message' => 'المتجر غير موجود',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $merchant->id,
                'name' => $merchant->store_name ?: ($merchant->name ?: 'متجر سوقنا'),
                'logo' => $merchant->logo_url ?: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150',
                'cover' => $merchant->cover_image_url ?: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
                'rating' => (float) ($merchant->avg_rating > 0 ? $merchant->avg_rating : 4.8),
                'reviews_count' => (int) ($merchant->total_reviews ?: 0),
                'address' => $merchant->address_text ?: 'القاهرة، مصر',
                'is_open' => $merchant->isOpenNow(),
                'products' => $merchant->products->map(fn($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'description' => $p->description,
                    'price' => (float) $p->base_price,
                    'image_url' => $p->image_url ?: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
                ]),
            ]
        ]);
    }

    /**
     * GET /api/v1/products/{id}
     * تفاصيل الوجبة مع الأحجام والإضافات المتاحة
     */
    public function productDetails(string $id): JsonResponse
    {
        $product = Product::with([
            'merchant',
            'variants' => fn($q) => $q->where('is_available', true)->orderBy('sort_order'),
            'modifierGroups.items' => fn($q) => $q->where('is_available', true)->orderBy('sort_order'),
        ])->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'الوجبة غير موجودة',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'          => $product->id,
                'name'        => $product->name,
                'description' => $product->description,
                'base_price'  => (float) $product->base_price,
                'image_url'   => $product->image_url,
                'prep_time'   => $product->prep_time_minutes ?? 25,
                'merchant'    => [
                    'id'         => $product->merchant?->id,
                    'store_name' => $product->merchant?->store_name ?? 'متجر سوقنا',
                    'logo_url'   => $product->merchant?->logo_url,
                ],
                'variants'    => $product->variants->map(fn($v) => [
                    'id'         => $v->id,
                    'name'       => $v->name,
                    'price'      => (float) $v->price,
                    'difference' => (float) ($v->price - $product->base_price),
                ])->values(),
                'modifier_groups' => $product->modifierGroups->map(fn($g) => [
                    'id'            => $g->id,
                    'name'          => $g->name,
                    'is_required'   => (bool) $g->is_required,
                    'min_selection' => (int) $g->min_selection,
                    'max_selection' => (int) $g->max_selection,
                    'items'         => $g->items->map(fn($item) => [
                        'id'               => $item->id,
                        'name'             => $item->name,
                        'additional_price' => (float) $item->additional_price,
                    ])->values(),
                ])->values(),
            ],
        ]);
    }
}
