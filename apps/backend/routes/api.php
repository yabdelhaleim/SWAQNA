<?php

use App\Http\Controllers\Api\v1\Merchant\AuthController as MerchantAuthController;
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

    });

});
