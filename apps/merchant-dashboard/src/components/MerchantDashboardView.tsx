"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Clock,
  Store,
  MapPin,
  Check,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Save,
  Home,
  ClipboardList,
  UtensilsCrossed,
  Users,
  Settings,
  LogOut,
  Bell,
  Calendar,
  Sparkles,
  Copy,
  Film,
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
  { day_of_week: 3, day_name: "الأربعاء", open_time: "10:00", close_time: "23:00", is_closed: true },
  { day_of_week: 4, day_name: "الخميس", open_time: "10:00", close_time: "23:00", is_closed: false },
  { day_of_week: 5, day_name: "الجمعة", open_time: "10:00", close_time: "23:00", is_closed: false },
];

export default function MerchantDashboardView({
  token,
  initialMerchant,
  user,
  onNavigate,
  onLogout,
}: MerchantDashboardViewProps) {
  // Store Form State
  const [storeName, setStoreName] = useState(initialMerchant?.name || "مطبخ أم أحمد للأكل البيتي");
  const [addressText, setAddressText] = useState(initialMerchant?.address_text || "المعادي، شارع النصر");
  const [minOrderAmount, setMinOrderAmount] = useState<number>(initialMerchant?.min_order_amount || 100);
  const [deliveryRadius, setDeliveryRadius] = useState<number>(initialMerchant?.delivery_radius_km || 10);
  const [prepTime, setPrepTime] = useState<number>(initialMerchant?.preparation_time_minutes || 120);
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

  // جلب إعدادات المتجر من الباك إند
  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await merchantApi.getSettings(token);
        if (res.success && res.data && isMounted) {
          const d = res.data;
          setStoreName(d.name || storeName);
          setAddressText(d.address_text || addressText);
          setMinOrderAmount(d.min_order_amount ?? 100);
          setDeliveryRadius(d.delivery_radius_km ?? 10);
          setPrepTime(d.preparation_time_minutes ?? 120);
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
        notes: fulfillmentNotes || "طلب الاعتماد على كباتن منصة حواديت لتوصيل الطلبات.",
      });

      if (res.success) {
        setFulfillmentRequestStatus("PENDING_APPROVAL");
        showToast("تم إرسال طلب التوصيل عبر كباتن حواديت بنجاح! ⏳");
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#faf5eb] text-[#3a2818] font-sans selection:bg-[#d32f2f] selection:text-white">
      {/* Main Content Column */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden relative">
        {/* Top Header Bar */}
        <div className="w-full bg-[#f6edd9] border-b border-[#e6d6bc] px-6 py-3.5 flex items-center justify-between shadow-xs z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => showToast("لا توجد إشعارات جديدة")}
              className="relative p-2 rounded-2xl bg-[#fffdfa] border border-[#e8dac1] hover:border-[#d32f2f] text-[#5c3a16] shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Bell className="w-5 h-5 text-[#8c2b18]" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#d32f2f] text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow">
                3
              </span>
            </button>

            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#fffdfa] border border-[#e8dac1] shadow-xs">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#d97706]/40">
                <Image
                  src="/images/assets/chef-logo.jpg"
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs font-black text-[#3a2818] leading-tight">
                  أحمد محمود
                </span>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  مدير المتجر
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-sm md:text-base font-black text-[#3a2818]">
              {storeName} - الإعدادات والتشغيل
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#8c2b18]/10 border border-[#8c2b18]/20 flex items-center justify-center text-[#8c2b18]">
              <Settings className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold animate-bounce ${
              toastMessage.type === "success"
                ? "bg-emerald-600 text-white border border-emerald-400"
                : "bg-red-600 text-white border border-red-400"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-200" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="p-6 space-y-6">
          {/* Settings Tabs Bar */}
          <div className="flex items-center gap-2 border-b border-[#e6d6bc] pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "profile"
                  ? "bg-[#d32f2f] text-white shadow-md shadow-red-900/20"
                  : "bg-[#fffdfa] border-2 border-[#eddcc4] text-[#5c3a16] hover:bg-amber-50"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>بيانات المتجر الأساسية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("hours")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "hours"
                  ? "bg-[#d32f2f] text-white shadow-md shadow-red-900/20"
                  : "bg-[#fffdfa] border-2 border-[#eddcc4] text-[#5c3a16] hover:bg-amber-50"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>مواعيد وساعات العمل</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("fulfillment")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "fulfillment"
                  ? "bg-[#d32f2f] text-white shadow-md shadow-red-900/20"
                  : "bg-[#fffdfa] border-2 border-[#eddcc4] text-[#5c3a16] hover:bg-amber-50"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>نظام التوصيل والشحن</span>
            </button>
          </div>

          {/* TAB 1: Profile & Operating Settings */}
          {activeTab === "profile" && (
            <div className="bg-[#fffdf9] border-2 border-[#eddcc4] rounded-3xl p-6 shadow-xs space-y-5">
              <h3 className="text-base font-black text-[#3a2818] pb-3 border-b border-[#f2e5d3] flex items-center gap-2">
                <Store className="w-5 h-5 text-[#8c2b18]" />
                <span>البيانات الأساسية ونطاق التشغيل</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold">
                {/* Store Name */}
                <div>
                  <label className="block mb-1.5 font-black text-[#3a2818]">اسم المتجر</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-3 text-right text-sm font-bold transition-all shadow-inner"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block mb-1.5 font-black text-[#3a2818]">العنوان والمنطقة</label>
                  <input
                    type="text"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-3 text-right text-sm font-bold transition-all shadow-inner"
                  />
                </div>

                {/* Default Prep Time */}
                <div>
                  <label className="block mb-1.5 font-black text-[#3a2818]">
                    متوسط وقت التحضير (بالدقائق)
                  </label>
                  <select
                    value={prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-3 text-right text-sm font-bold transition-all shadow-inner"
                  >
                    <option value={20}>20 دقيقة (وجبات سريعة ومحلات تجارية)</option>
                    <option value={45}>45 دقيقة (مطاعم)</option>
                    <option value={60}>60 دقيقة (ساعة)</option>
                    <option value={90}>90 دقيقة (ساعة ونصف)</option>
                    <option value={120}>120 دقيقة (مطبخ بيتي - أكل على أصوله)</option>
                  </select>
                </div>

                {/* Min Order Amount */}
                <div>
                  <label className="block mb-1.5 font-black text-[#3a2818]">
                    الحد الأدنى لقيمة الطلب (ج.م)
                  </label>
                  <input
                    type="number"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-3 text-right text-sm font-bold transition-all shadow-inner"
                  />
                </div>

                {/* Delivery Radius */}
                <div>
                  <label className="block mb-1.5 font-black text-[#3a2818]">
                    نطاق التغطية والتوصيل (بالكيلومتر)
                  </label>
                  <input
                    type="number"
                    value={deliveryRadius}
                    onChange={(e) => setDeliveryRadius(Number(e.target.value))}
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-3 text-right text-sm font-bold transition-all shadow-inner"
                  />
                </div>

                {/* Store Status */}
                <div>
                  <label className="block mb-1.5 font-black text-[#3a2818]">حالة المتجر في المنصة</label>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-800 text-sm font-black flex items-center justify-between">
                    <span>نشط ومفعل لاستقبال الطلبات</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Business Hours */}
          {activeTab === "hours" && (
            <div className="bg-[#fffdf9] border-2 border-[#eddcc4] rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#f2e5d3]">
                <h3 className="text-base font-black text-[#3a2818] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#8c2b18]" />
                  <span>جدول مواعيد وساعات العمل الأسبوعية</span>
                </h3>
                <button
                  type="button"
                  onClick={applyFirstDayToAll}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-[#8c2b18] text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>تطبيق مواعيد السبت على باقي الأيام</span>
                </button>
              </div>

              {/* 7 Days Table */}
              <div className="space-y-3">
                {businessHours.map((day, idx) => (
                  <div
                    key={day.day_of_week}
                    className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                      day.is_closed
                        ? "bg-stone-100/70 border-stone-200 opacity-60"
                        : "bg-[#fdfaf3] border-[#eddcc4]"
                    }`}
                  >
                    {/* Day Name & Toggle */}
                    <div className="flex items-center gap-4 w-44">
                      <button
                        type="button"
                        onClick={() => toggleDayStatus(idx)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          !day.is_closed ? "bg-emerald-600" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            !day.is_closed ? "right-1" : "right-6"
                          }`}
                        />
                      </button>
                      <span className="text-sm font-black text-[#3a2818]">{day.day_name}</span>
                      <span className="text-[11px] font-bold text-stone-500">
                        {day.is_closed ? "(مغلق)" : "(مفتوح)"}
                      </span>
                    </div>

                    {/* Time Selectors */}
                    {!day.is_closed ? (
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span>من:</span>
                        <input
                          type="time"
                          value={day.open_time.slice(0, 5)}
                          onChange={(e) => handleTimeChange(idx, "open_time", e.target.value)}
                          className="bg-white border-2 border-[#eddcc4] rounded-xl px-2.5 py-1 text-xs font-bold text-[#3a2818]"
                        />
                        <span>إلى:</span>
                        <input
                          type="time"
                          value={day.close_time.slice(0, 5)}
                          onChange={(e) => handleTimeChange(idx, "close_time", e.target.value)}
                          className="bg-white border-2 border-[#eddcc4] rounded-xl px-2.5 py-1 text-xs font-bold text-[#3a2818]"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-stone-400">عطلة أسبوعية</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Fulfillment & Delivery Settings */}
          {activeTab === "fulfillment" && (
            <div className="bg-[#fffdf9] border-2 border-[#eddcc4] rounded-3xl p-6 shadow-xs space-y-5">
              <h3 className="text-base font-black text-[#3a2818] pb-3 border-b border-[#f2e5d3] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#8c2b18]" />
                <span>نظام التوصيل والشحن</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Current Fulfillment Card */}
                <div className="p-5 rounded-2xl border-2 border-amber-500/40 bg-[#fefaf2] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500">النظام المعتمد الحالي:</span>
                    <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-900 text-xs font-black">
                      {fulfillmentType === "MERCHANT_DELIVERY"
                        ? "توصيل خاص بالتاجر"
                        : "توصيل عبر كباتن حواديت"}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#3a2818]">
                    {fulfillmentType === "MERCHANT_DELIVERY"
                      ? "تقوم بتوصيل طلباتك بنفسك أو عبر دليفري خاص بك"
                      : "أسطول كباتن حواديت يستلم ويوصل طلباتك للعميل"}
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    يمكنك طلب الانضمام لأسطول كباتن حواديت لتغطية جميع مناطق التوصيل دون الحاجة لتوفير طيارين خاصين بك.
                  </p>
                </div>

                {/* Request Platform Delivery Card */}
                <div className="p-5 rounded-2xl border-2 border-[#eddcc4] bg-[#fffdfa] space-y-3">
                  <span className="text-xs font-bold text-stone-500">طلب اعتماد كباتن حواديت:</span>
                  <textarea
                    value={fulfillmentNotes}
                    onChange={(e) => setFulfillmentNotes(e.target.value)}
                    placeholder="اكتب ملاحظاتك لطلب الانضمام لأسطول كباتن حواديت..."
                    rows={2}
                    className="w-full bg-[#fdfaf3] border-2 border-[#eddcc4] rounded-2xl p-2.5 text-xs text-right text-[#3a2818] outline-none resize-none"
                  />
                  <button
                    type="button"
                    disabled={saving || fulfillmentRequestStatus === "PENDING_APPROVAL"}
                    onClick={handleRequestPlatformDelivery}
                    className="w-full py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>
                      {fulfillmentRequestStatus === "PENDING_APPROVAL"
                        ? "طلبك قيد المراجعة لدى الإدارة ⏳"
                        : "إرسال طلب الانضمام لأسطول حواديت"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAll}
              className="px-8 py-3 rounded-2xl bg-[#d32f2f] hover:bg-[#b71c1c] active:scale-95 text-white text-sm font-black shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "جاري الحفظ..." : "حفظ جميع التغييرات 💾"}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto py-3 px-6 bg-[#f6edd9] border-t border-[#e6d6bc] flex items-center justify-between text-xs font-bold text-stone-600">
          <span>2025 © حواديت | جميع الحقوق محفوظة</span>
          <span className="text-[#8c2b18] font-black">حواديت .. لكل أكلة حكاية</span>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="w-60 h-screen bg-[#38140c] text-white flex flex-col justify-between shrink-0 shadow-2xl relative select-none">
        <div>
          <div className="relative w-full h-32 border-b border-amber-900/40 overflow-hidden">
            <Image
              src="/images/assets/chef-logo.jpg"
              alt="Hawadeet Logo"
              fill
              className="object-cover"
            />
          </div>

          <nav className="p-3.5 space-y-1.5 text-xs font-black">
            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate("settings");
              }}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>الرئيسية</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate("orders");
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="w-4 h-4 text-amber-400" />
                <span>الطلبات</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-[#d32f2f] text-white text-[10px] font-black flex items-center justify-center">
                12
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate("menu");
              }}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              <span>قائمة الطعام</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate("reels");
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <div className="flex items-center gap-3">
                <Film className="w-4 h-4 text-red-400" />
                <span>فيديوهات الريلز 🎬</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                جديد
              </span>
            </button>

            <button
              type="button"
              onClick={() => showToast("شاشة سجل العملاء قيد التطوير")}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>العملاء</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl bg-[#d32f2f] text-white shadow-lg cursor-pointer text-right"
            >
              <Settings className="w-4 h-4 text-white" />
              <span>الإعدادات</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-red-300 hover:bg-red-950/40 transition-all cursor-pointer text-right"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>تسجيل الخروج</span>
            </button>
          </nav>
        </div>

        <div className="relative w-full h-36 border-t border-amber-900/40 opacity-80">
          <Image
            src="/images/assets/pharaoh-art.jpg"
            alt="Egyptian Art"
            fill
            className="object-cover"
          />
        </div>
      </aside>
    </div>
  );
}
