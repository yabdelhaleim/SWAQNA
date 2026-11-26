<?php

namespace App\Http\Controllers\Api\v1\Admin;

use App\Enums\MerchantStatus;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\DeliveryCaptain;
use App\Models\Merchant;
use App\Models\Order;
use App\Models\WithdrawalRequest;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function metrics(): JsonResponse
    {
        $totalGmv = (float) Order::where('status', OrderStatus::DELIVERED)->sum('total_amount');

        $deliveredOrders = Order::with('merchant:id,commission_rate')
            ->where('status', OrderStatus::DELIVERED)
            ->get(['id', 'merchant_id', 'total_amount']);

        $platformCommission = $deliveredOrders->sum(function ($order) {
            $rate = (float) ($order->merchant?->commission_rate ?? 10);
            return round(((float) $order->total_amount) * ($rate / 100), 2);
        });

        return response()->json([
            'success' => true,
            'metrics' => [
                'total_gmv'              => $totalGmv,
                'platform_commission'    => round($platformCommission, 2),
                'total_orders'           => Order::count(),
                'active_orders'          => Order::whereIn('status', [OrderStatus::PENDING, OrderStatus::PREPARING, OrderStatus::READY])->count(),
                'active_merchants'       => Merchant::where('status', MerchantStatus::ACTIVE)->count(),
                'pending_merchants'      => Merchant::where('status', MerchantStatus::PENDING_APPROVAL)->count(),
                'available_captains'     => DeliveryCaptain::where('status', 'AVAILABLE')->count(),
                'pending_withdrawals'    => WithdrawalRequest::where('status', 'PENDING')->count(),
                'pending_withdrawal_sum' => (float) WithdrawalRequest::where('status', 'PENDING')->sum('amount'),
            ],
        ]);
    }
}
