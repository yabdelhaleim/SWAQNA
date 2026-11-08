<?php

namespace App\Http\Controllers\Api\v1\Merchant;

use App\Enums\FulfillmentRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Merchant\RequestFulfillmentChangeRequest;
use App\Http\Requests\Merchant\UpdateBusinessHoursRequest;
use App\Http\Requests\Merchant\UpdateProfileRequest;
use App\Http\Requests\Merchant\UploadMediaRequest;
use App\Models\Merchant;
use App\Models\MerchantBusinessHour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SettingsController extends Controller
{
    /**
     * جلب إعدادات المتجر الكاملة مع العلاقات الضرورية عبر Eager Loading لحل مشكلة N+1
     */
    public function getSettings(Request $request): JsonResponse
    {
        $user = $request->user();

        // استخدام with() للـ Eager Loading: جلب المتجر، ساعات العمل الـ 7، المحفظة، وبيانات المالك
        // في استعلامات محسنة ومنفصلة (O(1) queries instead of O(N))
        $merchant = Merchant::with(['businessHours', 'wallet', 'owner'])
            ->where('owner_id', $user->id)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $merchant->id,
                'name' => $merchant->name,
                'slug' => $merchant->slug,
                'merchant_type' => $merchant->merchant_type,
                'status' => $merchant->status,
                'phone_number' => $merchant->phone_number,
                'logo_url' => $merchant->logo_url,
                'cover_image_url' => $merchant->cover_image_url,
                'address_text' => $merchant->address_text,
                'preparation_time_minutes' => $merchant->preparation_time_minutes,
                'min_order_amount' => (float) $merchant->min_order_amount,
                'delivery_radius_km' => (float) $merchant->delivery_radius_km,
                'fulfillment_type' => $merchant->fulfillment_type,
                'fulfillment_request_status' => $merchant->fulfillment_request_status,
                'requested_fulfillment_type' => $merchant->requested_fulfillment_type,
                'fulfillment_request_notes' => $merchant->fulfillment_request_notes,
                'is_open_now' => $merchant->isOpenNow(),
                'avg_rating' => (float) $merchant->avg_rating,
                'total_reviews' => $merchant->total_reviews,
                'owner' => [
                    'id' => $merchant->owner->id,
                    'full_name' => $merchant->owner->full_name,
                    'phone_number' => $merchant->owner->phone_number,
                ],
                'wallet' => $merchant->wallet ? [
                    'id' => $merchant->wallet->id,
                    'balance' => (float) $merchant->wallet->balance,
                    'locked_amount' => (float) $merchant->wallet->locked_amount,
                    'currency' => $merchant->wallet->currency,
                ] : null,
                'business_hours' => $merchant->businessHours->sortBy('day_of_week')->values()->map(fn($h) => [
                    'day_of_week' => $h->day_of_week,
                    'open_time' => substr($h->open_time, 0, 5),
                    'close_time' => substr($h->close_time, 0, 5),
                    'is_closed' => (bool) $h->is_closed,
                ]),
            ],
        ]);
    }

    /**
     * تحديث الملف الشخصي للمتجر والبيانات التشغيلية
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();

        $merchant->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث بيانات المتجر بنجاح.',
            'data' => [
                'name' => $merchant->name,
                'address_text' => $merchant->address_text,
                'preparation_time_minutes' => $merchant->preparation_time_minutes,
                'min_order_amount' => (float) $merchant->min_order_amount,
                'delivery_radius_km' => (float) $merchant->delivery_radius_km,
            ],
        ]);
    }

    /**
     * رفع الشعار أو صورة الغلاف للمتجر
     */
    public function uploadMedia(UploadMediaRequest $request): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();

        $file = $request->file('image');
        $type = $request->validated('type'); // 'logo' or 'cover'

        $extension = $file->getClientOriginalExtension() ?: 'png';
        $filename = "merchant_{$merchant->id}_{$type}_" . Str::random(8) . ".{$extension}";

        $path = $file->storeAs("public/merchants/{$type}s", $filename);
        $publicUrl = Storage::url($path);

        if ($type === 'logo') {
            $merchant->update(['logo_url' => $publicUrl]);
        } else {
            $merchant->update(['cover_image_url' => $publicUrl]);
        }

        return response()->json([
            'success' => true,
            'message' => $type === 'logo' ? 'تم تحديث شعار المتجر بنجاح.' : 'تم تحديث غلاف المتجر بنجاح.',
            'url' => $publicUrl,
        ]);
    }

    /**
     * تحديث أوقات وساعات العمل الأسبوعية (معاملة ذرية Transaction)
     */
    public function updateBusinessHours(UpdateBusinessHoursRequest $request): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();

        $hours = $request->validated('hours');

        DB::transaction(function () use ($merchant, $hours) {
            foreach ($hours as $hourData) {
                MerchantBusinessHour::updateOrCreate(
                    [
                        'merchant_id' => $merchant->id,
                        'day_of_week' => $hourData['day_of_week'],
                    ],
                    [
                        'open_time' => $hourData['open_time'],
                        'close_time' => $hourData['close_time'],
                        'is_closed' => $hourData['is_closed'],
                    ]
                );
            }
        });

        // إعادة جلب ساعات العمل المحدثة بـ Eager Loading
        $updatedHours = MerchantBusinessHour::where('merchant_id', $merchant->id)
            ->orderBy('day_of_week')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'تم حفظ مواعيد العمل الأسبوعية بنجاح.',
            'business_hours' => $updatedHours->map(fn($h) => [
                'day_of_week' => $h->day_of_week,
                'open_time' => substr($h->open_time, 0, 5),
                'close_time' => substr($h->close_time, 0, 5),
                'is_closed' => (bool) $h->is_closed,
            ]),
        ]);
    }

    /**
     * طلب تغيير نظام التوصيل (مثل التقديم على التوصيل عبر كباتن منصة حواديت)
     */
    public function requestFulfillmentChange(RequestFulfillmentChangeRequest $request): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();

        $requestedType = $request->validated('requested_fulfillment_type');
        $notes = $request->validated('notes');

        // إذا كان المتجر بالفعل على هذا النظام
        if ($merchant->fulfillment_type->value === $requestedType) {
            return response()->json([
                'success' => false,
                'message' => 'المتجر يعمل بالفعل بنظام التوصيل المحدد.',
            ], 422);
        }

        // إذا كان هناك طلب قيد المراجعة بالفعل
        if ($merchant->fulfillment_request_status === FulfillmentRequestStatus::PENDING_APPROVAL) {
            return response()->json([
                'success' => false,
                'message' => 'لديك طلب تغيير نظام التوصيل قيد المراجعة حالياً من قبل الإدارة.',
            ], 409);
        }

        $merchant->update([
            'fulfillment_request_status' => FulfillmentRequestStatus::PENDING_APPROVAL,
            'requested_fulfillment_type' => $requestedType,
            'fulfillment_request_notes' => $notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إرسال طلب اعتماد التوصيل للإدارة بنجاح، وستتم مراجعته والتواصل معك قريباً.',
            'data' => [
                'current_fulfillment_type' => $merchant->fulfillment_type,
                'requested_fulfillment_type' => $merchant->requested_fulfillment_type,
                'status' => $merchant->fulfillment_request_status,
            ],
        ]);
    }
}
