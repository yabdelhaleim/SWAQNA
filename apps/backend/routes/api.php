<?php

use App\Http\Controllers\Api\v1\Merchant\AuthController as MerchantAuthController;
use App\Http\Controllers\Api\v1\Merchant\MenuController as MerchantMenuController;
use App\Http\Controllers\Api\v1\Merchant\OrderController as MerchantOrderController;
use App\Http\Controllers\Api\v1\Merchant\ReelController as MerchantReelController;
use App\Http\Controllers\Api\v1\Merchant\SettingsController as MerchantSettingsController;
use App\Http\Controllers\Api\v1\Merchant\WalletController as MerchantWalletController;
use App\Http\Controllers\Api\v1\Customer\OrderController as CustomerOrderController;
use App\Http\Controllers\Api\v1\Customer\ReelInteractionController;
use App\Http\Controllers\Api\v1\Customer\AddressController;
use App\Http\Controllers\Api\v1\Customer\CouponController;
use App\Http\Controllers\Api\v1\Customer\NotificationController;
use App\Http\Controllers\Api\v1\Customer\ReviewController;
use App\Http\Controllers\Api\v1\Customer\ProfileController;
use App\Http\Controllers\Api\v1\Customer\ReelCommentController;
use App\Http\Controllers\Api\v1\PublicFeedController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// مصادقة قنوات البث المباشر (WebSockets Channels Authentication with Sanctum)
Broadcast::routes(['middleware' => ['auth:sanctum']]);

/*
|--------------------------------------------------------------------------
| API Routes - منصة حواديت (Hawadeet Platform)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // فحص صحة وجاهزية السيرفر
    Route::get('/health', function () {
        return response()->json([
            'status' => 'healthy',
            'app' => 'Hawadeet API',
            'version' => '1.0.0',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // مسارات مصادقة العميل (Customer Mobile Auth API)
    Route::prefix('auth')->group(function () {
        Route::post('/send-otp', function (Request $request) {
            $phone = $request->input('phone') ?? $request->input('phone_number');
            $code = '1234';

            // اكتشف لو المستخدم موجود أم لا
            $isNewUser = !\App\Models\User::where('phone_number', $phone)->exists();

            return response()->json([
                'success'    => true,
                'message'    => 'تم إرسال كود التحقق بنجاح',
                'debug_code' => $code,
                'code'       => $code,
                'is_new_user' => $isNewUser,
            ]);
        });

        Route::post('/verify-otp', function (Request $request) {
            $phone = $request->input('phone') ?? $request->input('phone_number');
            $code = $request->input('otp') ?? $request->input('code');

            $user = \App\Models\User::firstOrCreate(
                ['phone_number' => $phone ?: '01000000000'],
                [
                    'full_name' => 'عميل سوقنا',
                    'role' => \App\Enums\UserRole::CUSTOMER ?? 'customer',
                    'is_active' => true,
                    'is_phone_verified' => true,
                ]
            );

            $token = $user->createToken('customer-token')->plainTextToken;

            return response()->json([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->full_name,
                    'phone' => $user->phone_number,
                ],
            ]);
        });
    });

    // تغذية الريلز العامة والاستكشاف والبحث والمتاجر (Public Mobile Feeds)
    Route::get('/reels', [PublicFeedController::class, 'reels']);
    Route::get('/explore', [PublicFeedController::class, 'explore']);
    Route::get('/search', [PublicFeedController::class, 'search']);
    Route::get('/merchants/{id}', [PublicFeedController::class, 'merchantDetails']);
    Route::get('/products/{id}', [PublicFeedController::class, 'productDetails']);

    // ─── تعليقات الريلز العامة (قراءة بدون توكن) ───────────────────────────
    Route::get('/reels/{id}/comments', [ReelCommentController::class, 'index']);

    // =========================================================================
    // مسارات تطبيق العميل (Customer Mobile API)
    // =========================================================================
    Route::middleware('auth:sanctum')->group(function () {
        // تفاعل الريلز: لايك وحفظ ومفضلة
        Route::post('/reels/{id}/like', [ReelInteractionController::class, 'toggleLike']);
        Route::post('/reels/{id}/save', [ReelInteractionController::class, 'toggleSave']);
        Route::get('/customer/favorites', [ReelInteractionController::class, 'favorites']);

        // تعليقات الريلز (نشر + حذف + إعجاب — requires auth)
        Route::post('/reels/{id}/comments', [ReelCommentController::class, 'store']);
        Route::delete('/comments/{id}', [ReelCommentController::class, 'destroy']);
        Route::post('/comments/{id}/like', [ReelCommentController::class, 'toggleLike']);

        // طلبات العميل
        Route::prefix('customer')->group(function () {
            Route::get('/orders', [CustomerOrderController::class, 'index']);
            Route::post('/orders', [CustomerOrderController::class, 'store']);
            Route::get('/orders/{id}', [CustomerOrderController::class, 'show']);
            Route::post('/orders/{id}/cancel', [CustomerOrderController::class, 'cancel']);

            // دفتر العناوين المحفوظة (Customer Address Book)
            Route::get('/addresses', [AddressController::class, 'index']);
            Route::post('/addresses', [AddressController::class, 'store']);
            Route::put('/addresses/{id}', [AddressController::class, 'update']);
            Route::delete('/addresses/{id}', [AddressController::class, 'destroy']);
            Route::post('/addresses/{id}/set-default', [AddressController::class, 'setDefault']);

            // كوبونات الخصم (Promo Codes & Coupons)
            Route::post('/coupons/validate', [CouponController::class, 'validateCoupon']);

            // تقييم الطلب (Order Reviews & Ratings)
            Route::post('/orders/{id}/review', [ReviewController::class, 'store']);
            Route::get('/orders/{id}/review', [ReviewController::class, 'show']);

            // مركز الإشعارات (In-App Notifications Center)
            Route::get('/notifications', [NotificationController::class, 'index']);
            Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
            Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);

            // الملف الشخصي للعميل (Customer Profile)
            Route::get('/profile', [ProfileController::class, 'show']);
            Route::put('/profile', [ProfileController::class, 'update']);
        });
    });

    // POST /auth/register — تسجيل عميل جديد بعد التحقق من OTP
    Route::post('/auth/register', function (Request $request) {
        $request->validate([
            'name'  => 'required|string|min:2',
            'phone' => 'required|string',
            'otp'   => 'required|string',
        ]);

        $user = \App\Models\User::firstOrCreate(
            ['phone_number' => $request->phone],
            [
                'full_name'         => $request->name,
                'role'              => 'customer',
                'is_active'         => true,
                'is_phone_verified' => true,
            ]
        );

        // لو اليوزر موجود — اپديت الاسم
        if (!$user->wasRecentlyCreated) {
            $user->full_name = $request->name;
            $user->save();
        }

        $token = $user->createToken('customer-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->full_name,
                'phone' => $user->phone_number,
            ],
        ]);
    });

    // إصلاح send-otp: يكتشف لو المستخدم جديد
    // (استبدال الـ closure الموجودة أعلاه)

    // =========================================================================
    // مسارات لوحة تحكم التاجر (Merchant Dashboard API)
    // =========================================================================
    Route::prefix('merchant')->group(function () {

        // مصادقة ودخول التاجر (عامة بدون توكن)
        Route::prefix('auth')->group(function () {
            Route::post('/send-otp', [MerchantAuthController::class, 'sendOtp']);
            Route::post('/verify-otp', [MerchantAuthController::class, 'verifyOtp']);

            // مسارات التاجر المحمية بـ Sanctum و EnsureUserIsMerchant Middleware
            Route::middleware(['auth:sanctum', 'merchant'])->group(function () {
                Route::post('/register-store', [MerchantAuthController::class, 'registerStore']);
                Route::get('/me', [MerchantAuthController::class, 'me']);
                Route::post('/logout', [MerchantAuthController::class, 'logout']);
            });
        });

        // إعدادات المتجر وساعات العمل والتشغيل (محمية بـ Sanctum و EnsureUserIsMerchant)
        Route::prefix('settings')->middleware(['auth:sanctum', 'merchant'])->group(function () {
            Route::get('/', [MerchantSettingsController::class, 'getSettings']);
            Route::put('/profile', [MerchantSettingsController::class, 'updateProfile']);
            Route::post('/media', [MerchantSettingsController::class, 'uploadMedia']);
            Route::put('/business-hours', [MerchantSettingsController::class, 'updateBusinessHours']);
            Route::post('/fulfillment-request', [MerchantSettingsController::class, 'requestFulfillmentChange']);
        });

        // إدارة قائمة الطعام والمنتجات (Menu & Products Catalog)
        Route::prefix('menu')->middleware(['auth:sanctum', 'merchant'])->group(function () {
            Route::get('/', [MerchantMenuController::class, 'index']);
            Route::post('/products', [MerchantMenuController::class, 'store']);
            Route::put('/products/{id}', [MerchantMenuController::class, 'update']);
            Route::patch('/products/{id}/toggle-availability', [MerchantMenuController::class, 'toggleAvailability']);
            Route::delete('/products/{id}', [MerchantMenuController::class, 'destroy']);
            Route::post('/upload-image', [MerchantMenuController::class, 'uploadImage']);
        });

        // إدارة الطلبات (Order Management)
        Route::prefix('orders')->middleware(['auth:sanctum', 'merchant'])->group(function () {
            Route::get('/', [MerchantOrderController::class, 'index']);
            Route::get('/stats', [MerchantOrderController::class, 'stats']);
            Route::post('/create-test-order', [MerchantOrderController::class, 'createTestOrder']);
            Route::get('/{id}', [MerchantOrderController::class, 'show']);
            Route::post('/{id}/accept', [MerchantOrderController::class, 'accept']);
            Route::post('/{id}/reject', [MerchantOrderController::class, 'reject']);
            Route::patch('/{id}/ready', [MerchantOrderController::class, 'markReady']);
            Route::patch('/{id}/delivered', [MerchantOrderController::class, 'markDelivered']);
        });

        // إدارة الفيديوهات والريلز (Reels Management)
        Route::prefix('reels')->group(function () {
            Route::get('/', [MerchantReelController::class, 'index']);
            Route::post('/', [MerchantReelController::class, 'store']);
            Route::get('/{id}', [MerchantReelController::class, 'show']);
            Route::patch('/{id}/toggle-status', [MerchantReelController::class, 'toggleStatus']);
            Route::delete('/{id}', [MerchantReelController::class, 'destroy']);
        });

        // إدارة المحفظة والأرباح وسحب المستحقات (Merchant Wallet & Payouts)
        Route::prefix('wallet')->middleware(['auth:sanctum', 'merchant'])->group(function () {
            Route::get('/', [MerchantWalletController::class, 'index']);
            Route::get('/transactions', [MerchantWalletController::class, 'transactions']);
            Route::post('/withdraw', [MerchantWalletController::class, 'withdraw']);
        });

    });

});
