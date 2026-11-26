// src/app/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AdminMerchant,
  AdminOrder,
  AdminUser,
  CaptainStatus,
  DeliveryCaptain,
  MerchantStatus,
  ModeratedReel,
  OrderStatus,
  PlatformCoupon,
  WithdrawalRequest,
} from "../types/admin";
import { adminApi } from "../lib/api";
import { AdminShell } from "../components/layout/AdminShell";
import { AdminOverviewView } from "../components/AdminOverviewView";
import { AdminMerchantsView } from "../components/AdminMerchantsView";
import { AdminOrdersView } from "../components/AdminOrdersView";
import { AdminCaptainsView } from "../components/AdminCaptainsView";
import { AdminFinancialsView } from "../components/AdminFinancialsView";
import { AdminModerationView } from "../components/AdminModerationView";
import { Lock, Mail, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Operational State (Loaded from Laravel Backend API)
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [captains, setCaptains] = useState<DeliveryCaptain[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [reels, setReels] = useState<ModeratedReel[]>([]);
  const [coupons, setCoupons] = useState<PlatformCoupon[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Login Form State
  const [email, setEmail] = useState("admin@souqna.com");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadDashboardData = useCallback(async (authToken: string) => {
    if (!authToken) return;
    setIsLoadingData(true);
    try {
      const [mRes, oRes, cRes, wRes, rRes, cpRes] = await Promise.all([
        adminApi.getMerchants(authToken),
        adminApi.getOrders(authToken),
        adminApi.getCaptains(authToken),
        adminApi.getWithdrawals(authToken),
        adminApi.getReels(authToken),
        adminApi.getCoupons(authToken),
      ]);

      if ([mRes, oRes, cRes, wRes, rRes, cpRes].some((r: any) => r?.status === 401)) {
        setUser(null);
        setToken("");
        localStorage.removeItem("souqna_admin_user");
        localStorage.removeItem("souqna_admin_token");
        showToast("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً");
        return;
      }

      if (mRes?.success) setMerchants(mRes.merchants || []);
      if (oRes?.success) setOrders(oRes.orders || []);
      if (cRes?.success) setCaptains(cRes.captains || []);
      if (wRes?.success) setWithdrawals(wRes.withdrawals || []);
      if (rRes?.success) setReels(rRes.reels || []);
      if (cpRes?.success) {
        setCoupons(
          (cpRes.coupons || []).map((c: any) => ({
            id: c.id,
            code: c.code,
            discount_percentage: c.discount_value ?? c.discount_percentage ?? 0,
            max_discount_amount: c.max_discount_amount ?? 0,
            min_order_amount: c.min_order_amount ?? 0,
            usage_count: c.usage_count ?? 0,
            max_usage_limit: c.max_usage_limit ?? 1000,
            is_active: c.is_active,
            expires_at: c.expires_at ?? "",
          }))
        );
      }
    } catch (_) {
      showToast("تعذر تحميل بعض البيانات من السيرفر");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Check saved session on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("souqna_admin_user");
      const savedToken = localStorage.getItem("souqna_admin_token");
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
        loadDashboardData(savedToken);
      }
    } catch (_) {}
  }, [loadDashboardData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!email.trim() || !password.trim()) {
      setLoginError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await adminApi.login(email.trim(), password);
      if (res?.success && res.token && res.admin) {
        setUser(res.admin);
        setToken(res.token);
        localStorage.setItem("souqna_admin_user", JSON.stringify(res.admin));
        localStorage.setItem("souqna_admin_token", res.token);
        showToast("تم تسجيل الدخول بنجاح كمدير للمنصة 👑");
        await loadDashboardData(res.token);
      } else {
        setLoginError(res?.message || "بيانات الدخول غير صحيحة");
      }
    } catch (_) {
      setLoginError("تعذر الاتصال بالسيرفر، تأكد من تشغيل الباك-إند");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await adminApi.logout(token).catch(() => {});
    }
    setUser(null);
    setToken("");
    localStorage.removeItem("souqna_admin_user");
    localStorage.removeItem("souqna_admin_token");
    showToast("تم تسجيل الخروج");
  };

  // Actions wired to real API
  const handleUpdateMerchantStatus = async (id: string, newStatus: MerchantStatus) => {
    const res =
      newStatus === "ACTIVE"
        ? await adminApi.approveMerchant(token, id)
        : await adminApi.suspendMerchant(token, id);

    if (res?.success) {
      setMerchants((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      );
      showToast(res.message || "تم تحديث حالة المتجر");
    } else {
      showToast(res?.message || "حدث خطأ أثناء تحديث المتجر");
    }
  };

  const handleUpdateCommissionRate = async (id: string, newRate: number) => {
    const res = await adminApi.updateCommission(token, id, newRate);
    if (res?.success) {
      setMerchants((prev) =>
        prev.map((m) => (m.id === id ? { ...m, commission_rate: newRate } : m))
      );
      showToast(`تم تعديل نسبة عمولة المتجر إلى ${newRate}%`);
    } else {
      showToast(res?.message || "حدث خطأ أثناء تحديث العمولة");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const res = await adminApi.updateOrderStatus(token, orderId, newStatus);
    if (res?.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      showToast(`تم تحديث حالة الطلب إلى: ${newStatus}`);
    } else {
      showToast(res?.message || "حدث خطأ أثناء تحديث الطلب");
    }
  };

  const handleAssignCaptain = async (orderId: string, captainId: string) => {
    const captain = captains.find((c) => c.id === captainId);
    if (!captain) return;

    const res = await adminApi.assignCaptain(token, orderId, captainId);
    if (res?.success) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, captain_id: captainId, captain_name: captain.name } : o
        )
      );
      setCaptains((prev) =>
        prev.map((c) => (c.id === captainId ? { ...c, status: "BUSY" } : c))
      );
      showToast(res.message || `تم تعيين الكابتن ${captain.name} للطلب 🛵`);
    } else {
      showToast(res?.message || "تعذر تعيين الكابتن");
    }
  };

  const handleVerifyDeliveryPin = async (orderId: string, inputPin: string): Promise<boolean> => {
    const res = await adminApi.confirmDelivery(token, orderId, inputPin);
    if (res?.success) {
      await loadDashboardData(token);
      showToast(res.message || "تم تأكيد كود الـ PIN وإغلاق الطلب بنجاح! 🥳");
      return true;
    }
    return false;
  };

  const handleUpdateCaptainStatus = async (captainId: string, status: CaptainStatus) => {
    const res = await adminApi.updateCaptainStatus(token, captainId, status);
    if (res?.success) {
      setCaptains((prev) =>
        prev.map((c) => (c.id === captainId ? { ...c, status } : c))
      );
      showToast(res.message || "تم تغيير حالة الكابتن");
    } else {
      showToast(res?.message || "تعذر تحديث حالة الكابتن");
    }
  };

  const handleAddCaptain = async (newCaptain: Omit<DeliveryCaptain, "id">) => {
    const res = await adminApi.createCaptain(token, newCaptain);
    if (res?.success && res.captain) {
      setCaptains((prev) => [res.captain, ...prev]);
      showToast(res.message || `تمت إضافة الكابتن ${newCaptain.name} بنجاح 🛵`);
    } else {
      showToast(res?.message || "تعذر إضافة الكابتن (تأكد من رقم الهاتف)");
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    const res = await adminApi.approveWithdrawal(token, id);
    if (res?.success) {
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: "APPROVED" } : w))
      );
      showToast(res.message || "تمت الموافقة على طلب السحب ✅");
    } else {
      showToast(res?.message || "تعذر اعتماد طلب السحب");
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    const res = await adminApi.rejectWithdrawal(token, id);
    if (res?.success) {
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: "REJECTED" } : w))
      );
      showToast(res.message || "تم رفض طلب السحب وإرجاع المبلغ للتاجر ❌");
    } else {
      showToast(res?.message || "تعذر رفض طلب السحب");
    }
  };

  const handleToggleReel = async (id: string) => {
    const res = await adminApi.toggleReel(token, id);
    if (res?.success) {
      setReels((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: res.is_active } : r))
      );
      showToast(res.message || "تم تحديث حالة ظهور الريل");
    }
  };

  const handleDeleteReel = async (id: string) => {
    const res = await adminApi.deleteReel(token, id);
    if (res?.success) {
      setReels((prev) => prev.filter((r) => r.id !== id));
      showToast(res.message || "تم حذف الريل نهائياً 🗑️");
    }
  };

  const handleToggleCoupon = async (id: string) => {
    const res = await adminApi.toggleCoupon(token, id);
    if (res?.success) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: res.is_active } : c))
      );
      showToast(res.message || "تم تحديث حالة كود الخصم");
    }
  };

  const handleCreateCoupon = async (newCoupon: Omit<PlatformCoupon, "id" | "usage_count">) => {
    const res = await adminApi.createCoupon(token, newCoupon);
    if (res?.success && res.coupon) {
      setCoupons((prev) => [
        {
          id: res.coupon.id,
          code: res.coupon.code,
          discount_percentage: res.coupon.value ?? res.coupon.discount_value ?? newCoupon.discount_percentage,
          max_discount_amount: res.coupon.max_discount_amount ?? 0,
          min_order_amount: res.coupon.min_order_amount ?? 0,
          usage_count: 0,
          max_usage_limit: res.coupon.max_uses ?? newCoupon.max_usage_limit,
          is_active: true,
          expires_at: res.coupon.expires_at ?? newCoupon.expires_at,
        },
        ...prev,
      ]);
      showToast(res.message || `تم إنشاء كود الخصم ${newCoupon.code} بنجاح! 🎟️`);
    } else {
      showToast(res?.message || "تعذر إنشاء الكوبون");
    }
  };

  // ===== Render: Login Screen if not authenticated =====
  if (!user) {
    return (
      <div className="min-h-screen bg-souqna-base text-souqna-text-primary flex items-center justify-center p-4 font-cairo">
        <div className="w-full max-w-md rounded-3xl bg-souqna-surface/90 backdrop-blur-2xl border border-souqna-border/80 p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-souqna-gold to-souqna-gold-dark flex items-center justify-center mx-auto shadow-gold-glow">
              <span className="text-3xl">🛒</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">سـوقـنا | لوحة الإدارة</h1>
            <p className="text-xs text-souqna-text-secondary">تسجيل دخول المشرفين ومديري العمليات</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold text-center">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-souqna-text-secondary block">البريد الإلكتروني للإدارة:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-souqna-text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@souqna.com"
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs focus:outline-none focus:border-souqna-gold font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-souqna-text-secondary block">كلمة المرور:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-souqna-text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs focus:outline-none focus:border-souqna-gold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-souqna-gold to-souqna-gold-dark text-souqna-base font-extrabold text-sm hover:opacity-95 shadow-gold-glow flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>دخول لوحة القيادة</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ===== Render: Authenticated Admin Shell & Modules =====
  const pendingMerchantsCount = merchants.filter((m) => m.status === "PENDING").length;
  const liveOrdersCount = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === "PENDING").length;
  const totalSales = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const platformCommission = orders.reduce((sum, o) => sum + o.platform_commission, 0);

  return (
    <>
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl bg-souqna-surface/95 border border-souqna-gold text-white text-xs font-bold shadow-gold-glow flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-souqna-gold shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {isLoadingData && (
        <div className="fixed top-4 left-6 z-50 px-3 py-1.5 rounded-xl bg-souqna-surface/90 border border-souqna-border text-souqna-gold text-xs font-bold flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>جاري التحديث...</span>
        </div>
      )}

      <AdminShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
        pendingMerchantsCount={pendingMerchantsCount}
        liveOrdersCount={liveOrdersCount}
        pendingWithdrawalsCount={pendingWithdrawalsCount}
      >
        {activeTab === "overview" && (
          <AdminOverviewView
            merchants={merchants}
            orders={orders}
            captains={captains}
            withdrawals={withdrawals}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === "merchants" && (
          <AdminMerchantsView
            merchants={merchants}
            onUpdateMerchantStatus={handleUpdateMerchantStatus}
            onUpdateCommissionRate={handleUpdateCommissionRate}
          />
        )}

        {activeTab === "orders" && (
          <AdminOrdersView
            orders={orders}
            captains={captains}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onAssignCaptain={handleAssignCaptain}
            onVerifyDeliveryPin={handleVerifyDeliveryPin}
          />
        )}

        {activeTab === "captains" && (
          <AdminCaptainsView
            captains={captains}
            onUpdateCaptainStatus={handleUpdateCaptainStatus}
            onAddCaptain={handleAddCaptain}
            onOpenPinModal={() => setActiveTab("orders")}
          />
        )}

        {activeTab === "financials" && (
          <AdminFinancialsView
            withdrawals={withdrawals}
            totalSales={totalSales}
            platformCommission={platformCommission}
            onApproveWithdrawal={handleApproveWithdrawal}
            onRejectWithdrawal={handleRejectWithdrawal}
          />
        )}

        {activeTab === "moderation" && (
          <AdminModerationView
            reels={reels}
            coupons={coupons}
            onToggleReelStatus={handleToggleReel}
            onDeleteReel={handleDeleteReel}
            onToggleCouponStatus={handleToggleCoupon}
            onCreateCoupon={handleCreateCoupon}
          />
        )}
      </AdminShell>
    </>
  );
}
