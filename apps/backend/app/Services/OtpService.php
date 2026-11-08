<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class OtpService
{
    // مدة صلاحية الكود: دقيقتان ونصف (150 ثانية) بناءً على الاتفاق
    protected int $ttlSeconds = 150;

    // مهلة منع إعادة الإرسال: 60 ثانية لمنع استنزاف الرسائل
    protected int $resendThrottleSeconds = 60;

    // أقصى عدد للمحاولات الخاطئة قبل القفل
    protected int $maxAttempts = 5;

    // مدة القفل بعد 5 محاولات خاطئة: 15 دقيقة (900 ثانية)
    protected int $lockoutSeconds = 900;

    /**
     * إرسال وتوليد كود الـ OTP وحفظه في الكاش الموزع (Redis)
     */
    public function sendOtp(string $phone): array
    {
        $normalizedPhone = $this->normalizePhone($phone);

        // 1. فحص هل الرقم مقفول بسبب محاولات تخمين سابقة؟
        $lockKey = "otp:locked:{$normalizedPhone}";
        if (Cache::has($lockKey)) {
            throw new Exception("تم قفل هذا الرقم لكثرة المحاولات الخاطئة. يرجى المحاولة بعد 15 دقيقة.", 429);
        }

        // 2. فحص هل مرت 60 ثانية منذ آخر طلب؟ (Throttle)
        $throttleKey = "otp:throttle:{$normalizedPhone}";
        if (Cache::has($throttleKey)) {
            throw new Exception("يرجى الانتظار 60 ثانية قبل طلب كود جديد.", 429);
        }

        // 3. توليد كود عشوائي من 4 أرقام
        $code = (string) random_int(1000, 9999);

        // 4. حفظ الكود في Redis مع مؤقت انتهاء 150 ثانية
        $codeKey = "otp:code:{$normalizedPhone}";
        Cache::put($codeKey, $code, $this->ttlSeconds);

        // 5. تفعيل مؤقت منع إعادة الإرسال لمدة 60 ثانية
        Cache::put($throttleKey, true, $this->resendThrottleSeconds);

        // 6. في بيئة التطوير (Local): نسجل الكود في الـ Log ونرجعه للتجربة
        Log::info("🔑 [Hawadeet OTP] Phone: {$normalizedPhone} | Code: {$code} | Expires in: {$this->ttlSeconds}s");

        return [
            'success' => true,
            'message' => 'تم إرسال كود التحقق بنجاح.',
            'expires_in_seconds' => $this->ttlSeconds,
            'resend_in_seconds' => $this->resendThrottleSeconds,
            // متاح في بيئة التطوير والاختبارات لسهولة التيست
            'debug_code' => (app()->isLocal() || app()->environment('testing')) ? $code : null,
        ];
    }

    /**
     * التحقق من صحة كود الـ OTP
     */
    public function verifyOtp(string $phone, string $code): bool
    {
        $normalizedPhone = $this->normalizePhone($phone);
        $lockKey = "otp:locked:{$normalizedPhone}";
        $attemptsKey = "otp:attempts:{$normalizedPhone}";
        $codeKey = "otp:code:{$normalizedPhone}";

        // 1. هل الرقم محظور مؤقتاً؟
        if (Cache::has($lockKey)) {
            throw new Exception("هذا الرقم محظور مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة لاحقاً.", 429);
        }

        // 2. هل الكود موجود؟
        $storedCode = Cache::get($codeKey);
        if (!$storedCode) {
            throw new Exception("انتهت صلاحية كود التحقق أو أنه غير موجود. اطلب كوداً جديداً.", 422);
        }

        // 3. مطابقة الكود
        if ($storedCode !== $code) {
            // زيادة عدد المحاولات الخاطئة
            $attempts = (int) Cache::get($attemptsKey, 0) + 1;
            Cache::put($attemptsKey, $attempts, $this->ttlSeconds);

            if ($attempts >= $this->maxAttempts) {
                // قفل الرقم لمدة 15 دقيقة وحذف الكود
                Cache::put($lockKey, true, $this->lockoutSeconds);
                Cache::forget($codeKey);
                Cache::forget($attemptsKey);
                throw new Exception("تجاوزت الحد الأقصى للمحاولات الخاطئة (5 محاولات). تم قفل الرقم لمدة 15 دقيقة.", 429);
            }

            $remainingAttempts = $this->maxAttempts - $attempts;
            throw new Exception("كود التحقق غير صحيح. متبقي لك {$remainingAttempts} محاولات.", 422);
        }

        // 4. الكود صحيح 100% -> مسح الكود ومسح المحاولات من الذاكرة
        Cache::forget($codeKey);
        Cache::forget($attemptsKey);

        return true;
    }

    /**
     * توحيد صيغة رقم الهاتف
     */
    protected function normalizePhone(string $phone): string
    {
        $cleaned = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($cleaned, '20')) {
            $cleaned = substr($cleaned, 2);
        }
        if (!str_starts_with($cleaned, '0')) {
            $cleaned = '0' . $cleaned;
        }
        return $cleaned;
    }
}
