<?php

namespace App\Http\Controllers\Api\v1\Admin;

use App\Enums\MerchantStatus;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Merchant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MerchantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Merchant::with(['owner:id,full_name,phone_number', 'wallet'])
            ->withCount('orders')
            ->withSum(['orders as delivered_revenue' => fn($q) => $q->where('status', OrderStatus::DELIVERED)], 'total_amount')
            ->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'ALL') {
            $status = $request->status === 'PENDING' ? MerchantStatus::PENDING_APPROVAL->value : $request->status;
            $query->where('status', $status);
        }

        $merchants = $query->get()->map(fn($m) => [
            'id'               => $m->id,
            'name'             => $m->name,
            'store_name'       => $m->name,
            'owner_name'       => $m->owner?->full_name ?? 'غير محدد',
            'phone'            => $m->phone_number ?? $m->owner?->phone_number ?? '',
            'status'           => $m->status === MerchantStatus::PENDING_APPROVAL ? 'PENDING' : $m->status->value,
            'merchant_type'    => $m->merchant_type?->value ?? 'RESTAURANT',
            'fulfillment_type' => $m->fulfillment_type?->value ?? 'PLATFORM_DELIVERY',
            'avg_rating'       => (float) $m->avg_rating,
            'total_orders'     => (int) $m->orders_count,
            'total_revenue'    => (float) ($m->delivered_revenue ?? 0),
            'wallet_balance'   => (float) ($m->wallet?->balance ?? 0),
            'commission_rate'  => (float) ($m->commission_rate ?? 10),
            'created_at'       => $m->created_at?->toDateString(),
            'logo_url'         => $m->logo_url,
        ]);

        return response()->json([
            'success'   => true,
            'merchants' => $merchants,
        ]);
    }

    public function approve(string $id): JsonResponse
    {
        $merchant = Merchant::findOrFail($id);
        $merchant->update(['status' => MerchantStatus::ACTIVE]);

        return response()->json([
            'success' => true,
            'message' => 'تم اعتماد وتفعيل المتجر بنجاح.',
        ]);
    }

    public function suspend(string $id): JsonResponse
    {
        $merchant = Merchant::findOrFail($id);
        $merchant->update(['status' => MerchantStatus::SUSPENDED]);

        return response()->json([
            'success' => true,
            'message' => 'تم إيقاف المتجر مؤقتاً.',
        ]);
    }

    public function updateCommission(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'commission_rate' => 'required|numeric|min:0|max:50',
        ]);

        $merchant = Merchant::findOrFail($id);
        $merchant->update(['commission_rate' => $validated['commission_rate']]);

        return response()->json([
            'success'         => true,
            'message'         => 'تم تحديث نسبة العمولة بنجاح.',
            'commission_rate' => (float) $merchant->commission_rate,
        ]);
    }
}
