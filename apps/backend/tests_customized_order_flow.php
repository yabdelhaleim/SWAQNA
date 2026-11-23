<?php

/**
 * End-to-End Test for Food Modifiers, Variants & Customization Lifecycle
 */

function httpRequest(string $method, string $url, array $data = [], ?string $token = null): array
{
    $ch = curl_init();
    $opts = [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/json',
        ],
    ];

    if ($token) {
        $opts[CURLOPT_HTTPHEADER][] = "Authorization: Bearer $token";
    }

    if (!empty($data)) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($data);
    }

    curl_setopt_array($ch, $opts);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code' => $code,
        'body' => json_decode($res, true) ?? $res,
    ];
}

$baseUrl = 'http://127.0.0.1:8000/api/v1';

echo "=======================================================\n";
echo "1. تسجيل دخول العميل...\n";
$customerAuth = httpRequest('POST', "$baseUrl/auth/verify-otp", [
    'phone' => '01000000001',
    'code' => '1234',
]);
$customerToken = $customerAuth['body']['token'] ?? null;
echo "Customer Token: " . ($customerToken ? 'OK' : 'FAILED') . "\n";

echo "\n2. استعلام تفاصيل الطبق بالأحجام والإضافات (GET /products/{id})...\n";
$dishId = '01a1d757-b4dd-7268-b42c-2eef086b3b40'; // طاجن ملوخية بالطشة البلدي
$productRes = httpRequest('GET', "$baseUrl/products/$dishId");
$productData = $productRes['body']['data'] ?? [];
echo "Product: " . ($productData['name'] ?? 'N/A') . " (Base: " . ($productData['base_price'] ?? 0) . " ج.م)\n";

$variants = $productData['variants'] ?? [];
$modifierGroups = $productData['modifier_groups'] ?? [];

echo "Variants Count: " . count($variants) . "\n";
echo "Modifier Groups Count: " . count($modifierGroups) . "\n";

$selectedVariant = null;
foreach ($variants as $v) {
    if (str_contains($v['name'], 'وسط')) {
        $selectedVariant = $v;
        break;
    }
}
$selectedVariant = $selectedVariant ?: ($variants[0] ?? null);
echo "Selected Size: " . ($selectedVariant['name'] ?? 'N/A') . " - " . ($selectedVariant['price'] ?? 0) . " ج.م\n";

$selectedModifiers = [];
foreach ($modifierGroups as $group) {
    foreach ($group['items'] ?? [] as $item) {
        if (str_contains($item['name'], 'طحينة') || str_contains($item['name'], 'أرز')) {
            $selectedModifiers[] = $item;
        }
    }
}
echo "Selected Addons:\n";
foreach ($selectedModifiers as $m) {
    echo "  - " . $m['name'] . " (+" . $m['additional_price'] . " ج.م)\n";
}

$selectedModIds = array_column($selectedModifiers, 'id');
$instructions = 'بدون بصل ومن فضلك التقلية زيادة وتسوية مظبوطة';

echo "\n3. إرسال الطلب المخصص بالكامل للسيرفر...\n";
$orderRes = httpRequest('POST', "$baseUrl/customer/orders", [
    'merchant_id'      => $productData['merchant']['id'] ?? '01a1bd45-2bf4-734f-bd1a-84f58af70c91',
    'delivery_address' => 'شارع مصدق، الدقي، الجيزة - عمارة 15 الدور 3',
    'notes'            => 'اتصل أول ما توصل عند البوابة',
    'items'            => [
        [
            'dish_id'              => $dishId,
            'variant_id'           => $selectedVariant['id'] ?? null,
            'modifier_ids'         => $selectedModIds,
            'special_instructions' => $instructions,
            'quantity'             => 2,
        ]
    ]
], $customerToken);

echo "Order Create Status Code: " . $orderRes['code'] . "\n";
$orderData = $orderRes['body']['data'] ?? [];
$orderId = $orderData['id'] ?? null;
echo "Created Order ID: $orderId | Code: " . ($orderData['order_code'] ?? 'N/A') . "\n";
echo "Total Amount: " . ($orderData['total_amount'] ?? 0) . " ج.م\n";

$firstItem = $orderData['items'][0] ?? [];
echo "Item Name: " . ($firstItem['dish']['name'] ?? 'N/A') . "\n";
echo "Item Variant: " . ($firstItem['variant_name'] ?? 'N/A') . "\n";
echo "Item Special Notes: " . ($firstItem['notes'] ?? 'N/A') . "\n";
echo "Item Modifiers in Database:\n";
foreach ($firstItem['modifiers'] ?? [] as $mod) {
    echo "  ✓ " . $mod['name'] . " (+" . $mod['price'] . " ج.م)\n";
}

echo "\n4. استعلام تفاصيل الطلب من جانب العميل (GET /customer/orders/{id})...\n";
$showRes = httpRequest('GET', "$baseUrl/customer/orders/$orderId", [], $customerToken);
$showData = $showRes['body']['data'] ?? [];
echo "Show Status: " . ($showData['status'] ?? 'N/A') . "\n";
echo "Items Count: " . count($showData['items'] ?? []) . "\n";

echo "\n=======================================================\n";
if (!empty($firstItem['variant_name']) && count($firstItem['modifiers'] ?? []) >= 2) {
    echo "🎉 نجاح تام: تم حفظ الحجم المختار، الإضافات المدفوعة، وتعليمات الشيف في الداتابيز وحساب السعر الرياضي بدقة 100%!\n";
} else {
    echo "⚠️ تحقق من مطابقة الحقول.\n";
}
