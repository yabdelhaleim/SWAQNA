// src/components/AdminFinancialsView.tsx
"use client";

import React, { useState } from "react";
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Building,
  Smartphone,
  AlertCircle,
  FileText,
} from "lucide-react";
import { WithdrawalRequest } from "../types/admin";

interface AdminFinancialsViewProps {
  withdrawals: WithdrawalRequest[];
  onApproveWithdrawal: (id: string) => void;
  onRejectWithdrawal: (id: string) => void;
  totalSales: number;
  platformCommission: number;
}

export const AdminFinancialsView: React.FC<AdminFinancialsViewProps> = ({
  withdrawals,
  onApproveWithdrawal,
  onRejectWithdrawal,
  totalSales,
  platformCommission,
}) => {
  const [filter, setFilter] = useState<string>("ALL");

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "PENDING");
  const pendingTotal = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const approvedTotal = withdrawals
    .filter((w) => w.status === "APPROVED")
    .reduce((sum, w) => sum + w.amount, 0);

  const filtered = withdrawals.filter((w) => {
    if (filter === "ALL") return true;
    return w.status === filter;
  });

  return (
    <div className="space-y-6 font-cairo">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">المالية وسحوبات الأرباح</h2>
          <p className="text-xs text-souqna-text-secondary mt-1">
            إدارة طلبات سحب أرباح المتاجر الشريكة (فودافون كاش، إنستاباي، والتحويلات البنكية)، ومتابعة عمولات سوقنا.
          </p>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-souqna-surface border border-souqna-border shadow-card space-y-2">
          <span className="text-xs text-souqna-text-muted">إجمالي حركة المبيعات (GMV)</span>
          <h3 className="text-2xl font-extrabold text-white">{totalSales.toLocaleString()} ج.م</h3>
          <span className="text-[11px] text-emerald-400 font-semibold block">+18% نمو المبيعات</span>
        </div>

        <div className="p-5 rounded-3xl bg-souqna-surface border border-souqna-gold/40 shadow-card space-y-2">
          <span className="text-xs text-souqna-text-muted">صافي إيرادات وعمولة المنصة</span>
          <h3 className="text-2xl font-extrabold text-souqna-gold">{platformCommission.toLocaleString()} ج.م</h3>
          <span className="text-[11px] text-souqna-text-secondary block">تقتطع تلقائياً من الطلبات</span>
        </div>

        <div className="p-5 rounded-3xl bg-souqna-surface border border-rose-500/30 shadow-card space-y-2">
          <span className="text-xs text-souqna-text-muted">طلبات سحب معلقة للصرف</span>
          <h3 className="text-2xl font-extrabold text-rose-400">{pendingTotal.toLocaleString()} ج.م</h3>
          <span className="text-[11px] text-rose-300 block">{pendingWithdrawals.length} طلبات تنتظر التحويل</span>
        </div>

        <div className="p-5 rounded-3xl bg-souqna-surface border border-emerald-500/30 shadow-card space-y-2">
          <span className="text-xs text-souqna-text-muted">إجمالي المسحوبات المحولة</span>
          <h3 className="text-2xl font-extrabold text-emerald-400">{approvedTotal.toLocaleString()} ج.م</h3>
          <span className="text-[11px] text-souqna-text-muted block">تمت تسويتها بالكامل</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-souqna-surface border border-souqna-border w-fit">
        {[
          { id: "ALL", label: "كل الطلبات" },
          { id: "PENDING", label: `معلقة (${pendingWithdrawals.length})` },
          { id: "APPROVED", label: "تم الصرف" },
          { id: "REJECTED", label: "مرفوضة" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filter === tab.id
                ? "bg-souqna-gold text-souqna-base shadow-sm"
                : "text-souqna-text-secondary hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Withdrawals Table / Cards */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const isPending = item.status === "PENDING";
          const isApproved = item.status === "APPROVED";
          const isRejected = item.status === "REJECTED";

          return (
            <div
              key={item.id}
              className={`p-5 rounded-3xl bg-souqna-surface border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-card ${
                isPending
                  ? "border-amber-500/40"
                  : isApproved
                  ? "border-souqna-border/60"
                  : "border-rose-500/30 opacity-70"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-base text-white">{item.merchant_name}</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isPending
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : isApproved
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {isPending ? "قيد المراجعة" : isApproved ? "تم التحويل ✅" : "مرفوض ❌"}
                  </span>
                  <span className="text-xs text-souqna-text-muted">{item.created_at}</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-souqna-text-secondary">
                  <span className="flex items-center gap-1">
                    {item.payout_method === "VODAFONE_CASH" ? (
                      <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                    ) : item.payout_method === "INSTAPAY" ? (
                      <CreditCard className="w-3.5 h-3.5 text-souqna-gold" />
                    ) : (
                      <Building className="w-3.5 h-3.5 text-blue-400" />
                    )}
                    <span className="font-semibold text-white">
                      {item.payout_method === "VODAFONE_CASH"
                        ? "فودافون كاش"
                        : item.payout_method === "INSTAPAY"
                        ? "إنستاباي (InstaPay)"
                        : "تحويل بنكي"}
                    </span>
                  </span>
                  <span>البيانات: {item.account_details}</span>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-souqna-border/50">
                <div className="text-right">
                  <span className="text-xs text-souqna-text-muted block">المبلغ المطلوب:</span>
                  <span className="font-extrabold text-xl text-souqna-gold font-cairo">
                    {item.amount.toLocaleString()} ج.م
                  </span>
                </div>

                {isPending && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onApproveWithdrawal(item.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-souqna-base font-extrabold text-xs transition-colors flex items-center gap-1 shadow-emerald-glow/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد التحويل</span>
                    </button>
                    <button
                      onClick={() => onRejectWithdrawal(item.id)}
                      className="px-3 py-2 rounded-xl bg-souqna-card hover:bg-rose-500/20 text-rose-400 border border-souqna-border text-xs font-bold transition-colors"
                    >
                      رفض
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
