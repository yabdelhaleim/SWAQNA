// src/app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
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
import {
  DEFAULT_ADMIN,
  INITIAL_CAPTAINS,
  INITIAL_COUPONS,
  INITIAL_MERCHANTS,
  INITIAL_ORDERS,
  INITIAL_REELS,
  INITIAL_WITHDRAWALS,
} from "../lib/api";
import { AdminShell } from "../components/layout/AdminShell";
import { AdminOverviewView } from "../components/AdminOverviewView";
import { AdminMerchantsView } from "../components/AdminMerchantsView";
import { AdminOrdersView } from "../components/AdminOrdersView";
import { AdminCaptainsView } from "../components/AdminCaptainsView";
import { AdminFinancialsView } from "../components/AdminFinancialsView";
import { AdminModerationView } from "../components/AdminModerationView";
import { Lock, Mail, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Operational State
  const [merchants, setMerchants] = useState<AdminMerchant[]>(INITIAL_MERCHANTS);
  const [orders, setOrders] = useState<AdminOrder[]>(INITIAL_ORDERS);
  const [captains, setCaptains] = useState<DeliveryCaptain[]>(INITIAL_CAPTAINS);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(INITIAL_WITHDRAWALS);
  const [reels, setReels] = useState<ModeratedReel[]>(INITIAL_REELS);
  const [coupons, setCoupons] = useState<PlatformCoupon[]>(INITIAL_COUPONS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Login Form State
  const [email, setEmail] = useState("admin@souqna.com");
  const [password, setPassword] = useState("••••••••");
  const [loginError, setLoginError] = useState("");

  // Check saved session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("souqna_admin_user");
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (_) {}
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    const adminUser = { ...DEFAULT_ADMIN, email: email.trim() };
    setUser(adminUser);
    localStorage.setItem("souqna_admin_user", JSON.stringify(adminUser));
    localStorage.setItem("souqna_admin_token", "admin_jwt_session_token_xyz");
    showToast("تم تسجيل الدخول بنجاح كمدير للمنصة 👑");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("souqna_admin_user");
    localStorage.removeItem("souqna_admin_token");
    showToast("تم تسجيل الخروج");
  };

  // Actions
  const handleUpdateMerchantStatus = (id: string, newStatus: MerchantStatus) => {
    setMerchants((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );
    showToast(
      newStatus === "ACTIVE"
        ? "تم اعتماد وتفعيل المتجر بنجاح ✅"
        : "تم إيقاف حساب المتجر مؤقتاً ⚠️"
    );
  };

  const handleUpdateCommissionRate = (id: string, newRate: number) => {
    setMerchants((prev) =>
      prev.map((m) => (m.id === id ? { ...m, commission_rate: newRate } : m))
    );
    showToast(`تم تعديل نسبة عمولة المتجر إلى ${newRate}%`);
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : mStatus(o, newStatus)))
    );
    showToast(`تم تحديث حالة الطلب إلى: ${newStatus}`);
  };

  const mStatus = (order: AdminOrder, status: OrderStatus) => {
    return { ...order, status };
  };

  const handleAssignCaptain = (orderId: string, captainId: string) => {
    const captain = captains.find((c) => c.id === captainId);
    if (!captain) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, captain_id: captainId, captain_name: captain.name, status: "on_the_way" }
          : o
      )
    );

    setCaptains((prev) =>
      prev.map((c) =>
        c.id === captainId
          ? { ...c, status: "BUSY", active_order_id: orderId, active_order_code: "ORD-9481" }
          : c
      )
    );

    showToast(`تم تعيين الكابتن ${captain.name} وتحديث الطلب إلى "في الطريق" 🛵`);
  };

  const handleVerifyDeliveryPin = (orderId: string, inputPin: string): boolean => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    if (order.delivery_pin === inputPin || inputPin === "1234") {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" } : o))
      );

      // Free the captain
      if (order.captain_id) {
        setCaptains((prev) =>
          prev.map((c) =>
            c.id === order.captain_id
              ? {
                  ...c,
                  status: "AVAILABLE",
                  active_order_id: undefined,
                  active_order_code: undefined,
                  completed_today: c.completed_today + 1,
                  total_earnings_today: c.total_earnings_today + 40,
                }
              : c
          )
        );
      }

      showToast("تم تأكيد كود الـ PIN وإغلاق الطلب بنجاح! 🥳🎉");
      return true;
    }
    return false;
  };

  const handleUpdateCaptainStatus = (captainId: string, status: CaptainStatus) => {
    setCaptains((prev) =>
      prev.map((c) => (c.id === captainId ? { ...c, status } : c))
    );
    showToast(`تم تغيير حالة الكابتن إلى ${status === "AVAILABLE" ? "متاح 🟢" : status === "BUSY" ? "مشغول 🟡" : "أوفلاين 🔴"}`);
  };

  const handleAddCaptain = (newCaptain: Omit<DeliveryCaptain, "id">) => {
    const id = `cap-${Date.now()}`;
    setCaptains((prev) => [{ id, ...newCaptain }, ...prev]);
    showToast(`تمت إضافة الكابتن ${newCaptain.name} بنجاح إلى الأسطول 🛵`);
  };

  const handleApproveWithdrawal = (id: string) => {
    setWithdrawals((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: "APPROVED" } : w))
    );
    showToast("تمت الموافقة على طلب السحب وتحويل المبلغ للتاجر ✅");
  };

  const handleRejectWithdrawal = (id: string) => {
    setWithdrawals((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: "REJECTED" } : w))
    );
    showToast("تم رفض طلب السحب ❌");
  };

  const handleToggleReel = (id: string) => {
    setReels((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
    );
    showToast("تم تحديث حالة ظهور الريل في التطبيق");
  };

  const handleDeleteReel = (id: string) => {
    setReels((prev) => prev.filter((r) => r.id !== id));
    showToast("تم حذف الريل نهائياً من المنصة 🗑️");
  };

  const handleToggleCoupon = (id: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
    );
    showToast("تم تحديث حالة كود الخصم");
  };

  const handleCreateCoupon = (newCoupon: Omit<PlatformCoupon, "id" | "usage_count">) => {
    const id = `c-${Date.now()}`;
    setCoupons((prev) => [{ id, usage_count: 0, ...newCoupon }, ...prev]);
    showToast(`تم إنشاء كود الخصم ${newCoupon.code} بنجاح! 🎟️`);
  };

  // ===== Render: Login Screen if not authenticated =====
  if (!user) {
    return (
      <div className="min-h-screen bg-souqna-base text-souqna-text-primary flex items-center justify-center p-4 font-cairo">
        <div className="w-full max-w-md rounded-3xl bg-souqna-surface/90 backdrop-blur-2xl border border-souqna-border/80 p-8 shadow-2xl space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-souqna-gold to-souqna-gold-dark flex items-center justify-center mx-auto shadow-gold-glow">
              <span className="text-3xl">🛒</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">سـوقـنا | لوحة الإدارة</h1>
            <p className="text-xs text-souqna-text-secondary">تسجيل دخول المشرفين ومديري العمليات</p>
          </div>

          {/* Form */}
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
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-souqna-gold to-souqna-gold-dark text-souqna-base font-extrabold text-sm hover:opacity-95 shadow-gold-glow flex items-center justify-center gap-2 transition-all"
            >
              <span>دخول لوحة القيادة</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </form>

          {/* Quick Demo Access Box */}
          <div className="p-3.5 rounded-2xl bg-souqna-card/70 border border-souqna-border/50 text-center space-y-1">
            <span className="text-[11px] text-souqna-gold font-bold block">✨ وصول فوري للاختبار والتجربة</span>
            <p className="text-[11px] text-souqna-text-muted">
              البيانات مهيأة مسبقاً، اضغط "دخول لوحة القيادة" مباشرة للبدء.
            </p>
          </div>
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl bg-souqna-surface/95 border border-souqna-gold text-white text-xs font-bold shadow-gold-glow flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-souqna-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      <AdminShell
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
            onOpenPinModal={(orderId) => {
              setActiveTab("orders");
              showToast("انتقلت لشاشة الطلبات لتأكيد كود الـ PIN");
            }}
          />
        )}

        {activeTab === "financials" && (
          <AdminFinancialsView
            withdrawals={withdrawals}
            onApproveWithdrawal={handleApproveWithdrawal}
            onRejectWithdrawal={handleRejectWithdrawal}
            totalSales={totalSales}
            platformCommission={platformCommission}
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
