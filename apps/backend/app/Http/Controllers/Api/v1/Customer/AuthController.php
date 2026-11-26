<?php

namespace App\Http\Controllers\Api\v1\Customer;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        protected OtpService $otpService
    ) {}

    /**
     * POST /api/v1/auth/send-otp
     */
    public function sendOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone'        => 'required_without:phone_number|string|min:8|max:20',
            'phone_number' => 'required_without:phone|string|min:8|max:20',
        ]);

        $phone = $request->input('phone') ?? $request->input('phone_number');

        try {
            $result = $this->otpService->sendOtp($phone);
            $isNewUser = !User::where('phone_number', $phone)->exists();

            return response()->json([
                ...$result,
                'code'        => $result['debug_code'],
                'is_new_user' => $isNewUser,
            ]);
        } catch (Exception $e) {
            $code = ($e->getCode() >= 400 && $e->getCode() <= 500) ? $e->getCode() : 429;
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $code);
        }
    }

    /**
     * POST /api/v1/auth/verify-otp
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone'        => 'required_without:phone_number|string',
            'phone_number' => 'required_without:phone|string',
            'otp'          => 'required_without:code|string',
            'code'         => 'required_without:otp|string',
        ]);

        $phone = $request->input('phone') ?? $request->input('phone_number');
        $code  = $request->input('otp') ?? $request->input('code');

        try {
            $this->otpService->verifyOtp($phone, $code);

            $user = User::firstOrCreate(
                ['phone_number' => $phone],
                [
                    'full_name'         => 'عميل سوقنا',
                    'role'              => UserRole::CUSTOMER,
                    'is_active'         => true,
                    'is_phone_verified' => true,
                ]
            );

            if (!$user->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'تم تعطيل هذا الحساب. يرجى التواصل مع الدعم.',
                ], 403);
            }

            if (!$user->is_phone_verified) {
                $user->update(['is_phone_verified' => true]);
            }

            $token = $user->createToken('customer-token', ['customer:access'])->plainTextToken;

            return response()->json([
                'success' => true,
                'token'   => $token,
                'user'    => [
                    'id'    => $user->id,
                    'name'  => $user->full_name,
                    'phone' => $user->phone_number,
                ],
            ]);
        } catch (Exception $e) {
            $status = ($e->getCode() >= 400 && $e->getCode() <= 500) ? $e->getCode() : 422;
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $status);
        }
    }

    /**
     * POST /api/v1/auth/register
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'  => 'required|string|min:2|max:150',
            'phone' => 'required|string|min:8|max:20',
            'otp'   => 'required|string',
        ]);

        try {
            $this->otpService->verifyOtp($validated['phone'], $validated['otp']);

            $user = User::firstOrCreate(
                ['phone_number' => $validated['phone']],
                [
                    'full_name'         => $validated['name'],
                    'role'              => UserRole::CUSTOMER,
                    'is_active'         => true,
                    'is_phone_verified' => true,
                ]
            );

            if (!$user->wasRecentlyCreated) {
                $user->update([
                    'full_name'         => $validated['name'],
                    'is_phone_verified' => true,
                ]);
            }

            $token = $user->createToken('customer-token', ['customer:access'])->plainTextToken;

            return response()->json([
                'success' => true,
                'token'   => $token,
                'user'    => [
                    'id'    => $user->id,
                    'name'  => $user->full_name,
                    'phone' => $user->phone_number,
                ],
            ]);
        } catch (Exception $e) {
            $status = ($e->getCode() >= 400 && $e->getCode() <= 500) ? $e->getCode() : 422;
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $status);
        }
    }
}
