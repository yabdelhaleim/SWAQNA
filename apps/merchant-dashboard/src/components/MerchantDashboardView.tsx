"use client";

import React, { useState, useEffect } from "react";
import {
  Clock, Store, MapPin, Check, CheckCircle2, AlertCircle,
  Truck, Save, Copy, Loader2, Sparkles, Building2,
} from "lucide-react";
import { merchantApi } from "@/lib/api";

interface BusinessHourItem {
  day_of_week: number;
  day_name: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface MerchantDashboardViewProps {
  token: string;
  initialMerchant?: any;
  user?: any;
  onNavigate?: (view: "settings" | "menu" | "orders" | "reels") => void;
  onLogout: () => void;
}

const DEFAULT_DAYS: BusinessHourItem[] = [
  { day_of_week: 6, day_name: "السبت", open_time: "10:00", close_time: "23:00", is_closed: false },
  { day_of_week: 0, day_name: "الأحد", open_time: "10:00", close_time: "23:00", is_closed: false },
  { day_of_week: 1, day_name: "الاثنين", open_time: "10:00", close_time: "23:00", is_closed: false },
  { day_of_week: 2, day_name: "الثلاثاء", open_time: "10:00", close_time: "23:00", is_closed: false },
  { day_of_week: 3, day_name: "الأربعاء", open_time: "10:00", close_time: "23:00", is_closed: false },
  { day_of_week: 4, day_name: "الخميس", open_time: "10:00", close_time: "23:00", is_closed: false },
  { day_of_week: 5, day_name: "الجمعة", open_time: "13:00", close_time: "23:00", is_closed: false },
];

export default function MerchantDashboardView({
  token,
  initialMerchant,
  user,
  onNavigate,
  onLogout,
}: MerchantDashboardViewProps) {
  const [storeName, setStoreName] = useState(initialMerchant?.name || "متجر سوقنا");
  const [addressText, setAddressText] = useState(initialMerchant?.address_text || "القاهرة، المعادي");
  const [minOrderAmount, setMinOrderAmount] = useState<number>(initialMerchant?.min_order_amount || 100);
  const [deliveryRadius, setDeliveryRadius] = useState<number>(initialMerchant?.delivery_radius_km || 10);
  const [prepTime, setPrepTime] = useState<number>(initialMerchant?.preparation_time_minutes || 45);
  const [merchantType, setMerchantType] = useState<string>(initialMerchant?.merchant_type || "HOME_KITCHEN");
  const [status, setStatus] = useState<string>(initialMerchant?.status || "ACTIVE");

  // Fulfillment State
  const [fulfillmentType, setFulfillmentType] = useState<string>(
    initialMerchant?.fulfillment_type || "MERCHANT_DELIVERY"
  );
  const [fulfillmentRequestStatus, setFulfillmentRequestStatus] = useState<string>(
    initialMerchant?.fulfillment_request_status || "NONE"
  );
  const [fulfillmentNotes, setFulfillmentNotes] = useState<string>("");

  // Business Hours
  const [businessHours, setBusinessHours] = useState<BusinessHourItem[]>(DEFAULT_DAYS);

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "hours" | "fulfillment">("profile");

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await merchantApi.getSettings(token);
        if (res.success && res.data && isMounted) {
          const d = res.data;
          setStoreName(d.name || d.store_name || storeName);
          setAddressText(d.address_text || addressText);
          setMinOrderAmount(d.min_order_amount ?? 100);
          setDeliveryRadius(d.delivery_radius_km ?? 10);
          setPrepTime(d.preparation_time_minutes ?? 45);
          setMerchantType(d.merchant_type || "HOME_KITCHEN");
          setStatus(d.status || "ACTIVE");
          setFulfillmentType(d.fulfillment_type || "MERCHANT_DELIVERY");
          setFulfillmentRequestStatus(d.fulfillment_request_status || "NONE");

          if (d.business_hours && Array.isArray(d.business_hours) && d.business_hours.length > 0) {
            const mapped = DEFAULT_DAYS.map((defDay) => {
              const found = d.business_hours.find((h: any) => h.day_of_week === defDay.day_of_week);
              if (found) {
                return {
                  ...defDay,
                  open_time: found.open_time || defDay.open_time,
                  close_time: found.close_time || defDay.close_time,
                  is_closed: Boolean(found.is_closed),
                };
              }
              return defDay;
            });
            setBusinessHours(mapped);
          }
        }
      } catch (err) {
        console.error("فشل جلب إعدادات المتجر:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const toggleDayStatus = (index: number) => {
    setBusinessHours((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        is_closed: !updated[index].is_closed,
      };
      return updated;
    });
  };

  const handleTimeChange = (index: number, field: "open_time" | "close_time", value: string) => {
    setBusinessHours((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const applyFirstDayToAll = () => {
    const sourceDay = businessHours[0];
    setBusinessHours((prev) =>
      prev.map((day, idx) =>
        idx === 0
          ? day
          : {
              ...day,
              open_time: sourceDay.open_time,
              close_time: sourceDay.close_time,
              is_closed: sourceDay.is_closed,
            }
      )
    );
    showToast("تم تطبيق مواعيد السبت على كامل أيام الأسبوع! 📋");
  };

  const handleRequestPlatformDelivery = async () => {
    if (fulfillmentRequestStatus === "PENDING_APPROVAL") {
      showToast("طلبك قيد المراجعة بالفعل من قبل الإدارة.", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await merchantApi.requestFulfillmentChange(token, {
        requested_fulfillment_type: "PLATFORM_DELIVERY",
        notes: fulfillmentNotes || "طلب الاعتماد على كباتن منصة سوقنا لتوصيل الطلبات.",
      });

      if (res.success) {
        setFulfillmentRequestStatus("PENDING_APPROVAL");
        showToast("تم إرسال طلب التوصيل عبر كباتن سوقنا بنجاح! ⏳");
      } else {
        showToast(res.message || "حدث خطأ أثناء إرسال الطلب.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "فشل الاتصال بالسيرفر.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);

      const profileRes = await merchantApi.updateProfile(token, {
        name: storeName,
        address_text: addressText,
        preparation_time_minutes: prepTime,
        min_order_amount: minOrderAmount,
        delivery_radius_km: deliveryRadius,
      });

      if (!profileRes.success) {
        throw new Error(profileRes.message || "فشل تحديث بيانات المتجر.");
      }

      const hoursPayload = businessHours.map((h) => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time.length === 5 ? `${h.open_time}:00` : h.open_time,
        close_time: h.close_time.length === 5 ? `${h.close_time}:00` : h.close_time,
        is_closed: h.is_closed,
      }));

      const hoursRes = await merchantApi.updateBusinessHours(token, hoursPayload);

      if (!hoursRes.success) {
        throw new Error(hoursRes.message || "فشل تحديث ساعات العمل.");
      }

      showToast("تم حفظ جميع تعديلات المتجر ومواعيد العمل بنجاح! 🎉");
    } catch (err: any) {
      showToast(err.message || "حدث خطأ غير متوقع أثناء الحفظ.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full" dir="rtl">
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold transition-all ${
            toastMessage.type === "success"
              ? "bg-souqna-emerald text-white border border-souqna-emerald/50"
              : "bg-red-600 text-white border border-red-400"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-white/80" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white/80" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-souqna-text-primary font-black text-xl flex items-center gap-2">
              <Store className="w-5 h-5 text-souqna-gold" />
              إعدادات وتشغيل المتجر
            </h1>
            <p className="text-souqna-text-muted text-xs mt-0.5">
              تعديل بيانات المتجر، أوقات وساعات العمل، وخيارات الشحن والتوصيل
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAll}
            className="btn-gold flex items-center gap-2 px-6 py-2.5 text-xs font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات 💾"}</span>
          </button>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="card-glass p-2 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "profile"
                ? "bg-souqna-gold text-souqna-base shadow-md shadow-souqna-gold/20"
                : "text-souqna-text-secondary hover:text-white hover:bg-souqna-surface"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>بيانات المتجر الأساسية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("hours")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "hours"
                ? "bg-souqna-gold text-souqna-base shadow-md shadow-souqna-gold/20"
                : "text-souqna-text-secondary hover:text-white hover:bg-souqna-surface"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>مواعيد وساعات العمل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fulfillment")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "fulfillment"
                ? "bg-souqna-gold text-souqna-base shadow-md shadow-souqna-gold/20"
                : "text-souqna-text-secondary hover:text-white hover:bg-souqna-surface"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>نظام التوصيل والشحن</span>
          </button>
        </div>

        {/* TAB 1: Profile & Details */}
        {activeTab === "profile" && (
          <div className="card-glass p-6 space-y-6 border border-souqna-border">
            <h3 className="text-sm font-black text-souqna-text-primary pb-3 border-b border-souqna-border flex items-center gap-2">
              <Store className="w-4 h-4 text-souqna-gold" />
              <span>البيانات الأساسية ونطاق التشغيل</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold">
              <div>
                <label className="block mb-1.5 text-souqna-text-secondary">اسم المتجر أو المطعم</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="input-dark w-full text-sm font-bold"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-souqna-text-secondary">العنوان أو الحي والمنطقة</label>
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  className="input-dark w-full text-sm font-bold"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-souqna-text-secondary">
                  متوسط وقت التجهيز الافتراضي (بالدقائق)
                </label>
                <select
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  className="input-dark w-full text-sm font-bold"
                >
                  <option value={20}>20 دقيقة (وجبات سريعة ومحلات تجارية)</option>
                  <option value={35}>35 دقيقة (مطاعم وكافيهات)</option>
                  <option value={45}>45 دقيقة (متوسط قياسي)</option>
                  <option value={60}>60 دقيقة (ساعة كاملة)</option>
                  <option value={90}>90 دقيقة (أكل بيتي وطواجن مسبكة)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-souqna-text-secondary">
                  الحد الأدنى لقيمة الطلب (ج.م)
                </label>
                <input
                  type="number"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                  className="input-dark w-full text-sm font-bold"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-souqna-text-secondary">
                  نطاق التغطية والتوصيل (بالكيلومتر)
                </label>
                <input
                  type="number"
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(Number(e.target.value))}
                  className="input-dark w-full text-sm font-bold"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-souqna-text-secondary">حالة المتجر في المنصة</label>
                <div className="p-3 rounded-xl bg-souqna-emerald/15 border border-souqna-emerald/30 text-souqna-emerald text-xs font-black flex items-center justify-between">
                  <span>🟢 نشط ومفعل لاستقبال الطلبات الفورية</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-souqna-emerald animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Business Hours */}
        {activeTab === "hours" && (
          <div className="card-glass p-6 space-y-6 border border-souqna-border">
            <div className="flex items-center justify-between pb-3 border-b border-souqna-border flex-wrap gap-3">
              <h3 className="text-sm font-black text-souqna-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-souqna-gold" />
                <span>جدول مواعيد وساعات العمل الأسبوعية</span>
              </h3>
              <button
                type="button"
                onClick={applyFirstDayToAll}
                className="btn-ghost px-3.5 py-1.5 text-xs text-souqna-gold flex items-center gap-1.5 border border-souqna-gold/30 rounded-xl hover:bg-souqna-gold/10"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>تطبيق مواعيد السبت على باقي الأسبوع</span>
              </button>
            </div>

            <div className="space-y-3">
              {businessHours.map((day, idx) => (
                <div
                  key={day.day_of_week}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    day.is_closed
                      ? "bg-souqna-surface/40 border-souqna-border/40 opacity-50"
                      : "bg-souqna-surface/80 border-souqna-border"
                  }`}
                >
                  <div className="flex items-center gap-3.5 w-48">
                    <button
                      type="button"
                      onClick={() => toggleDayStatus(idx)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        !day.is_closed ? "bg-souqna-emerald" : "bg-souqna-base border border-souqna-border"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          !day.is_closed ? "right-1" : "right-6"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-black text-souqna-text-primary">{day.day_name}</span>
                    <span className="text-[11px] font-bold text-souqna-text-muted">
                      {day.is_closed ? "(مغلق)" : "(مفتوح)"}
                    </span>
                  </div>

                  {!day.is_closed ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-souqna-text-secondary">
                      <span>من:</span>
                      <input
                        type="time"
                        value={day.open_time.slice(0, 5)}
                        onChange={(e) => handleTimeChange(idx, "open_time", e.target.value)}
                        className="input-dark py-1 px-2 text-xs font-mono"
                      />
                      <span>إلى:</span>
                      <input
                        type="time"
                        value={day.close_time.slice(0, 5)}
                        onChange={(e) => handleTimeChange(idx, "close_time", e.target.value)}
                        className="input-dark py-1 px-2 text-xs font-mono"
                      />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-souqna-text-muted">عطلة أسبوعية</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Fulfillment & Delivery */}
        {activeTab === "fulfillment" && (
          <div className="card-glass p-6 space-y-6 border border-souqna-border">
            <h3 className="text-sm font-black text-souqna-text-primary pb-3 border-b border-souqna-border flex items-center gap-2">
              <Truck className="w-4 h-4 text-souqna-gold" />
              <span>نظام التوصيل والشحن</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl border border-souqna-gold/30 bg-souqna-surface/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-souqna-text-muted">النظام المعتمد الحالي:</span>
                  <span className="px-3 py-1 rounded-xl bg-souqna-gold/15 text-souqna-gold text-xs font-black border border-souqna-gold/30">
                    {fulfillmentType === "MERCHANT_DELIVERY"
                      ? "توصيل خاص بالتاجر"
                      : "توصيل عبر كباتن سوقنا"}
                  </span>
                </div>
                <h4 className="text-sm font-black text-souqna-text-primary">
                  {fulfillmentType === "MERCHANT_DELIVERY"
                    ? "تقوم بتوصيل طلباتك بنفسك أو عبر طيار خاص بك"
                    : "أسطول كباتن سوقنا يستلم ويوصل طلباتك للعميل مباشرة"}
                </h4>
                <p className="text-xs text-souqna-text-secondary leading-relaxed">
                  يمكنك طلب الانضمام لأسطول كباتن سوقنا لتغطية جميع مناطق التوصيل دون الحاجة لتوفير طيارين خاصين بمتجرك.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-souqna-border bg-souqna-surface/50 space-y-3">
                <span className="text-xs font-bold text-souqna-text-muted">طلب الاعتماد على كباتن سوقنا:</span>
                <textarea
                  value={fulfillmentNotes}
                  onChange={(e) => setFulfillmentNotes(e.target.value)}
                  placeholder="اكتب ملاحظاتك لطلب الانضمام لأسطول كباتن سوقنا..."
                  rows={2}
                  className="input-dark w-full resize-none text-xs"
                />
                <button
                  type="button"
                  disabled={saving || fulfillmentRequestStatus === "PENDING_APPROVAL"}
                  onClick={handleRequestPlatformDelivery}
                  className="btn-gold w-full py-2.5 text-xs disabled:opacity-50"
                >
                  <span>
                    {fulfillmentRequestStatus === "PENDING_APPROVAL"
                      ? "طلبك قيد المراجعة لدى الإدارة ⏳"
                      : "إرسال طلب الانضمام لأسطول كباتن سوقنا"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
