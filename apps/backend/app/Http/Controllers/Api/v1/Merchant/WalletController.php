<?php

namespace App\Http\Controllers\Api\v1\Merchant;

use App\Enums\OrderStatus;
use App\Enums\WalletType;
use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\Order;
use App\Models\Wallet;
use App\Models\WithdrawalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WalletController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();

        $wallet = Wallet::firstOrCreate(
            [
                'merchant_id' => $merchant->id,
                'wallet_type' => WalletType::MERCHANT,
            ],
            [
                'balance'       => 0.00,
                'locked_amount' => 0.00,
                'currency'      => 'EGP',
            ]
        );

        $completedOrdersCount = Order::where('merchant_id', $merchant->id)
            ->where('status', OrderStatus::DELIVERED->value)
            ->count();

        $monthlySales = (float) Order::where('merchant_id', $merchant->id)
            ->where('status', OrderStatus::DELIVERED->value)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('total_amount');

        $commissionRate = (float) ($merchant->commission_rate ?? 10);
        $commissionAmount = round($monthlySales * ($commissionRate / 100), 2);
        $netEarnings = round($monthlySales - $commissionAmount, 2);

        return response()->json([
            'success' => true,
            'wallet'  => [
                'id'                         => $wallet->id,
                'balance'                    => (float) $wallet->balance,
                'locked_amount'              => (float) $wallet->locked_amount,
                'currency'                   => $wallet->currency ?? 'EGP',
                'this_month_sales'           => $monthlySales,
                'this_month_net'             => $netEarnings,
                'platform_commission_amount' => $commissionAmount,
                'platform_commission_rate'   => $commissionRate,
                'total_completed_orders'     => $completedOrdersCount,
            ],
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();
        $rate = (float) ($merchant->commission_rate ?? 10) / 100;

        $orders = Order::where('merchant_id', $merchant->id)
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get();

        $transactions = [];

        foreach ($orders as $order) {
            $orderTotal = (float) $order->total_amount;
            $comm = round($orderTotal * $rate, 2);
            $net = round($orderTotal - $comm, 2);
            $statusValue = $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status;

            $transactions[] = [
                'id'                => 'tx-' . $order->id,
                'type'              => 'ORDER_EARNING',
                'title'             => 'أرباح طلب #' . ($order->order_code ?? substr($order->id, 0, 8)),
                'amount'            => $net,
                'gross_amount'      => $orderTotal,
                'commission_amount' => $comm,
                'status'            => $statusValue === OrderStatus::DELIVERED->value ? 'COMPLETED' : 'PENDING',
                'payment_method'    => $order->payment_method?->value ?? 'CASH_ON_DELIVERY',
                'created_at'        => $order->created_at?->toIso8601String() ?? now()->toIso8601String(),
                'reference_id'      => $order->id,
            ];
        }

        $withdrawals = WithdrawalRequest::where('merchant_id', $merchant->id)
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get();

        foreach ($withdrawals as $w) {
            $transactions[] = [
                'id'              => 'payout-' . $w->id,
                'type'            => 'WITHDRAWAL',
                'title'           => 'طلب سحب (' . $w->payout_method . ')',
                'amount'          => -((float) $w->amount),
                'gross_amount'    => (float) $w->amount,
                'commission_amount' => 0.00,
                'status'          => $w->status === 'APPROVED' ? 'COMPLETED' : $w->status,
                'payout_method'   => $w->payout_method,
                'account_details' => $w->account_details,
                'created_at'      => $w->created_at?->toIso8601String(),
                'reference_id'    => $w->reference_id,
            ];
        }

        usort($transactions, fn($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));

        return response()->json([
            'success'      => true,
            'transactions' => $transactions,
        ]);
    }

    public function withdraw(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount'          => ['required', 'numeric', 'min:100'],
            'payout_method'   => ['required', 'string', 'in:INSTAPAY,VODAFONE_CASH,BANK_TRANSFER'],
            'account_details' => ['required', 'string', 'min:5', 'max:255'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ], [
            'amount.required'          => 'يرجى إدخال المبلغ المراد سحبه.',
            'amount.min'               => 'الحد الأدنى للسحب هو 100 ج.م.',
            'payout_method.required'   => 'يرجى اختيار طريقة السحب.',
            'account_details.required' => 'يرجى إدخال بيانات الحساب أو المحفظة.',
        ]);

        $user = $request->user();
        $merchant = Merchant::where('owner_id', $user->id)->firstOrFail();

        $wallet = Wallet::firstOrCreate(
            ['merchant_id' => $merchant->id, 'wallet_type' => WalletType::MERCHANT],
            ['balance' => 0.00, 'locked_amount' => 0.00, 'currency' => 'EGP']
        );

        $amount = (float) $validated['amount'];

        if ((float) $wallet->balance < $amount) {
            return response()->json([
                'success' => false,
                'message' => 'عفواً، رصيدك المتاح للسحب (' . number_format((float) $wallet->balance, 2) . ' ج.م) أقل من المبلغ المطلوب.',
            ], 422);
        }

        $referenceId = 'PAY-' . strtoupper(Str::random(6));

        $withdrawal = DB::transaction(function () use ($wallet, $merchant, $validated, $amount, $referenceId) {
            $wallet->decrement('balance', $amount);

            return WithdrawalRequest::create([
                'reference_id'    => $referenceId,
                'merchant_id'     => $merchant->id,
                'wallet_id'       => $wallet->id,
                'amount'          => $amount,
                'payout_method'   => $validated['payout_method'],
                'account_details' => $validated['account_details'],
                'notes'           => $validated['notes'] ?? null,
                'status'          => 'PENDING',
            ]);
        });

        $payoutMethodLabels = [
            'INSTAPAY'      => 'إنستاباي (InstaPay)',
            'VODAFONE_CASH' => 'محفظة إلكترونية (كاش)',
            'BANK_TRANSFER' => 'تحويل بنكي مصري (IBAN)',
        ];

        return response()->json([
            'success' => true,
            'message' => 'تم استلام طلب السحب بنجاح! سيتم مراجعته وتحويل المبلغ خلال 24 ساعة.',
            'payout'  => [
                'id'              => $withdrawal->id,
                'reference_id'    => $referenceId,
                'amount'          => $amount,
                'method'          => $validated['payout_method'],
                'method_label'    => $payoutMethodLabels[$validated['payout_method']] ?? 'سحب أرباح',
                'account_details' => $validated['account_details'],
                'status'          => 'PENDING',
                'new_balance'     => (float) $wallet->fresh()->balance,
                'created_at'      => $withdrawal->created_at?->toIso8601String(),
            ],
        ]);
    }
}
