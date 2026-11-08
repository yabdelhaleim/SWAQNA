<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsMerchant
{
    /**
     * التحقق من أن المستخدم يمتلك صلاحية بائع / تاجر
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !in_array($user->role, [UserRole::MERCHANT_OWNER, UserRole::ADMIN, UserRole::SUPER_ADMIN])) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك بالدخول إلى لوحة تحكم التاجر. هذا القسم مخصص لأصحاب الأنشطة التجارية فقط.',
            ], 403);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'تم تعطيل هذا الحساب. يرجى التواصل مع إدارة منصة حواديت.',
            ], 403);
        }

        return $next($request);
    }
}
