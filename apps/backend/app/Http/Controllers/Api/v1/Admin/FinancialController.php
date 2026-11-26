<?php

namespace App\Http\Controllers\Api\v1\Admin;

use App\Http\Controllers\Controller;
use App\Models\WithdrawalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinancialController extends Controller
{
    public function withdrawals(): JsonResponse
    {
        $withdrawals = WithdrawalRequest::with('merchant:id,name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($w) => [
                'id'              => $w->id,
                'reference_id'    => $w->reference_id,
                'merchant_id'     => $w->merchant_id,
                'merchant_name'   => $w->merchant?->name ?? 'متجر',
                'amount'          => (float) $w->amount,
                'payout_method'   => $w->payout_method,
                'account_details' => $w->account_details,
                'status'          => $w->status,
                'admin_notes'     => $w->admin_notes,
                'created_at'      => $w->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'success'     => true,
            'withdrawals' => $withdrawals,
        ]);
    }

    public function approveWithdrawal(Request $request, string $id): JsonResponse
    {
        $withdrawal = WithdrawalRequest::findOrFail($id);
        if ($withdrawal->status !== 'PENDING') {
            return response()->json(['success' => false, 'message' => 'تمت معالجة هذا الطلب مسبقاً.'], 422);
        }

        $withdrawal->update([
            'status'       => 'APPROVED',
            'admin_notes'  => $request->input('notes'),
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم اعتماد طلب السحب بنجاح.',
        ]);
    }

    public function rejectWithdrawal(Request $request, string $id): JsonResponse
    {
        $withdrawal = WithdrawalRequest::with('wallet')->findOrFail($id);
        if ($withdrawal->status !== 'PENDING') {
            return response()->json(['success' => false, 'message' => 'تمت معالجة هذا الطلب مسبقاً.'], 422);
        }

        DB::transaction(function () use ($withdrawal, $request) {
            $withdrawal->update([
                'status'       => 'REJECTED',
                'admin_notes'  => $request->input('notes', 'تم الرفض من الإدارة'),
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
            ]);

            // Refund the amount back to merchant wallet
            if ($withdrawal->wallet) {
                $withdrawal->wallet->increment('balance', (float) $withdrawal->amount);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'تم رفض طلب السحب وإرجاع المبلغ لمحفظة التاجر.',
        ]);
    }
}
