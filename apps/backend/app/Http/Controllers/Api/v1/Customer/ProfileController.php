<?php

namespace App\Http\Controllers\Api\v1\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\CustomerAddress;
use App\Models\ReelSave;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * GET /api/v1/customer/profile
     * استرجاع الملف الشخصي للعميل مع الإحصائيات
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        $ordersCount = Order::where('customer_id', $user->id)->count();
        $addressesCount = CustomerAddress::where('user_id', $user->id)->count();
        $favoritesCount = ReelSave::where('user_id', $user->id)->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'id'                   => $user->id,
                'full_name'            => $user->full_name,
                'phone_number'         => $user->phone_number,
                'email'                => $user->email,
                'avatar_url'           => $user->avatar_url,
                'role'                 => $user->role,
                'orders_count'         => $ordersCount,
                'saved_addresses_count'=> $addressesCount,
                'favorites_count'      => $favoritesCount,
                'member_since'         => $user->created_at?->translatedFormat('F Y') ?? $user->created_at?->format('Y-m'),
            ],
        ]);
    }

    /**
     * PUT /api/v1/customer/profile
     * تحديث بيانات الملف الشخصي (الاسم، البريد الإلكتروني، الصورة)
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'full_name'  => 'required|string|min:2|max:150',
            'email'      => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'avatar_url' => 'nullable|string|max:1000',
        ], [
            'full_name.required' => 'الاسم مطلوب',
            'full_name.min'      => 'يجب أن يتكون الاسم من حرفين على الأقل',
            'email.email'        => 'صيغة البريد الإلكتروني غير صالحة',
            'email.unique'       => 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر',
        ]);

        $user->update([
            'full_name'  => $validated['full_name'],
            'email'      => $validated['email'] ?? null,
            'avatar_url' => $validated['avatar_url'] ?? $user->avatar_url,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث بيانات ملفك الشخصي بنجاح ✨',
            'data'    => [
                'id'           => $user->id,
                'full_name'    => $user->full_name,
                'phone_number' => $user->phone_number,
                'email'        => $user->email,
                'avatar_url'   => $user->avatar_url,
            ],
        ]);
    }
}
