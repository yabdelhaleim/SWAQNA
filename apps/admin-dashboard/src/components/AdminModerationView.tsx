// src/components/AdminModerationView.tsx
"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Video,
  Ticket,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  Percent,
  Calendar,
  AlertTriangle,
  Play,
} from "lucide-react";
import { ModeratedReel, PlatformCoupon } from "../types/admin";

interface AdminModerationViewProps {
  reels: ModeratedReel[];
  coupons: PlatformCoupon[];
  onToggleReelStatus: (id: string) => void;
  onDeleteReel: (id: string) => void;
  onToggleCouponStatus: (id: string) => void;
  onCreateCoupon: (coupon: Omit<PlatformCoupon, "id" | "usage_count">) => void;
}

export const AdminModerationView: React.FC<AdminModerationViewProps> = ({
  reels,
  coupons,
  onToggleReelStatus,
  onDeleteReel,
  onToggleCouponStatus,
  onCreateCoupon,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"REELS" | "COUPONS">("REELS");
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  // New Coupon Form
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(15);
  const [maxDiscount, setMaxDiscount] = useState<number>(50);
  const [minOrder, setMinOrder] = useState<number>(150);
  const [maxUses, setMaxUses] = useState<number>(1000);

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    onCreateCoupon({
      code: couponCode.trim().toUpperCase(),
      discount_percentage: discountPercent,
      max_discount_amount: maxDiscount,
      min_order_amount: minOrder,
      max_usage_limit: maxUses,
      is_active: true,
      expires_at: "2026-12-31",
    });

    setCouponCode("");
    setIsCouponModalOpen(false);
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* Header & SubTabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">الرقابة والمحتوى والكوبونات</h2>
          <p className="text-xs text-souqna-text-secondary mt-1">
            مراجعة وحظر فيديوهات الريلز غير الملائمة، وإصدار كوبونات وأكواد الخصم الترويجية للعملاء.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-souqna-surface border border-souqna-border">
          <button
            onClick={() => setActiveSubTab("REELS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
              activeSubTab === "REELS"
                ? "bg-souqna-gold text-souqna-base shadow-sm"
                : "text-souqna-text-secondary hover:text-white"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>رقابة الريلز ({reels.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("COUPONS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
              activeSubTab === "COUPONS"
                ? "bg-souqna-gold text-souqna-base shadow-sm"
                : "text-souqna-text-secondary hover:text-white"
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>كوبونات الخصم ({coupons.length})</span>
          </button>
        </div>
      </div>

      {/* SubTab 1: Reels Moderation */}
      {activeSubTab === "REELS" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reels.map((reel) => (
            <div
              key={reel.id}
              className={`rounded-3xl p-4 bg-souqna-surface border transition-all flex flex-col justify-between gap-4 shadow-card ${
                !reel.is_active ? "border-rose-500/30 opacity-60" : "border-souqna-border hover:border-souqna-gold/40"
              }`}
            >
              {/* Thumbnail / Video Box */}
              <div className="relative aspect-[9/12] rounded-2xl overflow-hidden bg-souqna-card border border-souqna-border group">
                <img src={reel.thumbnail_url} alt={reel.product_name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-souqna-base/80 backdrop-blur-md text-[11px] font-bold text-white border border-white/10">
                  <span>{reel.store_name}</span>
                </div>

                <div className="absolute bottom-3 right-3 left-3 space-y-1">
                  <p className="font-extrabold text-sm text-white">{reel.product_name}</p>
                  <div className="flex items-center gap-3 text-[11px] text-white/80">
                    <span>👁️ {reel.views_count.toLocaleString()}</span>
                    <span>❤️ {reel.likes_count.toLocaleString()}</span>
                    {reel.reports_count > 0 && (
                      <span className="text-rose-400 font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> {reel.reports_count} بلاغ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Moderation Controls */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-souqna-border/60">
                <button
                  onClick={() => onToggleReelStatus(reel.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    reel.is_active
                      ? "bg-souqna-card hover:bg-rose-500/20 text-souqna-text-secondary hover:text-rose-400 border border-souqna-border"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  {reel.is_active ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>إخفاء الفيديو</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>إلغاء الحظر</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onDeleteReel(reel.id)}
                  className="p-2 rounded-xl bg-souqna-card hover:bg-rose-500/20 text-souqna-text-muted hover:text-rose-400 border border-souqna-border transition-colors"
                  title="حذف نهائي"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SubTab 2: Platform Coupons */}
      {activeSubTab === "COUPONS" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setIsCouponModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-souqna-gold to-souqna-gold-dark text-souqna-base font-bold text-xs hover:opacity-95 shadow-gold-glow flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء كود خصم جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`p-5 rounded-3xl bg-souqna-surface border transition-all flex flex-col justify-between gap-4 shadow-card ${
                  coupon.is_active ? "border-souqna-gold/40" : "border-souqna-border opacity-60"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-lg text-souqna-gold font-mono tracking-wider px-3 py-1 rounded-xl bg-souqna-gold/15 border border-souqna-gold/30">
                      {coupon.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        coupon.is_active
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                      }`}
                    >
                      {coupon.is_active ? "فعّال ومتاح" : "معطل"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-white text-base">خصم {coupon.discount_percentage}%</p>
                    <p className="text-souqna-text-secondary">
                      أقصى خصم: <span className="text-white font-semibold">{coupon.max_discount_amount} ج</span> • حد أدنى:{" "}
                      <span className="text-white font-semibold">{coupon.min_order_amount} ج</span>
                    </p>
                    <p className="text-souqna-text-muted">
                      مرات الاستخدام: {coupon.usage_count} / {coupon.max_usage_limit}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-souqna-border/60 flex items-center justify-between text-xs">
                  <span className="text-souqna-text-muted">صالح حتى: {coupon.expires_at}</span>
                  <button
                    onClick={() => onToggleCouponStatus(coupon.id)}
                    className="text-xs font-bold text-souqna-gold hover:underline"
                  >
                    {coupon.is_active ? "تعطيل الكود" : "تفعيل الكود"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCoupon}
            className="w-full max-w-md rounded-3xl bg-souqna-surface border border-souqna-border p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-souqna-border/60 pb-3">
              <h3 className="font-bold text-base text-white">إصدار كود خصم للمنصة</h3>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="text-souqna-text-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-souqna-text-secondary block mb-1">كود الخصم (Promo Code):</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: EID2026"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:border-souqna-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-souqna-text-secondary block mb-1">نسبة الخصم (%):</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs font-bold focus:outline-none focus:border-souqna-gold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-souqna-text-secondary block mb-1">الحد الأقصى للخصم (ج):</label>
                  <input
                    type="number"
                    min="5"
                    required
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs font-bold focus:outline-none focus:border-souqna-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-souqna-text-secondary block mb-1">أدنى قيمة للطلب (ج):</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minOrder}
                    onChange={(e) => setMinOrder(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs font-bold focus:outline-none focus:border-souqna-gold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-souqna-text-secondary block mb-1">الحد الأقصى للاستخدام:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-souqna-card border border-souqna-border text-white text-xs font-bold focus:outline-none focus:border-souqna-gold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-souqna-border/60">
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-souqna-card text-souqna-text-secondary hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-souqna-gold text-souqna-base font-bold text-xs hover:bg-souqna-gold-dark shadow-gold-glow"
              >
                نشر الكود للمنصة
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
