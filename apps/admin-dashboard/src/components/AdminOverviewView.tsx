// src/components/AdminOverviewView.tsx
"use client";

import React from "react";
import {
  TrendingUp,
  Store,
  ShoppingBag,
  Bike,
  Wallet,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import {
  AdminMerchant,
  AdminOrder,
  DeliveryCaptain,
  WithdrawalRequest,
} from "../types/admin";

interface AdminOverviewViewProps {
  merchants: AdminMerchant[];
  orders: AdminOrder[];
  captains: DeliveryCaptain[];
  withdrawals: WithdrawalRequest[];
  onNavigateTab: (tab: string) => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  merchants,
  orders,
  captains,
  withdrawals,
  onNavigateTab,
}) => {
  // Aggregate Metrics
  const totalSales = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const platformCommission = orders.reduce((sum, o) => sum + o.platform_commission, 0);
  const activeMerchants = merchants.filter((m) => m.status === "ACTIVE").length;
  const pendingMerchants = merchants.filter((m) => m.status === "PENDING").length;
  const activeCaptains = captains.filter((c) => c.status !== "OFFLINE").length;
  const pendingWithdrawalsTotal = withdrawals
    .filter((w) => w.status === "PENDING")
    .reduce((sum, w) => sum + w.amount, 0);

  const kpis = [
    {
      label: "إجمالي مبيعات المنصة (GMV)",
      value: `${totalSales.toLocaleString()} ج.م`,
      change: "+18.4% هذا الأسبوع",
      icon: TrendingUp,
      color: "from-amber-500/20 to-amber-500/5",
      border: "border-amber-500/30",
      text: "text-amber-400",
    },
    {
      label: "صافي عمولات سوقنا المستحقة",
      value: `${platformCommission.toLocaleString()} ج.م`,
      change: "متوسط عمولة 10.5%",
      icon: Sparkles,
      color: "from-emerald-500/20 to-emerald-500/5",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
    },
    {
      label: "المتاجر المعتمدة والنشطة",
      value: activeMerchants.toString(),
      subtext: pendingMerchants > 0 ? `${pendingMerchants} في انتظار الموافقة` : "جميع المتاجر معتمدة",
      icon: Store,
      color: "from-blue-500/20 to-blue-500/5",
      border: "border-blue-500/30",
      text: "text-blue-400",
      badgeAction: pendingMerchants > 0 ? () => onNavigateTab("merchants") : undefined,
    },
    {
      label: "المناديب الجاهزين للتوصيل",
      value: `${activeCaptains} / ${captains.length}`,
      subtext: "تغطية كاملة للقاهرة والجيزة",
      icon: Bike,
      color: "from-purple-500/20 to-purple-500/5",
      border: "border-purple-500/30",
      text: "text-purple-400",
    },
  ];

  return (
    <div className="space-y-8 font-cairo">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-souqna-surface via-souqna-card to-souqna-surface border border-souqna-border/80 p-6 lg:p-8 shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-souqna-gold/15 text-souqna-gold border border-souqna-gold/30 text-xs font-bold">
              <span>🚀 النظام يعمل بكامل طاقته</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white">
              مرحباً بك في غرفة عمليات <span className="text-souqna-gold">سـوقـنا</span>!
            </h2>
            <p className="text-sm text-souqna-text-secondary max-w-xl leading-relaxed">
              تحكم كامل في حركة الطلبات اللحظية، مراقبة المناديب، اعتماد المتاجر الجديدة، وصرف أرباح الشركاء بنقرة واحدة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab("orders")}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-souqna-gold to-souqna-gold-dark text-souqna-base font-bold text-sm hover:opacity-95 shadow-gold-glow transition-all"
            >
              متابعة الطلبات الحية ({orders.filter((o) => o.status !== "delivered").length})
            </button>
            <button
              onClick={() => onNavigateTab("captains")}
              className="px-5 py-3 rounded-2xl bg-souqna-card border border-souqna-border text-souqna-text-primary hover:border-souqna-gold text-sm font-bold transition-all"
            >
              المناديب وتأكيد الـ PIN 🛵
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-6 rounded-3xl bg-gradient-to-b ${kpi.color} bg-souqna-surface/90 border ${kpi.border} shadow-card space-y-4`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-souqna-text-secondary">{kpi.label}</span>
                <div className={`p-2.5 rounded-2xl bg-souqna-base/60 ${kpi.text}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">{kpi.value}</h3>
                {kpi.change && <p className="text-xs text-emerald-400 font-semibold mt-1">{kpi.change}</p>}
                {kpi.subtext && (
                  <p className="text-xs text-souqna-text-muted font-medium mt-1 flex items-center justify-between">
                    <span>{kpi.subtext}</span>
                    {kpi.badgeAction && (
                      <button
                        onClick={kpi.badgeAction}
                        className="text-amber-400 hover:underline font-bold text-[11px]"
                      >
                        عرض الآن ←
                      </button>
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Live Order Stream & Quick Dispatch Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Orders Stream (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl bg-souqna-surface border border-souqna-border p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-lg font-bold text-white">فيد الطلبات المباشر</h3>
            </div>
            <button
              onClick={() => onNavigateTab("orders")}
              className="text-xs font-bold text-souqna-gold hover:underline flex items-center gap-1"
            >
              <span>عرض كل الطلبات</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 4).map((order) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                pending: { label: "بانتظار التأكيد", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
                preparing: { label: "جاري التجهيز بالمطبخ", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
                on_the_way: { label: "في الطريق للعميل", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
                delivered: { label: "تم التسليم بنجاح", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
              };
              const statusInfo = statusMap[order.status] || { label: order.status, color: "bg-gray-500/20 text-gray-400" };

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-souqna-card/80 border border-souqna-border/60 hover:border-souqna-gold/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-sm text-white font-mono">{order.order_code}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xs text-souqna-text-muted">{order.created_at}</span>
                    </div>
                    <p className="text-xs text-souqna-text-secondary truncate">
                      <span className="text-white font-semibold">{order.store_name}</span> ◄ {order.items_summary}
                    </p>
                    <p className="text-[11px] text-souqna-text-muted flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-souqna-gold shrink-0" />
                      <span className="truncate">{order.delivery_address}</span>
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                    <span className="font-extrabold text-base text-souqna-gold font-cairo">
                      {order.total_amount} ج.م
                    </span>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      عمولة: {order.platform_commission} ج
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Quick Actions & Captains Alert (1 col) */}
        <div className="space-y-6">
          {/* Captains Live Status widget */}
          <div className="rounded-3xl bg-souqna-surface border border-souqna-border p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bike className="w-5 h-5 text-souqna-gold" />
                <span>المناديب النشطين</span>
              </h3>
              <button
                onClick={() => onNavigateTab("captains")}
                className="text-xs font-bold text-souqna-gold hover:underline"
              >
                إدارة
              </button>
            </div>

            <div className="space-y-3">
              {captains.slice(0, 3).map((cap) => (
                <div
                  key={cap.id}
                  className="p-3 rounded-2xl bg-souqna-card/70 border border-souqna-border/50 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{cap.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          cap.status === "AVAILABLE"
                            ? "bg-emerald-400"
                            : cap.status === "BUSY"
                            ? "bg-amber-400"
                            : "bg-gray-500"
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-souqna-text-muted">{cap.current_zone}</p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cap.status === "AVAILABLE"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : cap.status === "BUSY"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {cap.status === "AVAILABLE" ? "متاح" : cap.status === "BUSY" ? "في مشوار" : "أوفلاين"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Withdrawals Notification */}
          <div className="rounded-3xl bg-gradient-to-br from-rose-500/15 to-souqna-surface border border-rose-500/30 p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-bold">طلبات سحب معلقة</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                {withdrawals.filter((w) => w.status === "PENDING").length} طلبات
              </span>
            </div>
            <p className="text-xs text-souqna-text-secondary">
              يوجد إجمالي <span className="font-bold text-white">{pendingWithdrawalsTotal.toLocaleString()} ج.م</span> مطلوب
              صرفها للمتاجر الشريكة.
            </p>
            <button
              onClick={() => onNavigateTab("financials")}
              className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-bold text-rose-300 transition-colors"
            >
              مراجعة وصرف السحوبات الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
