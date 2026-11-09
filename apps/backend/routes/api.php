<?php

use App\Http\Controllers\Api\v1\Merchant\AuthController as MerchantAuthController;
use App\Http\Controllers\Api\v1\Merchant\MenuController as MerchantMenuController;
use App\Http\Controllers\Api\v1\Merchant\OrderController as MerchantOrderController;
use App\Http\Controllers\Api\v1\Merchant\ReelController as MerchantReelController;
use App\Http\Controllers\Api\v1\Merchant\SettingsController as MerchantSettingsController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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
        });

        // إدارة الفيديوهات والريلز (Reels Management)
        Route::prefix('reels')->middleware(['auth:sanctum', 'merchant'])->group(function () {
            Route::get('/', [MerchantReelController::class, 'index']);
            Route::post('/', [MerchantReelController::class, 'store']);
            Route::get('/{id}', [MerchantReelController::class, 'show']);
            Route::patch('/{id}/toggle-status', [MerchantReelController::class, 'toggleStatus']);
            Route::delete('/{id}', [MerchantReelController::class, 'destroy']);
        });

    });

});
