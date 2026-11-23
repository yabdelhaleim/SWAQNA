<?php

namespace App\Http\Controllers\Api\v1\Merchant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Merchant\SaveProductRequest;
use App\Http\Requests\Merchant\UploadDishImageRequest;
use App\Models\Category;
use App\Models\Merchant;
use App\Models\ModifierGroup;
use App\Models\ModifierItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MenuController extends Controller
{
    /**
     * جلب قائمة الطعام والمنتجات بالكامل مع العلاقات الضرورية عبر Eager Loading لحل مشكلة N+1
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();

        // 1. جلب التصنيفات (العامة + الخاصة بالمتجر)
        $categories = Category::whereNull('merchant_id')
            ->orWhere('merchant_id', $merchant->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        // 2. جلب جميع الأطباق مع العلاقات (الفئات، الأحجام، مجموعات الإضافات وعناصرها)
        // باستخدام Eager Loading الصارم لمنع N+1
        $products = Product::with([
            'category',
            'variants',
            'modifierGroups.items',
        ])
            ->where('merchant_id', $merchant->id)
            ->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->get();

        // 3. جلب مجموعات الإضافات المتاحة لهذا التاجر
        $modifierGroups = ModifierGroup::with('items')
            ->where('merchant_id', $merchant->id)
            ->get();

        return response()->json([
            'success' => true,
            'categories' => $categories->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'icon_url' => $c->icon_url,
                'sort_order' => $c->sort_order,
            ]),
            'products' => $products->map(fn($p) => [
                'id' => $p->id,
                'category_id' => $p->category_id,
                'category_name' => $p->category?->name,
                'name' => $p->name,
                'description' => $p->description,
                'base_price' => (float) $p->base_price,
                'image_url' => $p->image_url ? (str_starts_with($p->image_url, 'http') || str_starts_with($p->image_url, 'data:') ? $p->image_url : url($p->image_url)) : null,
                'is_available' => (bool) $p->is_available,
                'prep_time_minutes' => (int) $p->prep_time_minutes,
                'servings_count' => $p->servings_count,
                'requires_preorder' => (bool) $p->requires_preorder,
                'variants' => $p->variants->map(fn($v) => [
                    'id' => $v->id,
                    'name' => $v->name,
                    'price' => (float) $v->price,
                    'is_available' => (bool) $v->is_available,
                ]),
                'modifier_groups' => $p->modifierGroups->map(fn($mg) => [
                    'id' => $mg->id,
                    'name' => $mg->name,
                    'is_required' => (bool) $mg->is_required,
                    'items' => $mg->items->map(fn($item) => [
                        'id' => $item->id,
                        'name' => $item->name,
                        'additional_price' => (float) $item->additional_price,
                    ]),
                ]),
            ]),
            'available_modifier_groups' => $modifierGroups->map(fn($mg) => [
                'id' => $mg->id,
                'name' => $mg->name,
                'is_required' => (bool) $mg->is_required,
                'items' => $mg->items->map(fn($item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'additional_price' => (float) $item->additional_price,
                ]),
            ]),
        ]);
    }

    /**
     * إضافة طبق / منتج جديد في المنيو (مع الأحجام والإضافات في Transaction ذرية)
     */
    public function store(SaveProductRequest $request): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();
        $validated = $request->validated();

        $product = DB::transaction(function () use ($merchant, $validated, $request) {
            $categoryId = $validated['category_id'] ?? null;
            $catName = $request->input('category_name') ?? $request->input('category');
            if (!$categoryId && !empty($catName)) {
                $category = Category::where(function ($q) use ($merchant) {
                    $q->whereNull('merchant_id')->orWhere('merchant_id', $merchant->id);
                })->where('name', $catName)->first();

                if (!$category) {
                    $category = Category::create([
                        'merchant_id' => $merchant->id,
                        'name' => $catName,
                        'is_active' => true,
                    ]);
                }
                $categoryId = $category->id;
            }

            // 1. إنشاء الطبق الأساسي
            $product = Product::create([
                'merchant_id' => $merchant->id,
                'category_id' => $categoryId,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'base_price' => $validated['base_price'],
                'image_url' => $validated['image_url'] ?? null,
                'is_available' => $validated['is_available'] ?? true,
                'prep_time_minutes' => $validated['prep_time_minutes'] ?? $merchant->preparation_time_minutes,
                'servings_count' => $validated['servings_count'] ?? '3-4 أفراد',
                'requires_preorder' => $validated['requires_preorder'] ?? false,
            ]);

            // 2. إنشاء الأحجام والخيارات إذا وُجدت
            if (!empty($validated['variants'])) {
                foreach ($validated['variants'] as $index => $variant) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'name' => $variant['name'],
                        'price' => $variant['price'],
                        'is_available' => true,
                        'sort_order' => $index,
                    ]);
                }
            }

            // 3. ربط مجموعات الإضافات
            if (!empty($validated['modifier_group_ids'])) {
                $product->modifierGroups()->sync($validated['modifier_group_ids']);
            }

            return $product;
        });

        // إعادة تحميل الطبق بكامل علاقاته المحسنة
        $product->load(['category', 'variants', 'modifierGroups.items']);

        return response()->json([
            'success' => true,
            'message' => 'تمت إضافة الطبق لقائمتك بنجاح! 🍲',
            'product' => $product,
        ], 201);
    }

    /**
     * تحديث طبق موجود في المنيو
     */
    public function update(SaveProductRequest $request, string $id): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();

        $product = Product::where('merchant_id', $merchant->id)->where('id', $id)->firstOrFail();
        $validated = $request->validated();

        DB::transaction(function () use ($product, $merchant, $validated, $request) {
            $categoryId = $validated['category_id'] ?? null;
            $catName = $request->input('category_name') ?? $request->input('category');
            if (!$categoryId && !empty($catName)) {
                $category = Category::where(function ($q) use ($merchant) {
                    $q->whereNull('merchant_id')->orWhere('merchant_id', $merchant->id);
                })->where('name', $catName)->first();

                if (!$category) {
                    $category = Category::create([
                        'merchant_id' => $merchant->id,
                        'name' => $catName,
                        'is_active' => true,
                    ]);
                }
                $categoryId = $category->id;
            }

            $product->update([
                'category_id' => $categoryId ?? $product->category_id,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? $product->description,
                'base_price' => $validated['base_price'],
                'image_url' => $validated['image_url'] ?? $product->image_url,
                'is_available' => $validated['is_available'] ?? $product->is_available,
                'prep_time_minutes' => $validated['prep_time_minutes'] ?? $product->prep_time_minutes,
                'servings_count' => $validated['servings_count'] ?? $product->servings_count,
                'requires_preorder' => $validated['requires_preorder'] ?? $product->requires_preorder,
            ]);

            // تحديث الأحجام
            if (isset($validated['variants'])) {
                $product->variants()->delete();
                foreach ($validated['variants'] as $index => $variant) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'name' => $variant['name'],
                        'price' => $variant['price'],
                        'is_available' => true,
                        'sort_order' => $index,
                    ]);
                }
            }

            // تحديث الإضافات
            if (isset($validated['modifier_group_ids'])) {
                $product->modifierGroups()->sync($validated['modifier_group_ids']);
            }
        });

        $product->load(['category', 'variants', 'modifierGroups.items']);

        return response()->json([
            'success' => true,
            'message' => 'تم حفظ تعديلات الطبق بنجاح.',
            'product' => $product,
        ]);
    }

    /**
     * تبديل سريع لحالة التوفر (متاح اليوم / غير متاح) بضغطة واحدة من الجدول
     */
    public function toggleAvailability(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();

        $product = Product::where('merchant_id', $merchant->id)->where('id', $id)->firstOrFail();

        $product->update([
            'is_available' => !$product->is_available,
        ]);

        return response()->json([
            'success' => true,
            'message' => $product->is_available ? 'الطبق متاح الآن للطلب! 🟢' : 'تم تعيين الطبق كـ غير متاح اليوم ⚪',
            'is_available' => (bool) $product->is_available,
        ]);
    }

    /**
     * حذف طبق من القائمة
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();

        $product = Product::where('merchant_id', $merchant->id)->where('id', $id)->firstOrFail();
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم حذف الطبق من القائمة بنجاح.',
        ]);
    }

    /**
     * رفع صورة طبق طعام
     */
    public function uploadImage(UploadDishImageRequest $request): JsonResponse
    {
        $file = $request->file('image');
        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = 'dish_' . Str::random(12) . '.' . $extension;

        // تخزين في قرص public (storage/app/public/dishes) ليكون متاحاً عبر symlink
        $path = $file->storeAs('dishes', $filename, 'public');
        $publicUrl = Storage::disk('public')->url($path);
        $absoluteUrl = url($publicUrl);

        return response()->json([
            'success' => true,
            'url' => $absoluteUrl,
            'image_url' => $absoluteUrl,
        ]);
    }
}
