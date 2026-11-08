<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class MenuCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'طواجن', 'sort_order' => 1, 'icon_url' => '🍲'],
            ['name' => 'محاشي', 'sort_order' => 2, 'icon_url' => '🥬'],
            ['name' => 'أطباق رئيسية', 'sort_order' => 3, 'icon_url' => '🥘'],
            ['name' => 'مشويات', 'sort_order' => 4, 'icon_url' => '🥩'],
            ['name' => 'حلويات', 'sort_order' => 5, 'icon_url' => '🍯'],
            ['name' => 'مقبلات وسلطات', 'sort_order' => 6, 'icon_url' => '🥗'],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(
                ['name' => $cat['name'], 'merchant_id' => null],
                [
                    'sort_order' => $cat['sort_order'],
                    'icon_url' => $cat['icon_url'],
                    'is_active' => true,
                ]
            );
        }
    }
}
