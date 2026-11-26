// src/components/AdminOrdersView.tsx
"use client";

import React, { useState } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  MapPin,
  Phone,
  Bike,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Eye,
  KeyRound,
} from "lucide-react";
import { AdminOrder, DeliveryCaptain, OrderStatus } from "../types/admin";

interface AdminOrdersViewProps {
  orders: AdminOrder[];
  captains: DeliveryCaptain[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onAssignCaptain: (orderId: string, captainId: string) => void;
  onVerifyDeliveryPin: (orderId: string, inputPin: string) => boolean;
}

export const AdminOrdersView: React.FC<AdminOrdersViewProps> = ({
  orders,
  captains,
  onUpdateOrderStatus,
  onAssignCaptain,
  onVerifyDeliveryPin,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [pinModalOrder, setPinModalOrder] = useState<AdminOrder | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<AdminOrder | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_phone.includes(searchQuery) ||
      o.store_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "ALL" || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleConfirmPin = () => {
    if (!pinModalOrder) return;
    setPinError("");
    const isValid = onVerifyDeliveryPin(pinModalOrder.id, enteredPin.trim());
    if (isValid) {
      setPinModalOrder(null);
      setEnteredPin("");
    } else {
      setPinError("كود الاستلام (PIN) غير صحيح! تأكد من العميل أو المندوب.");
    }
  };

  const statusLabels: Record<OrderStatus, { text: string; bg: string; border: string }> = {
    pending: { text: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" },
    confirmed: { text: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30" },
    preparing: { text: "text-indigo-400", bg: "bg-indigo-500/15", border: "border-indigo-500/30" },
    ready: { text: "text-teal-400", bg: "bg-teal-500/15", border: "border-teal-500/30" },
    on_the_way: { text: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30" },
    delivered: { text: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
    cancelled: { text: "text-rose-400", bg: "bg-rose-500/15", border: "border-rose-500/30" },
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">الطلبات الحية والعمليات</h2>
          <p className="text-xs text-souqna-text-secondary mt-1">
            مراقبة كل طلبات المنصة لحظياً، تعيين المناديب، التدخل لتعديل الحالات، وتأكيد التسليم بكود الـ PIN.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-souqna-surface border border-souqna-border text-xs">
            <span className="text-souqna-text-muted">إجمالي طلبات اليوم: </span>
            <span className="font-extrabold text-souqna-gold text-sm">{orders.length} طلب</span>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-souqna-surface border border-souqna-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-souqna-text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث برقم الطلب (ORD-xxx)، اسم العميل، الهاتف، أو المتجر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-souqna-card border border-souqna-border/80 text-white placeholder-souqna-text-muted text-xs focus:outline-none focus:border-souqna-gold"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: "ALL", label: "الكل" },
            { id: "pending", label: "جديد معلق" },
            { id: "preparing", label: "في المطبخ" },
            { id: "on_the_way", label: "في الطريق" },
            { id: "delivered", label: "تم التسليم" },
            { id: "cancelled", label: "ملغي" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                filterStatus === tab.id
                  ? "bg-souqna-gold text-souqna-base shadow-sm"
                  : "bg-souqna-card text-souqna-text-secondary hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Cards */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const cfg = statusLabels[order.status] || { text: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20" };

          return (
            <div
              key={order.id}
              className="p-5 rounded-3xl bg-souqna-surface border border-souqna-border hover:border-souqna-gold/40 transition-all shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Order Meta & Info */}
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-extrabold text-base text-white font-mono tracking-wider">
                    #{order.order_code}
                  </span>
                  <span className={`text-[11px] font-extrabold px-3 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    {order.status === "pending"
                      ? "بانتظار التأكيد"
                      : order.status === "preparing"
                      ? "جاري التجهيز بالمطبخ"
                      : order.status === "on_the_way"
                      ? "في الطريق للتسليم"
                      : order.status === "delivered"
                      ? "تم التسليم بنجاح"
                      : "ملغي"}
                  </span>
                  <span className="text-xs text-souqna-text-muted">{order.created_at}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-souqna-card text-souqna-gold border border-souqna-border">
                    {order.store_name}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    العميل: {order.customer_name} ({order.customer_phone})
                  </p>
                  <p className="text-xs text-souqna-text-secondary flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-souqna-gold shrink-0" />
                    <span>{order.delivery_address}</span>
                  </p>
                  <p className="text-xs text-souqna-text-muted truncate">
                    الأصناف: {order.items_summary} ({order.items_count} قطع)
                  </p>
                </div>
              </div>

              {/* Price & PIN Info */}
              <div className="flex lg:flex-col items-center lg:items-end justify-between gap-1 border-t lg:border-t-0 pt-3 lg:pt-0 border-souqna-border/50 shrink-0">
                <div className="text-left">
                  <span className="text-xs text-souqna-text-muted block">الإجمالي:</span>
                  <span className="font-extrabold text-xl text-souqna-gold font-cairo">
                    {order.total_amount} ج.م
                  </span>
                </div>
                <div className="text-right lg:text-left text-xs text-souqna-text-secondary">
                  <span>عمولة: </span>
                  <span className="font-bold text-emerald-400">{order.platform_commission} ج</span>
                </div>
              </div>

              {/* Action Buttons (Dispatch, PIN confirm, Status transitions) */}
              <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-souqna-border/50 shrink-0">
                {/* Delivery PIN Button */}
                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <button
                    onClick={() => {
                      setPinModalOrder(order);
                      setEnteredPin("");
                      setPinError("");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    title="تأكيد التسليم بكود PIN العميل"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>تأكيد كود PIN</span>
                  </button>
                )}

                {/* Quick Captain Assign selector */}
                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <div className="flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-souqna-text-muted" />
                    <select
                      value={order.captain_id || ""}
                      onChange={(e) => onAssignCaptain(order.id, e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-souqna-card border border-souqna-border text-xs text-white focus:outline-none focus:border-souqna-gold"
                    >
                      <option value="">
                        {order.captain_name ? `الكابتن: ${order.captain_name}` : "تعيين كابتن..."}
                      </option>
                      {captains.map((cap) => (
                        <option key={cap.id} value={cap.id}>
                          {cap.name} ({cap.status === "AVAILABLE" ? "متاح" : "مشغول"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quick Status Override */}
                {order.status === "pending" && (
                  <button
                    onClick={() => onUpdateOrderStatus(order.id, "preparing")}
                    className="px-3.5 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold text-xs transition-colors"
                  >
                    بدء التجهيز
                  </button>
                )}

                {order.status === "preparing" && (
                  <button
                    onClick={() => onUpdateOrderStatus(order.id, "on_the_way")}
                    className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs transition-colors"
                  >
                    خرج للتوصيل 🛵
                  </button>
                )}

                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <button
                    onClick={() => onUpdateOrderStatus(order.id, "cancelled")}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs transition-colors"
                    title="إلغاء الطلب"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Enter Delivery PIN */}
      {pinModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-souqna-surface border border-souqna-border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-souqna-border/60 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">تأكيد تسليم الطلب بكود الـ PIN</h3>
              </div>
              <button
                onClick={() => setPinModalOrder(null)}
                className="text-souqna-text-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-souqna-text-secondary leading-relaxed">
                اطلب من المندوب أو العميل كود التسليم المكون من 4 أرقام لتأكيد استلام الطلب رسمياً وإغلاقه في النظام.
              </p>
              <div className="p-3 rounded-xl bg-souqna-card border border-souqna-border text-xs space-y-1">
                <p className="text-white">
                  الطلب: <span className="font-bold font-mono">#{pinModalOrder.order_code}</span>
                </p>
                <p className="text-souqna-text-muted">العميل: {pinModalOrder.customer_name}</p>
                <p className="text-[11px] text-amber-400/80">
                  (كود الاختبار التوضيحي للأدمن: <span className="font-mono font-bold">{pinModalOrder.delivery_pin}</span>)
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-souqna-text-secondary block mb-1">
                  أدخل رمز الاستلام (4 أرقام):
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="••••"
                  className="w-full p-3.5 rounded-xl bg-souqna-card border border-souqna-border text-center text-2xl font-bold tracking-[0.5em] text-white focus:outline-none focus:border-souqna-gold font-mono"
                />
              </div>

              {pinError && <p className="text-xs text-rose-400 font-bold">{pinError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-souqna-border/60">
              <button
                onClick={() => setPinModalOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-souqna-card text-souqna-text-secondary hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmPin}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-souqna-base font-extrabold text-xs shadow-emerald-glow/20"
              >
                تأكيد التسليم بنجاح ✅
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
