<?php

namespace App\Http\Controllers\Api\v1\Merchant;

use App\Enums\DeliveryFulfillmentType;
use App\Enums\MerchantStatus;
use App\Enums\MerchantType;
use App\Enums\UserRole;
use App\Enums\WalletType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Merchant\RegisterStoreRequest;
use App\Http\Requests\Merchant\SendOtpRequest;
use App\Http\Requests\Merchant\VerifyOtpRequest;
use App\Models\Merchant;
use App\Models\User;
use App\Models\Wallet;
use App\Services\OtpService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(
        protected OtpService $otpService
    ) {}

    /**
     * إرسال كود الـ OTP لرقم هاتف التاجر
     */
    public function sendOtp(SendOtpRequest $request): JsonResponse
    {
        try {
            $result = $this->otpService->sendOtp($request->validated('phone_number'));

            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() >= 400 && $e->getCode() <= 500 ? $e->getCode() : 400);
        }
    }

    /**
     * التحقق من كود الـ OTP وتسجيل الدخول / إنشاء الحساب
     */
    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $phone = $request->validated('phone_number');
        $code = $request->validated('code');

        try {
            // 1. التحقق من صحة الكود عبر OtpService المحمي بـ Redis
            $this->otpService->verifyOtp($phone, $code);

            // 2. البحث عن المستخدم أو إنشاء حساب جديد بدور MERCHANT_OWNER
            $user = User::firstOrCreate(
                ['phone_number' => $phone],
                [
                    'full_name' => 'تاجر جديد',
                    'role' => UserRole::MERCHANT_OWNER,
                    'is_active' => true,
                    'is_phone_verified' => true,
                ]
            );

            // تحديث حالة التحقق من الهاتف إذا كان حساباً قديماً
            if (!$user->is_phone_verified) {
                $user->update(['is_phone_verified' => true]);
            }

            // 3. فحص هل المستخدم يمتلك متجراً بالفعل؟
            $merchant = Merchant::where('owner_id', $user->id)->first();
            $isNewMerchant = ($merchant === null);

            // 4. إصدار Token مشفر بواسطة Laravel Sanctum بصلاحية التاجر
            $token = $user->createToken('merchant-dashboard-token', ['merchant:access'])->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'تم تسجيل الدخول بنجاح.',
                'token' => $token,
                'is_new_merchant' => $isNewMerchant,
                'user' => [
                    'id' => $user->id,
                    'full_name' => $user->full_name,
                    'phone_number' => $user->phone_number,
                    'role' => $user->role,
                ],
                'merchant' => $merchant ? [
                    'id' => $merchant->id,
                    'name' => $merchant->name,
                    'slug' => $merchant->slug,
                    'merchant_type' => $merchant->merchant_type,
                    'status' => $merchant->status,
                    'logo_url' => $merchant->logo_url,
                ] : null,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() >= 400 && $e->getCode() <= 500 ? $e->getCode() : 400);
        }
    }

    /**
     * تسجيل بيانات المتجر الجديد (الخطوة الثانية للتاجر الجديد)
     */
    public function registerStore(RegisterStoreRequest $request): JsonResponse
    {
        $user = $request->user();

        // التأكد من أن التاجر ليس لديه متجر مسجل مسبقاً
        $existingMerchant = Merchant::where('owner_id', $user->id)->first();
        if ($existingMerchant) {
            return response()->json([
                'success' => false,
                'message' => 'لديك متجر مسجل بالفعل في منصة حواديت.',
                'merchant' => $existingMerchant,
            ], 409);
        }

        $validated = $request->validated();

        // توليد Slug فريد للمتجر
        $baseSlug = Str::slug($validated['store_name'], '-', 'ar');
        if (empty($baseSlug)) {
            $baseSlug = 'store-' . Str::random(6);
        }
        $slug = $baseSlug . '-' . substr(uniqid(), -4);

        // إحداثيات الموقع الافتراضية (القاهرة) إذا لم تُحدد
        $lat = $validated['latitude'] ?? 30.0444;
        $lng = $validated['longitude'] ?? 31.2357;

        $isPgsql = DB::connection()->getDriverName() === 'pgsql';
        $locationValue = $isPgsql
            ? DB::raw("ST_SetSRID(ST_MakePoint({$lng}, {$lat}), 4326)")
            : "POINT({$lng} {$lat})";

        return DB::transaction(function () use ($user, $validated, $slug, $locationValue) {
            // 1. إنشاء سجل المتجر
            $merchant = Merchant::create([
                'owner_id' => $user->id,
                'name' => $validated['store_name'],
                'slug' => $slug,
                'merchant_type' => $validated['merchant_type'],
                'phone_number' => $user->phone_number,
                'status' => MerchantStatus::PENDING_APPROVAL, // يحتاج موافقة الأدمن
                'fulfillment_type' => DeliveryFulfillmentType::PLATFORM_DELIVERY,
                'address_text' => $validated['address_text'],
                'location' => $locationValue,
                'preparation_time_minutes' => 30,
                'delivery_radius_km' => 10.0,
            ]);

            // 2. تحديث اسم المستخدم ليتطابق مع اسم مالك المحل
            if ($user->full_name === 'تاجر جديد') {
                $user->update(['full_name' => 'مالك ' . $validated['store_name']]);
            }

            // 3. فتح محفظة مالية للمتجر فوراً في جدول wallets
            Wallet::firstOrCreate(
                ['merchant_id' => $merchant->id],
                [
                    'wallet_type' => WalletType::MERCHANT,
                    'balance' => 0.00,
                    'locked_amount' => 0.00,
                    'currency' => 'EGP',
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'تم تسجيل متجرك بنجاح، وهو الآن في انتظار اعتماد الإدارة.',
                'merchant' => [
                    'id' => $merchant->id,
                    'name' => $merchant->name,
                    'slug' => $merchant->slug,
                    'merchant_type' => $merchant->merchant_type,
                    'status' => $merchant->status,
                    'address_text' => $merchant->address_text,
                ],
            ], 201);
        });
    }

    /**
     * جلب بيانات التاجر والمتجر الحالي المسجل
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->first();

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'full_name' => $user->full_name,
                'phone_number' => $user->phone_number,
                'role' => $user->role,
            ],
            'merchant' => $merchant ? [
                'id' => $merchant->id,
                'name' => $merchant->name,
                'slug' => $merchant->slug,
                'merchant_type' => $merchant->merchant_type,
                'status' => $merchant->status,
                'logo_url' => $merchant->logo_url,
                'cover_image_url' => $merchant->cover_image_url,
                'fulfillment_type' => $merchant->fulfillment_type,
                'avg_rating' => $merchant->avg_rating,
                'total_reviews' => $merchant->total_reviews,
            ] : null,
        ]);
    }

    /**
     * تسجيل الخروج وإبطال الـ Token الحالي فوراً
     */
    public function logout(Request $request): JsonResponse
    {
        // حذف التوكن الحالي الذي تم الطلب به
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الخروج وإبطال التوكن بنجاح.',
        ]);
    }
}
