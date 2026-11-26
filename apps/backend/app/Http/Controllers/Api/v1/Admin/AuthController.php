<?php

namespace App\Http\Controllers\Api\v1\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !in_array($user->role, [UserRole::ADMIN, UserRole::SUPER_ADMIN])) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات الدخول غير صحيحة أو الحساب ليس لديه صلاحية إدارة.',
            ], 401);
        }

        if (!$user->password || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'كلمة المرور غير صحيحة.',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'تم تعطيل هذا الحساب الإداري.',
            ], 403);
        }

        $token = $user->createToken('admin-dashboard-token', ['admin:access'])->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'admin'   => [
                'id'         => $user->id,
                'name'       => $user->full_name,
                'email'      => $user->email,
                'role'       => $user->role->value,
                'avatar_url' => $user->avatar_url,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'admin'   => [
                'id'         => $user->id,
                'name'       => $user->full_name,
                'email'      => $user->email,
                'role'       => $user->role->value,
                'avatar_url' => $user->avatar_url,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الخروج بنجاح.',
        ]);
    }
}
