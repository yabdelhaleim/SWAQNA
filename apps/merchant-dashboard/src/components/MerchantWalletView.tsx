"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet, DollarSign, ArrowDownRight, ArrowUpRight, Clock,
  CheckCircle2, AlertCircle, X, Download, Printer, Filter,
  Building2, Smartphone, Zap, Sparkles, Loader2, RefreshCw,
  TrendingUp, ShieldCheck, ChevronDown, Check, HelpCircle
} from "lucide-react";
import { merchantApi } from "@/lib/api";

interface WalletData {
  id: string;
  balance: number;
  locked_amount: number;
  currency: string;
  this_month_sales: number;
  this_month_net: number;
  platform_commission_amount: number;
  platform_commission_rate: number;
  total_completed_orders: number;
}

interface TransactionItem {
  id: string;
  type: "ORDER_EARNING" | "WITHDRAWAL" | "COMMISSION_DEDUCTION";
  title: string;
  amount: number;
  gross_amount?: number;
  commission_amount?: number;
  status: "COMPLETED" | "PENDING" | "REJECTED";
  payment_method?: string;
  payout_method?: "INSTAPAY" | "VODAFONE_CASH" | "BANK_TRANSFER";
  account_details?: string;
  created_at: string;
  reference_id: string;
}

interface MerchantWalletViewProps {
  token: string;
  storeName?: string;
  user?: any;
  onNavigate?: (view: "settings" | "menu" | "orders" | "reels" | "wallet") => void;
  onLogout?: () => void;
}

const EMPTY_WALLET: WalletData = {
  id: "",
  balance: 0,
  locked_amount: 0,
  currency: "ج.م",
  this_month_sales: 0,
  this_month_net: 0,
  platform_commission_amount: 0,
  platform_commission_rate: 10,
  total_completed_orders: 0,
};

export default function MerchantWalletView({
  token,
  storeName = "متجر سوقنا",
  user,
  onNavigate,
  onLogout,
}: MerchantWalletViewProps) {
  const [wallet, setWallet] = useState<WalletData>(EMPTY_WALLET);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [filterType, setFilterType] = useState<"ALL" | "EARNINGS" | "WITHDRAWALS">("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Payout Modal State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(1000);
  const [payoutMethod, setPayoutMethod] = useState<"INSTAPAY" | "VODAFONE_CASH" | "BANK_TRANSFER">("INSTAPAY");
  const [accountDetails, setAccountDetails] = useState<string>("");
  const [payoutNotes, setPayoutNotes] = useState<string>("");
  const [isSubmittingPayout, setIsSubmittingPayout] = useState<boolean>(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // جلب بيانات المحفظة من السيرفر
  const fetchWalletData = async () => {
    try {
      setRefreshing(true);
      const [walletRes, txRes] = await Promise.all([
        merchantApi.getWallet(token).catch(() => null),
        merchantApi.getWalletTransactions(token).catch(() => null),
      ]);

      if (walletRes && walletRes.success && walletRes.wallet) {
        setWallet(walletRes.wallet);
      }
      if (txRes && txRes.success && Array.isArray(txRes.transactions)) {
        setTransactions(txRes.transactions);
      }
    } catch {
      showToast("تعذر تحميل بيانات المحفظة من السيرفر", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [token]);

  // إرسال طلب السحب
  const handleConfirmPayout = async () => {
    if (!accountDetails.trim()) {
      showToast("يرجى إدخال بيانات التحويل (عنوان إنستاباي أو رقم المحفظة أو الآيبان)", "error");
      return;
    }
    if (payoutAmount < 100) {
      showToast("الحد الأدنى لطلب السحب هو 100 ج.م", "error");
      return;
    }
    if (payoutAmount > wallet.balance) {
      showToast("المبلغ المطلوب أكبر من الرصيد المتاح للسحب", "error");
      return;
    }

    try {
      setIsSubmittingPayout(true);
      const res = await merchantApi.requestPayout(token, {
        amount: payoutAmount,
        payout_method: payoutMethod,
        account_details: accountDetails.trim(),
        notes: payoutNotes.trim(),
      });

      if (res.success) {
        showToast(res.message || "تم تسجيل طلب السحب بنجاح! سيتم التحويل خلال دقائق 🚀");
        // تحديث الرصيد محلياً
        setWallet((prev) => ({
          ...prev,
          balance: Math.max(0, prev.balance - payoutAmount),
        }));

        // إضافة حركة السحب لكشف الحساب
        const newTx: TransactionItem = {
          id: `payout-${Date.now()}`,
          type: "WITHDRAWAL",
          title: `سحب أرباح عبر ${
            payoutMethod === "INSTAPAY"
              ? "إنستاباي (InstaPay)"
              : payoutMethod === "VODAFONE_CASH"
              ? "محفظة كاش إلكترونية"
              : "تحويل بنكي مصري"
          }`,
          amount: -payoutAmount,
          gross_amount: payoutAmount,
          commission_amount: 0.00,
          status: "PENDING",
          payout_method: payoutMethod,
          account_details: accountDetails.trim(),
          created_at: new Date().toISOString(),
          reference_id: res.payout?.reference_id || `PAY-${Math.floor(10000 + Math.random() * 90000)}`,
        };
        setTransactions((prev) => [newTx, ...prev]);

        setIsPayoutModalOpen(false);
        setAccountDetails("");
        setPayoutNotes("");
      } else {
        showToast(res.message || "فشل تسجيل طلب السحب", "error");
      }
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء إرسال الطلب", "error");
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // فلترة المعاملات
  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === "EARNINGS") return tx.type === "ORDER_EARNING";
    if (filterType === "WITHDRAWALS") return tx.type === "WITHDRAWAL";
    return true;
  });

  return (
    <div className="min-h-full space-y-6" dir="rtl">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold transition-all ${
            toastMessage.type === "success"
              ? "bg-souqna-emerald text-white border border-souqna-emerald/50"
              : "bg-red-600 text-white border border-red-400"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-white/90" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white/90" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-souqna-text-primary font-black text-xl flex items-center gap-2">
            <Wallet className="w-5 h-5 text-souqna-gold" />
            <span>المحفظة المالية والأرباح</span>
          </h1>
          <p className="text-souqna-text-muted text-xs mt-0.5">
            متابعة الرصيد اللحظي، كشف الحساب، وسحب المستحقات الفوري عبر إنستاباي وفودافون كاش
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchWalletData}
            disabled={refreshing}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs font-bold"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-souqna-gold" : ""}`} />
            <span>تحديث الرصيد</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPayoutModalOpen(true)}
            className="btn-gold flex items-center gap-2 px-5 py-2.5 text-xs font-bold shadow-lg shadow-souqna-gold/15"
          >
            <Zap className="w-4 h-4 stroke-[2.5]" />
            <span>طلب سحب أرباح 💸</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          FINANCIAL KPI CARDS (4 بطاقات المؤشرات المالية)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Balance */}
        <div className="card-glass border-2 border-souqna-gold/40 p-5 rounded-2xl relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-souqna-gold/10 rounded-full blur-2xl pointer-events-none group-hover:bg-souqna-gold/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-souqna-gold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-souqna-gold animate-pulse" />
              الرصيد المتاح للسحب
            </span>
            <div className="w-9 h-9 rounded-xl bg-souqna-gold/15 flex items-center justify-center text-souqna-gold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-souqna-text-primary font-mono tracking-tight flex items-baseline gap-1.5">
            <span>{wallet.balance.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs font-bold text-souqna-gold font-sans">ج.م</span>
          </div>
          <div className="mt-3 pt-3 border-t border-souqna-border/50 flex items-center justify-between text-[11px]">
            <span className="text-souqna-text-muted">سحب لحظي 24/7</span>
            <button
              type="button"
              onClick={() => setIsPayoutModalOpen(true)}
              className="text-souqna-gold hover:underline font-bold"
            >
              اسحب الآن ←
            </button>
          </div>
        </div>

        {/* Card 2: Locked / Pending Settlement */}
        <div className="card-glass p-5 rounded-2xl border border-souqna-border shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-souqna-text-secondary flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              رصيد قيد التسوية (طلبات جارية)
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-souqna-text-primary font-mono tracking-tight flex items-baseline gap-1.5">
            <span>{wallet.locked_amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs font-bold text-souqna-text-muted font-sans">ج.م</span>
          </div>
          <div className="mt-3 pt-3 border-t border-souqna-border/50 text-[11px] text-souqna-text-muted">
            يتحول للرصيد المتاح فور تسليم الأوردر للزبون
          </div>
        </div>

        {/* Card 3: Net Profit this month */}
        <div className="card-glass p-5 rounded-2xl border border-souqna-border shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-souqna-emerald flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              صافي أرباح الشهر ({wallet.total_completed_orders} طلب)
            </span>
            <div className="w-9 h-9 rounded-xl bg-souqna-emerald/15 flex items-center justify-center text-souqna-emerald">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-souqna-emerald font-mono tracking-tight flex items-baseline gap-1.5">
            <span>{wallet.this_month_net.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs font-bold text-souqna-emerald/80 font-sans">ج.م</span>
          </div>
          <div className="mt-3 pt-3 border-t border-souqna-border/50 text-[11px] text-souqna-text-muted flex justify-between">
            <span>إجمالي المبيعات:</span>
            <span className="font-mono font-bold text-souqna-text-secondary">
              {wallet.this_month_sales.toLocaleString("ar-EG")} ج.م
            </span>
          </div>
        </div>

        {/* Card 4: Platform Commission */}
        <div className="card-glass p-5 rounded-2xl border border-souqna-border shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-souqna-text-secondary flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              عمولة المنصة ({wallet.platform_commission_rate}%)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-souqna-text-primary font-mono tracking-tight flex items-baseline gap-1.5">
            <span>{wallet.platform_commission_amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs font-bold text-souqna-text-muted font-sans">ج.م</span>
          </div>
          <div className="mt-3 pt-3 border-t border-souqna-border/50 text-[11px] text-souqna-text-muted">
            شاملة السيرفرات والتسويق والدعم الفني 24/7
          </div>
        </div>
      </div>

      {/* =========================================================================
          FAST PAYOUT METHODS BANNER
         ========================================================================= */}
      <div className="card-glass p-5 rounded-2xl border border-souqna-gold/20 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-l from-souqna-surface via-souqna-card to-souqna-surface">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-souqna-gold/15 border border-souqna-gold/30 flex items-center justify-center text-souqna-gold text-2xl shrink-0">
            ⚡
          </div>
          <div>
            <h3 className="font-black text-sm text-souqna-text-primary flex items-center gap-2">
              سحب أرباح فوري بدون تأخير عبر إنستاباي والمحافظ الإلكترونية
            </h3>
            <p className="text-xs text-souqna-text-muted mt-0.5">
              تحويل لحظي مباشر لحسابك البنكي أو محفظتك بدون حد أقصى للتحويلات اليومية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-souqna-base border border-souqna-border text-[11px] font-bold text-souqna-text-secondary">
            <span>⚡ إنستاباي</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-souqna-base border border-souqna-border text-[11px] font-bold text-souqna-text-secondary">
            <span>📱 فودافون كاش</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-souqna-base border border-souqna-border text-[11px] font-bold text-souqna-text-secondary">
            <span>🏦 حساب بنكي (IBAN)</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TRANSACTIONS LEDGER (كشف الحساب وسجل المعاملات)
         ========================================================================= */}
      <div className="card-glass p-5 rounded-2xl space-y-4 shadow-xl">
        {/* Ledger Header & Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-souqna-border">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-souqna-text-primary flex items-center gap-2">
              <span>📑</span>
              كشف الحساب وسجل الحركات المالية
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-souqna-base border border-souqna-border text-souqna-gold">
              {filteredTransactions.length} حركة
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === "ALL"
                  ? "bg-souqna-gold text-souqna-base shadow-sm"
                  : "btn-ghost text-souqna-text-secondary"
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setFilterType("EARNINGS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === "EARNINGS"
                  ? "bg-souqna-emerald text-white shadow-sm"
                  : "btn-ghost text-souqna-text-secondary"
              }`}
            >
              أرباح الطلبات 🟢
            </button>
            <button
              type="button"
              onClick={() => setFilterType("WITHDRAWALS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === "WITHDRAWALS"
                  ? "bg-amber-500 text-souqna-base shadow-sm font-black"
                  : "btn-ghost text-souqna-text-secondary"
              }`}
            >
              سحب الأرباح 💸
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-souqna-text-muted space-y-2">
              <Wallet className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-xs font-semibold">لا توجد حركات مالية مسجلة في هذا التبويب حالياً</p>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-souqna-border/60 text-souqna-text-muted font-bold text-[11px]">
                  <th className="pb-3 pr-2">الحركة / البيان</th>
                  <th className="pb-3 text-center">المرجع</th>
                  <th className="pb-3 text-center">التاريخ والوقت</th>
                  <th className="pb-3 text-center">طريقة الدفع / التحويل</th>
                  <th className="pb-3 text-center">الحالة</th>
                  <th className="pb-3 pl-2 text-left">المبلغ الصافي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-souqna-border/40">
                {filteredTransactions.map((tx) => {
                  const isEarning = tx.type === "ORDER_EARNING";
                  const isWithdrawal = tx.type === "WITHDRAWAL";

                  return (
                    <tr key={tx.id} className="hover:bg-souqna-surface/40 transition-colors">
                      {/* البيان */}
                      <td className="py-3.5 pr-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isEarning
                                ? "bg-souqna-emerald/15 text-souqna-emerald border border-souqna-emerald/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {isEarning ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-souqna-text-primary text-xs">{tx.title}</div>
                            {tx.account_details && (
                              <div className="text-[10px] text-souqna-text-muted font-mono mt-0.5">
                                إلى: {tx.account_details}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* المرجع */}
                      <td className="py-3.5 text-center font-mono text-[11px] text-souqna-gold">
                        #{tx.reference_id}
                      </td>

                      {/* التاريخ */}
                      <td className="py-3.5 text-center text-souqna-text-secondary text-[11px] font-mono">
                        {new Date(tx.created_at).toLocaleDateString("ar-EG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* طريقة الدفع */}
                      <td className="py-3.5 text-center">
                        {isWithdrawal ? (
                          <span className="px-2 py-0.5 rounded-md bg-souqna-surface border border-souqna-border text-[10px] font-bold text-souqna-text-secondary">
                            {tx.payout_method === "INSTAPAY"
                              ? "⚡ إنستاباي"
                              : tx.payout_method === "VODAFONE_CASH"
                              ? "📱 فودافون كاش"
                              : "🏦 تحويل بنكي"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-souqna-surface border border-souqna-border text-[10px] font-bold text-souqna-text-secondary">
                            {tx.payment_method === "ONLINE_CARD" ? "💳 دفع إلكتروني" : "💵 دفع كاش"}
                          </span>
                        )}
                      </td>

                      {/* الحالة */}
                      <td className="py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.status === "COMPLETED"
                              ? "bg-souqna-emerald/15 text-souqna-emerald border border-souqna-emerald/30"
                              : tx.status === "PENDING"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-red-500/15 text-red-400 border border-red-500/30"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{tx.status === "COMPLETED" ? "مكتمل" : tx.status === "PENDING" ? "قيد التحويل" : "مرفوض"}</span>
                        </span>
                      </td>

                      {/* المبلغ */}
                      <td className="py-3.5 pl-2 text-left font-mono font-black text-sm">
                        <span className={isEarning ? "text-souqna-emerald" : "text-amber-400"}>
                          {isEarning ? "+" : ""}
                          {tx.amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ج.م
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL: طلب سحب أرباح فوري (Instant Payout Drawer / Modal)
         ========================================================================= */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="card-glass border border-souqna-gold/30 w-full max-w-lg p-6 shadow-2xl relative text-right space-y-5 animate-fade-up"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-souqna-border">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-souqna-gold/15 flex items-center justify-center text-souqna-gold border border-souqna-gold/30">
                  <Zap className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-souqna-text-primary">
                    طلب سحب أرباح فوري
                  </h3>
                  <p className="text-xs text-souqna-text-muted">
                    الرصيد المتاح حالياً:{" "}
                    <span className="font-mono font-bold text-souqna-gold">
                      {wallet.balance.toLocaleString("ar-EG")} ج.م
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="btn-ghost p-1.5 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Method Selection Cards */}
              <div>
                <label className="block mb-2 font-bold text-souqna-text-secondary">
                  اختر وسيلة استلام الأرباح:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Method 1: InstaPay */}
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("INSTAPAY")}
                    className={`p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      payoutMethod === "INSTAPAY"
                        ? "border-souqna-gold bg-souqna-gold/10 text-souqna-gold shadow-md"
                        : "border-souqna-border bg-souqna-surface text-souqna-text-secondary hover:border-souqna-border/80"
                    }`}
                  >
                    <span className="text-xl">⚡</span>
                    <span className="font-bold text-xs">إنستاباي</span>
                    <span className="text-[10px] opacity-75 font-mono">لحظي فوري</span>
                  </button>

                  {/* Method 2: Vodafone Cash */}
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("VODAFONE_CASH")}
                    className={`p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      payoutMethod === "VODAFONE_CASH"
                        ? "border-souqna-gold bg-souqna-gold/10 text-souqna-gold shadow-md"
                        : "border-souqna-border bg-souqna-surface text-souqna-text-secondary hover:border-souqna-border/80"
                    }`}
                  >
                    <span className="text-xl">📱</span>
                    <span className="font-bold text-xs">محفظة كاش</span>
                    <span className="text-[10px] opacity-75 font-mono">فودافون/أورنج</span>
                  </button>

                  {/* Method 3: Bank Transfer */}
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("BANK_TRANSFER")}
                    className={`p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      payoutMethod === "BANK_TRANSFER"
                        ? "border-souqna-gold bg-souqna-gold/10 text-souqna-gold shadow-md"
                        : "border-souqna-border bg-souqna-surface text-souqna-text-secondary hover:border-souqna-border/80"
                    }`}
                  >
                    <span className="text-xl">🏦</span>
                    <span className="font-bold text-xs">حساب بنكي</span>
                    <span className="text-[10px] opacity-75 font-mono">تحويل IBAN</span>
                  </button>
                </div>
              </div>

              {/* Amount Input & Shortcut Pills */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-souqna-text-secondary">المبلغ المراد سحبه (ج.م)</label>
                  <span className="text-[11px] text-souqna-text-muted">الحد الأدنى: 100 ج.م</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={100}
                    max={wallet.balance}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Number(e.target.value))}
                    className="input-dark w-full text-center text-lg font-black font-mono py-2.5 pr-4 pl-12 text-souqna-gold"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-souqna-text-muted font-sans">
                    ج.م
                  </span>
                </div>

                {/* Shortcut Pills */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(500)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-souqna-surface border border-souqna-border text-souqna-text-secondary hover:border-souqna-gold/60 hover:text-souqna-gold font-mono"
                  >
                    500
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(1000)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-souqna-surface border border-souqna-border text-souqna-text-secondary hover:border-souqna-gold/60 hover:text-souqna-gold font-mono"
                  >
                    1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(2500)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-souqna-surface border border-souqna-border text-souqna-text-secondary hover:border-souqna-gold/60 hover:text-souqna-gold font-mono"
                  >
                    2,500
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(Math.floor(wallet.balance))}
                    className="text-[11px] px-3 py-1 rounded-lg bg-souqna-gold/15 border border-souqna-gold/40 text-souqna-gold font-bold mr-auto"
                  >
                    كامل الرصيد ({Math.floor(wallet.balance)} ج.م)
                  </button>
                </div>
              </div>

              {/* Account Details Input */}
              <div>
                <label className="block mb-1.5 font-bold text-souqna-text-secondary">
                  {payoutMethod === "INSTAPAY"
                    ? "عنوان الدفع اللحظي (IPA) أو رقم الهاتف في إنستاباي"
                    : payoutMethod === "VODAFONE_CASH"
                    ? "رقم محفظة الكاش (11 رقم)"
                    : "بيانات الحساب البنكي (اسم البنك ورقم الآيبان IBAN)"}
                </label>
                <input
                  type="text"
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  placeholder={
                    payoutMethod === "INSTAPAY"
                      ? "مثال: name@instapay أو 01012345678"
                      : payoutMethod === "VODAFONE_CASH"
                      ? "مثال: 01012345678"
                      : "مثال: البنك الأهلي المصري - EG12000300..."
                  }
                  className="input-dark w-full py-2.5 text-xs font-mono"
                  autoFocus
                />
              </div>

              {/* Security Note */}
              <div className="p-3 rounded-xl bg-souqna-surface/80 border border-souqna-border flex items-start gap-2 text-[11px] text-souqna-text-muted">
                <ShieldCheck className="w-4 h-4 text-souqna-gold shrink-0 mt-0.5" />
                <span>
                  التحويلات تخضع للتحقق الأمني من منصة سوقنا لضمان وصول مستحقاتك بدقة وأمان.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-souqna-border">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="flex-1 py-2.5 btn-ghost rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSubmittingPayout || payoutAmount <= 0}
                onClick={handleConfirmPayout}
                className="flex-1 btn-gold py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-souqna-gold/20"
              >
                {isSubmittingPayout ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>{isSubmittingPayout ? "جاري الإرسال..." : "تأكيد وإرسال طلب السحب 💸"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}