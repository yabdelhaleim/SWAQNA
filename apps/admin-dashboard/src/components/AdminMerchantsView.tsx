// src/components/AdminMerchantsView.tsx
"use client";

import React, { useState } from "react";
import {
  Store,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Sliders,
  DollarSign,
  Phone,
  Star,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { AdminMerchant, MerchantStatus } from "../types/admin";

interface AdminMerchantsViewProps {
  merchants: AdminMerchant[];
  onUpdateMerchantStatus: (id: string, newStatus: MerchantStatus) => void;
  onUpdateCommissionRate: (id: string, newRate: number) => void;
}

export const AdminMerchantsView: React.FC<AdminMerchantsViewProps> = ({
  merchants,
  onUpdateMerchantStatus,
  onUpdateCommissionRate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedMerchant, setSelectedMerchant] = useState<AdminMerchant | null>(null);
  const [customRateInput, setCustomRateInput] = useState<number>(10);

  const filteredMerchants = merchants.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery);

    const matchesStatus = filterStatus === "ALL" || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCount = merchants.filter((m) => m.status === "ACTIVE").length;
  const pendingCount = merchants.filter((m) => m.status === "PENDING").length;
  const suspendedCount = merchants.filter((m) => m.status === "SUSPENDED").length;

  return (
    <div className="space-y-6 font-cairo">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">إدارة المتاجر والشركاء</h2>
          <p className="text-xs text-souqna-text-secondary mt-1">
            اعتماد المطابخ والمتاجر الجديدة، تحديد نسب عمولة المنصة، والتحكم في إيقاف أو تفعيل الحسابات.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-souqna-surface border border-souqna-border text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-bold text-white">{activeCount} نشط</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-souqna-surface border border-amber-500/40 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="font-bold text-amber-400">{pendingCount} معلق</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-souqna-surface border border-souqna-border text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="font-bold text-rose-400">{suspendedCount} موقوف</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-souqna-surface border border-souqna-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-souqna-text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث باسم المتجر، التاجر، أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-souqna-card border border-souqna-border/80 text-white placeholder-souqna-text-muted text-xs focus:outline-none focus:border-souqna-gold"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: "ALL", label: "الكل" },
            { id: "ACTIVE", label: "المعتمدة" },
            { id: "PENDING", label: "قيد المراجعة" },
            { id: "SUSPENDED", label: "الموقوفة" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
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

      {/* Merchants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMerchants.map((merchant) => {
          const isPending = merchant.status === "PENDING";
          const isActive = merchant.status === "ACTIVE";
          const isSuspended = merchant.status === "SUSPENDED";

          return (
            <div
              key={merchant.id}
              className={`rounded-3xl p-5 bg-souqna-surface border transition-all duration-200 flex flex-col justify-between gap-4 ${
                isPending
                  ? "border-amber-500/50 shadow-gold-glow/20"
                  : isSuspended
                  ? "border-rose-500/30 opacity-75"
                  : "border-souqna-border hover:border-souqna-gold/40"
              }`}
            >
              <div className="space-y-4">
                {/* Header: Logo, Name, Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={merchant.logo_url}
                      alt={merchant.store_name}
                      className="w-12 h-12 rounded-2xl object-cover bg-souqna-card border border-souqna-border shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{merchant.store_name}</h4>
                      <p className="text-xs text-souqna-text-muted truncate">المالك: {merchant.owner_name}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : isPending
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {isActive ? "نشط ومفعل" : isPending ? "بانتظار الاعتماد" : "موقوف مؤقتاً"}
                  </span>
                </div>

                {/* Info Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-souqna-card/70 border border-souqna-border/50">
                    <span className="text-[11px] text-souqna-text-muted block">نسبة العمولة</span>
                    <span className="font-extrabold text-souqna-gold text-sm">{merchant.commission_rate}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-souqna-card/70 border border-souqna-border/50">
                    <span className="text-[11px] text-souqna-text-muted block">التقييم</span>
                    <span className="font-extrabold text-white text-sm flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-souqna-gold fill-souqna-gold" />
                      {merchant.avg_rating}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-souqna-card/70 border border-souqna-border/50">
                    <span className="text-[11px] text-souqna-text-muted block">إجمالي الطلبات</span>
                    <span className="font-extrabold text-white text-sm">{merchant.total_orders} طلب</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-souqna-card/70 border border-souqna-border/50">
                    <span className="text-[11px] text-souqna-text-muted block">المحفظة الحالية</span>
                    <span className="font-extrabold text-emerald-400 text-sm">{merchant.wallet_balance.toLocaleString()} ج</span>
                  </div>
                </div>

                <div className="text-[11px] text-souqna-text-muted flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-souqna-gold" />
                    {merchant.phone}
                  </span>
                  <span>تسجيل: {merchant.created_at}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-souqna-border/60 flex items-center gap-2">
                {isPending && (
                  <button
                    onClick={() => onUpdateMerchantStatus(merchant.id, "ACTIVE")}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-souqna-base font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-emerald-glow/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>اعتماد المتجر فوراً</span>
                  </button>
                )}

                {isActive && (
                  <button
                    onClick={() => onUpdateMerchantStatus(merchant.id, "SUSPENDED")}
                    className="flex-1 py-2 rounded-xl bg-souqna-card hover:bg-rose-500/20 text-souqna-text-muted hover:text-rose-400 border border-souqna-border hover:border-rose-500/40 font-bold text-xs transition-colors"
                  >
                    إيقاف مؤقت
                  </button>
                )}

                {isSuspended && (
                  <button
                    onClick={() => onUpdateMerchantStatus(merchant.id, "ACTIVE")}
                    className="flex-1 py-2 rounded-xl bg-souqna-card hover:bg-emerald-500/20 text-souqna-text-muted hover:text-emerald-400 border border-souqna-border hover:border-emerald-500/40 font-bold text-xs transition-colors"
                  >
                    إلغاء الإيقاف
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedMerchant(merchant);
                    setCustomRateInput(merchant.commission_rate);
                  }}
                  className="px-3 py-2 rounded-xl bg-souqna-card border border-souqna-border text-souqna-gold hover:bg-souqna-gold/10 text-xs font-bold transition-colors"
                  title="تعديل نسبة العمولة"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Commission Rate Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-souqna-surface border border-souqna-border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-souqna-border/60 pb-3">
              <h3 className="font-bold text-base text-white">تعديل نسبة عمولة المنصة</h3>
              <button
                onClick={() => setSelectedMerchant(null)}
                className="text-souqna-text-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-souqna-text-secondary">
                المتجر: <span className="font-bold text-white">{selectedMerchant.store_name}</span>
              </p>
              <label className="text-xs font-bold text-souqna-text-secondary block">
                نسبة العمولة الحالية المقتطعة من كل أوردر (%):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={customRateInput}
                  onChange={(e) => setCustomRateInput(Number(e.target.value))}
                  className="w-24 p-3 rounded-xl bg-souqna-card border border-souqna-border text-white text-center font-bold text-lg focus:outline-none focus:border-souqna-gold"
                />
                <span className="text-lg font-bold text-souqna-gold">%</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {[8, 10, 12, 15].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setCustomRateInput(preset)}
                    className="px-3 py-1 rounded-lg bg-souqna-card border border-souqna-border text-xs text-souqna-text-secondary hover:text-white hover:border-souqna-gold"
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-souqna-border/60">
              <button
                onClick={() => setSelectedMerchant(null)}
                className="px-4 py-2.5 rounded-xl bg-souqna-card text-souqna-text-secondary hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  onUpdateCommissionRate(selectedMerchant.id, customRateInput);
                  setSelectedMerchant(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-souqna-gold text-souqna-base font-bold text-xs hover:bg-souqna-gold-dark shadow-gold-glow"
              >
                حفظ النسبة الجديدة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
