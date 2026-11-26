<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !in_array($user->role, [UserRole::ADMIN, UserRole::SUPER_ADMIN])) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك بالدخول إلى لوحة الإدارة العامة.',
            ], 403);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'تم تعطيل هذا الحساب الإداري.',
            ], 403);
        }

        return $next($request);
    }
}
