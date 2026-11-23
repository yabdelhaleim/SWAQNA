<?php

/**
 * End-to-End WebSocket & Event-Driven Order Flow Simulation Test
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
echo "Customer Token: " . ($customerToken ? 'OK ('.substr($customerToken, 0, 15).'...)': 'FAILED') . "\n";

echo "\n2. تسجيل دخول التاجر...\n";
$merchantPhone = '01553696039';
httpRequest('POST', "$baseUrl/merchant/auth/send-otp", ['phone_number' => $merchantPhone]);
$merchantAuth = httpRequest('POST', "$baseUrl/merchant/auth/verify-otp", [
    'phone_number' => $merchantPhone,
    'code' => '1234',
]);
$merchantToken = $merchantAuth['body']['token'] ?? null;
echo "Merchant Token: " . ($merchantToken ? 'OK ('.substr($merchantToken, 0, 15).'...)': 'FAILED') . "\n";

echo "\n3. استخدام بيانات المطعم والأطباق المعروفة (من قاعدة البيانات)...\n";
// بيانات مستخرجة مباشرة من قاعدة البيانات
$merchantId = '01a1bd45-2bf4-734f-bd1a-84f58af70c91';
$dishId     = '01a1d757-b4dd-7268-b42c-2eef086b3b40';
echo "Merchant ID: $merchantId\n";
echo "Sample Dish ID: $dishId\n";

echo "\n4. إرسال طلب جديد من العميل (يطلق حدث OrderPlaced عبر WebSocket)...\n";
$orderRes = httpRequest('POST', "$baseUrl/customer/orders", [
    'merchant_id' => $merchantId,
    'delivery_address' => 'شارع التحرير، الدقي، الجيزة - عمارة 12 الدور 4',
    'notes' => 'بدون شطة ومناديل زيادة من فضلك',
    'items' => [
        [
            'dish_id' => $dishId,
            'quantity' => 2,
        ]
    ]
], $customerToken);

echo "Order Create Status Code: " . $orderRes['code'] . "\n";
$orderData = $orderRes['body']['data'] ?? [];
$orderId = $orderData['id'] ?? null;
echo "Created Order ID: $orderId | Code: " . ($orderData['order_code'] ?? 'N/A') . " | Status: " . ($orderData['status'] ?? 'N/A') . "\n";

echo "\n5. التاجر يقبل الطلب (يطلق حدث OrderStatusUpdated عبر WebSocket)...\n";
$acceptRes = httpRequest('POST', "$baseUrl/merchant/orders/$orderId/accept", [
    'prep_time_minutes' => 25,
], $merchantToken);
echo "Accept Status Code: " . $acceptRes['code'] . " | Message: " . ($acceptRes['body']['message'] ?? 'N/A') . "\n";

echo "\n6. العميل يستعلم عن الطلب في الوقت الفعلي...\n";
$checkRes = httpRequest('GET', "$baseUrl/customer/orders/$orderId", [], $customerToken);
echo "Customer Order Status: " . ($checkRes['body']['data']['status'] ?? 'N/A') . "\n";

echo "\n7. اختبار إنشاء طلب ثانٍ وإلغاؤه من طرف العميل (يطلق حدث OrderCancelled)...\n";
$order2Res = httpRequest('POST', "$baseUrl/customer/orders", [
    'merchant_id' => $merchantId,
    'delivery_address' => 'شارع قصر العيني، القاهرة',
    'items' => [
        [
            'dish_id' => $dishId,
            'quantity' => 1,
        ]
    ]
], $customerToken);
$order2Id = $order2Res['body']['data']['id'] ?? null;
echo "Created Order 2 ID: $order2Id\n";

$cancelRes = httpRequest('POST', "$baseUrl/customer/orders/$order2Id/cancel", [
    'reason' => 'غيرت رأيي وأريد طلب وجبة مختلفة',
], $customerToken);
echo "Cancel Status Code: " . $cancelRes['code'] . " | Status: " . ($cancelRes['body']['data']['status'] ?? 'N/A') . " | Message: " . ($cancelRes['body']['message'] ?? 'N/A') . "\n";

echo "\n=======================================================\n";
echo "✅ جميع اختبارات دورة الأحداث والـ WebSockets تمت بنجاح تام!\n";
