<?php

namespace Database\Seeders;

use App\Models\Merchant;
use App\Models\ModifierGroup;
use App\Models\ModifierItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductVariantsAndModifiersSeeder extends Seeder
{
    public function run(): void
    {
        $products = Product::all();

        foreach ($products as $product) {
            $basePrice = (float) $product->base_price;

            // 1. إنشاء أحجام الوجبة (Variants / Sizes)
            // إذا لم يكن لديه variants
            if ($product->variants()->count() === 0) {
                ProductVariant::create([
                    'product_id'   => $product->id,
                    'name'         => 'حجم فردي (شخص واحد)',
                    'price'        => $basePrice,
                    'is_available' => true,
                    'sort_order'   => 1,
                ]);

                ProductVariant::create([
                    'product_id'   => $product->id,
                    'name'         => 'حجم وسط (شخصين)',
                    'price'        => $basePrice + 35.00,
                    'is_available' => true,
                    'sort_order'   => 2,
                ]);

                ProductVariant::create([
                    'product_id'   => $product->id,
                    'name'         => 'حجم عائلي (3 - 4 أشخاص)',
                    'price'        => $basePrice + 75.00,
                    'is_available' => true,
                    'sort_order'   => 3,
                ]);
            }

            // 2. إنشاء مجموعة الإضافات للمتجر وربطها بالطبق
            $merchantId = $product->merchant_id;
            if (!$merchantId) continue;

            // مجموعة الإضافات والمقبلات
            $addonsGroup = ModifierGroup::firstOrCreate(
                [
                    'merchant_id' => $merchantId,
                    'name'        => 'إضافات ومقبلات جانبية 🥗',
                ],
                [
                    'is_required'   => false,
                    'min_selection' => 0,
                    'max_selection' => 5,
                ]
            );

            // عناصر مجموعة الإضافات
            $addons = [
                ['name' => 'أرز مصري بالشعيرية والسمن البلدي', 'price' => 20.00],
                ['name' => 'طحينة بلدي بالليمون والكمون', 'price' => 10.00],
                ['name' => 'مخلل بلدي مشكل مشطشط', 'price' => 12.00],
                ['name' => 'باذنجان مخلل بالدقة والثوم', 'price' => 15.00],
                ['name' => 'عيش بلدي طازة (4 أرغفة)', 'price' => 10.00],
            ];

            foreach ($addons as $idx => $addon) {
                ModifierItem::firstOrCreate(
                    [
                        'group_id' => $addonsGroup->id,
                        'name'     => $addon['name'],
                    ],
                    [
                        'additional_price' => $addon['price'],
                        'is_available'     => true,
                        'sort_order'       => $idx + 1,
                    ]
                );
            }

            // مجموعة درجة السبايسي (اختيار إجباري واحد)
            $spicyGroup = ModifierGroup::firstOrCreate(
                [
                    'merchant_id' => $merchantId,
                    'name'        => 'درجة الشطة 🌶️',
                ],
                [
                    'is_required'   => true,
                    'min_selection' => 1,
                    'max_selection' => 1,
                ]
            );

            $spicyOptions = [
                ['name' => 'بدون شطة (بارد تماماً)', 'price' => 0.00],
                ['name' => 'شطة خفيفة ومضبوطة', 'price' => 0.00],
                ['name' => 'سبايسي حار مع قرن فلفل حامي', 'price' => 5.00],
            ];

            foreach ($spicyOptions as $idx => $opt) {
                ModifierItem::firstOrCreate(
                    [
                        'group_id' => $spicyGroup->id,
                        'name'     => $opt['name'],
                    ],
                    [
                        'additional_price' => $opt['price'],
                        'is_available'     => true,
                        'sort_order'       => $idx + 1,
                    ]
                );
            }

            // ربط الطبق بالمجموعتين
            $product->modifierGroups()->syncWithoutDetaching([$addonsGroup->id, $spicyGroup->id]);
        }
    }
}
