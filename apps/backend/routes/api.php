<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - منصة حواديت
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // Health check endpoint
    Route::get('/health', function () {
        return response()->json([
            'status' => 'healthy',
            'app' => 'Hawadeet API',
            'version' => '1.0.0',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // Authenticated user
    Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
        return response()->json([
            'user' => $request->user()->load(['addresses', 'wallet']),
        ]);
    });

    // Modules placeholders
    // Route::prefix('auth')->group(...);
    // Route::prefix('merchants')->group(...);
    // Route::prefix('reels')->group(...);
    // Route::prefix('orders')->group(...);
    // Route::prefix('wallet')->group(...);
});
