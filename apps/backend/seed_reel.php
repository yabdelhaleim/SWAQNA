<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$merchant = \App\Models\Merchant::first();
if (!$merchant) {
    $user = \App\Models\User::firstOrCreate(
        ['phone_number' => '01012345678'],
        ['full_name' => 'الشيف أم أحمد', 'role' => \App\Enums\UserRole::MERCHANT_OWNER, 'is_active' => true, 'is_phone_verified' => true]
    );
    $merchant = \App\Models\Merchant::create([
        'id' => (string) \Illuminate\Support\Str::uuid(),
        'owner_id' => $user->id,
        'store_name' => 'مطبخ أم أحمد للأكل البيتي',
        'slug' => 'om-ahmed-kitchen-' . rand(100, 999),
        'phone_number' => '01012345678',
        'merchant_type' => \App\Enums\MerchantType::HOME_KITCHEN,
        'status' => \App\Enums\MerchantStatus::APPROVED,
        'is_verified' => true,
    ]);
}

// 1. Reel 1: طاجن ملوخية
$prod1 = \App\Models\Product::create([
    'id' => (string) \Illuminate\Support\Str::uuid(),
    'merchant_id' => $merchant->id,
    'name' => 'طاجن ملوخية بالطشة البلدي',
    'description' => 'أكل بيتي على أصوله بالسمن البلدي والتقلية الفلاحي',
    'base_price' => 95.00,
    'image_url' => 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
    'is_available' => true,
]);

$reel1 = \App\Models\Reel::create([
    'id' => (string) \Illuminate\Support\Str::uuid(),
    'merchant_id' => $merchant->id,
    'product_id' => $prod1->id,
    'title' => 'طريقة وسر طشة الملوخية بالتقلية البلدي 🍲',
    'caption' => 'شوفوا الطشة بالسمنة البلدي ريحتها جابت آخر الشارع! 😍 اطلب طاجنك سخن ومتحمر #سوقنا #أكل_بيتي',
    'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'thumbnail_url' => 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
    'duration_seconds' => 28,
    'views_count' => 14250,
    'likes_count' => 3820,
    'is_active' => true,
]);

// 2. Reel 2: كباب حلة
$prod2 = \App\Models\Product::create([
    'id' => (string) \Illuminate\Support\Str::uuid(),
    'merchant_id' => $merchant->id,
    'name' => 'طاجن لحمة بالبصل المكرمل',
    'description' => 'قطع لحم كندوز مع صوص بصل مكرمل على نار هادية في الفرن البلدي',
    'base_price' => 165.00,
    'image_url' => 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    'is_available' => true,
]);

$reel2 = \App\Models\Reel::create([
    'id' => (string) \Illuminate\Support\Str::uuid(),
    'merchant_id' => $merchant->id,
    'product_id' => $prod2->id,
    'title' => 'طاجن كباب حلة بالبصل المكرمل دايب دوب 🥩',
    'caption' => 'قطع لحمة دايبة مع تغميسة بصل كراميل تستاهل بؤك! اطلب الآن مع رز معمر سخن #سوقنا',
    'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    'thumbnail_url' => 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    'duration_seconds' => 30,
    'views_count' => 8400,
    'likes_count' => 2190,
    'is_active' => true,
]);

echo "SUCCESS! Created Reels: " . $reel1->id . " and " . $reel2->id . "\n";
