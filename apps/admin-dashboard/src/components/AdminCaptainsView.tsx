// src/components/AdminCaptainsView.tsx
"use client";

import React, { useState } from "react";
import {
  Bike,
  Plus,
  Phone,
  Star,
  MapPin,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  DollarSign,
  Car,
  Navigation,
  KeyRound,
} from "lucide-react";
import { CaptainStatus, DeliveryCaptain } from "../types/admin";

interface AdminCaptainsViewProps {
  captains: DeliveryCaptain[];
  onUpdateCaptainStatus: (captainId: string, status: CaptainStatus) => void;
  onAddCaptain: (captain: Omit<DeliveryCaptain, "id">) => void;
  onOpenPinModal: (orderId: string) => void;
}

export const AdminCaptainsView: React.FC<AdminCaptainsViewProps> = ({
  captains,
  onUpdateCaptainStatus,
  onAddCaptain,
  onOpenPinModal,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCaptainName, setNewCaptainName] = useState("");
  const [newCaptainPhone, setNewCaptainPhone] = useState("");
  const [newCaptainVehicle, setNewCaptainVehicle] = useState<"MOTORCYCLE" | "BICYCLE" | "CAR">("MOTORCYCLE");
  const [newCaptainZone, setNewCaptainZone] = useState("المعادي والزهراء");

  const availableCount = captains.filter((c) => c.status === "AVAILABLE").length;
  const busyCount = captains.filter((c) => c.status === "BUSY").length;
  const offlineCount = captains.filter((c) => c.status === "OFFLINE").length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaptainName.trim() || !newCaptainPhone.trim()) return;

    onAddCaptain({
      name: newCaptainName.trim(),
      phone: newCaptainPhone.trim(),
      vehicle_type: newCaptainVehicle,
      status: "AVAILABLE",
      completed_today: 0,
      total_earnings_today: 0,
      rating: 5.0,
      current_zone: newCaptainZone,
    });

    setNewCaptainName("");
    setNewCaptainPhone("");
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white">إدارة أسطول المناديب والعمليات</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-souqna-gold/15 text-souqna-gold border border-souqna-gold/30">
              بديل تطبيق المندوب
            </span>
          </div>
          <p className="text-xs text-souqna-text-secondary mt-1">
            متابعة فورية للمناديب في كل مناطق القاهرة، تغيير الحالة يدوياً، متابعة خط السير، وتأكيد التسليم برمز الـ PIN.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-souqna-gold to-souqna-gold-dark text-souqna-base font-bold text-xs hover:opacity-95 shadow-gold-glow flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة كابتن توصيل جديد</span>
        </button>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-souqna-surface border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-souqna-text-muted block">جاهز ومتاح للطلبات</span>
            <span className="font-extrabold text-2xl text-emerald-400">{availableCount} كابتن</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Bike className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-souqna-surface border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-souqna-text-muted block">في مشوار توصيل حالياً</span>
            <span className="font-extrabold text-2xl text-amber-400">{busyCount} كابتن</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400">
            <Navigation className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-souqna-surface border border-souqna-border flex items-center justify-between">
          <div>
            <span className="text-xs text-souqna-text-muted block">أوفلاين أو غير متاح</span>
            <span className="font-extrabold text-2xl text-souqna-text-muted">{offlineCount} كابتن</span>
          </div>
          <div className="p-3 rounded-xl bg-souqna-card text-souqna-text-muted">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Captains Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {captains.map((captain) => {
          const isAvail = captain.status === "AVAILABLE";
          const isBusy = captain.status === "BUSY";
          const isOff = captain.status === "OFFLINE";

          return (
            <div
              key={captain.id}
              className={`rounded-3xl p-5 bg-souqna-surface border transition-all flex flex-col justify-between gap-5 ${
                isBusy
                  ? "border-amber-500/50 shadow-gold-glow/10"
                  : isAvail
                  ? "border-emerald-500/30"
                  : "border-souqna-border opacity-70"
              }`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-souqna-card border border-souqna-border flex items-center justify-center text-xl shrink-0">
                      {captain.vehicle_type === "CAR" ? "🚗" : captain.vehicle_type === "BICYCLE" ? "🚲" : "🏍️"}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{captain.name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-souqna-text-muted mt-0.5">
                        <MapPin className="w-3 h-3 text-souqna-gold" />
                        <span>{captain.current_zone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Pill */}
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                      isAvail
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : isBusy
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                    }`}
                  >
                    {isAvail ? "متاح 🟢" : isBusy ? "مشغول 🟡" : "أوفلاين 🔴"}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-souqna-card/80 border border-souqna-border/50">
                    <span className="text-[10px] text-souqna-text-muted block">طلبات اليوم</span>
                    <span className="font-bold text-white text-sm">{captain.completed_today}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-souqna-card/80 border border-souqna-border/50">
                    <span className="text-[10px] text-souqna-text-muted block">أرباح اليوم</span>
                    <span className="font-bold text-emerald-400 text-sm">{captain.total_earnings_today} ج</span>
                  </div>
                  <div className="p-2 rounded-xl bg-souqna-card/80 border border-souqna-border/50">
                    <span className="text-[10px] text-souqna-text-muted block">التقييم</span>
                    <span className="font-bold text-white text-sm flex items-center justify-center gap-0.5">
                      <Star className="w-3 h-3 text-souqna-gold fill-souqna-gold" />
                      {captain.rating}
                    </span>
                  </div>
                </div>

                {/* Active Order & PIN Alert */}
                {isBusy && captain.active_order_code && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-300 font-semibold">يقوم بتوصيل طلب:</span>
                      <span className="font-bold text-white font-mono">#{captain.active_order_code}</span>
                    </div>
                    {captain.active_order_id && (
                      <button
                        onClick={() => onOpenPinModal(captain.active_order_id!)}
                        className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-bold text-amber-200 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>تأكيد كود PIN لإغلاق التوصيل</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-souqna-text-muted pt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-souqna-gold" />
                    <span>{captain.phone}</span>
                  </span>
                  <span className="text-[11px]">
                    المركبة: {captain.vehicle_type === "CAR" ? "سيارة" : captain.vehicle_type === "BICYCLE" ? "عجلة" : "موتوسيكل"}
                  </span>
                </div>
              </div>

              {/* Status Switcher (Admin Control) */}
              <div className="pt-3 border-t border-souqna-border/60">
                <label className="text-[11px] text-souqna-text-muted block mb-1.5">تعديل حالة الكابتن يدوياً:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => onUpdateCaptainStatus(captain.id, "AVAILABLE")}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isAvail ? "bg-emerald-500 text-souqna-base font-extrabold shadow-sm" : "bg-souqna-card text-souqna-text-secondary hover:text-white"
                    }`}
                  >
                    متاح
                  </button>
                  <button
                    onClick={() => onUpdateCaptainStatus(captain.id, "BUSY")}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isBusy ? "bg-amber-500 text-souqna-base font-extrabold shadow-sm" : "bg-souqna-card text-souqna-text-secondary hover:text-white"
                    }`}
                  >
                    مشغول
                  </button>
                  <button
                    onClick={() => onUpdateCaptainStatus(captain.id, "OFFLINE")}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isOff ? "bg-gray-600 text-white font-extrabold" : "bg-souqna-card text-souqna-text-secondary hover:text-white"
                    }`}
                  >
                    أوفلاين
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Captain Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-3xl bg-souqna-surface border border-souqna-border p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-souqna-border/60 pb-3">
              <h3 className="font-bold text-base text-white">إضافة مندوب توصيل جديد للأدمن</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-souqna-text-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-souqna-text-secondary block mb-1">اسم المندوب:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: سامح مصطفى"
                  value={newCaptainName}
                  onChange={(e) => setNewCaptainName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs focus:outline-none focus:border-souqna-gold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-souqna-text-secondary block mb-1">رقم الموبايل:</label>
                <input
                  type="tel"
                  required
                  placeholder="010XXXXXXXX"
                  value={newCaptainPhone}
                  onChange={(e) => setNewCaptainPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs focus:outline-none focus:border-souqna-gold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-souqna-text-secondary block mb-1">نوع المركبة:</label>
                <select
                  value={newCaptainVehicle}
                  onChange={(e) => setNewCaptainVehicle(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs focus:outline-none focus:border-souqna-gold"
                >
                  <option value="MOTORCYCLE">موتوسيكل (سريع)</option>
                  <option value="BICYCLE">عجلة / سكوتر كهربائي</option>
                  <option value="CAR">سيارة (طلبات كبيرة)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-souqna-text-secondary block mb-1">منطقة التغطية الأساسية:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: المعادي، التجمع، مدينة نصر"
                  value={newCaptainZone}
                  onChange={(e) => setNewCaptainZone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs focus:outline-none focus:border-souqna-gold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-souqna-border/60">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-souqna-card text-souqna-text-secondary hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-souqna-gold text-souqna-base font-bold text-xs hover:bg-souqna-gold-dark shadow-gold-glow"
              >
                إضافة الكابتن
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
