"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Store,
  MapPin,
  Clock,
  Bike,
  Calendar,
  Save,
  Camera,
  Check,
  CheckCircle2,
  AlertCircle,
  Bell,
  ChevronDown,
  LogOut,
  Sparkles,
  Copy,
  Info,
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
  onNavigate?: (view: "settings" | "menu") => void;
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
  const [isOpenNow, setIsOpenNow] = useState<boolean>(true);

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
  const [activeTab, setActiveTab] = useState<number>(1);
  const [activeMenu, setActiveMenu] = useState<string>("main");

  // Cover & Logo
  const [coverUrl, setCoverUrl] = useState<string | null>(initialMerchant?.cover_image_url || null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialMerchant?.logo_url || null);
  const [uploadingMedia, setUploadingMedia] = useState<boolean>(false);

  // جلب إعدادات المتجر الكاملة بواسطة Eager Loading عند الفتح
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
          setIsOpenNow(d.is_open_now ?? true);
          setFulfillmentType(d.fulfillment_type || "MERCHANT_DELIVERY");
          setFulfillmentRequestStatus(d.fulfillment_request_status || "NONE");
          if (d.fulfillment_request_notes) setFulfillmentNotes(d.fulfillment_request_notes);
          if (d.cover_image_url) setCoverUrl(d.cover_image_url);
          if (d.logo_url) setLogoUrl(d.logo_url);

          // مزامنة أوقات العمل الـ 7 أيام
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

  // إظهار تنبيه Toast مؤقت
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // تبديل حالة فتح/إغلاق يوم معين
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

  // تغيير وقت الفتح أو الإغلاق ليوم معين
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

  // تطبيق مواعيد اليوم الأول على باقي أيام الأسبوع
  const applyFirstDayToAll = () => {
    const sourceDay = businessHours[0]; // السبت
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
    showToast("تم نسخ وتطبيق مواعيد يوم السبت على جميع أيام الأسبوع بنجاح! 📋");
  };

  // طلب التوصيل عبر كباتن منصة حواديت
  const handleRequestPlatformDelivery = async () => {
    if (fulfillmentRequestStatus === "PENDING_APPROVAL") {
      showToast("طلبك لتوصيل كباتن حواديت قيد المراجعة بالفعل من قبل الإدارة.", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await merchantApi.requestFulfillmentChange(token, {
        requested_fulfillment_type: "PLATFORM_DELIVERY",
        notes: fulfillmentNotes || "نطلب الانضمام لكباتن أسطول حواديت لتغطية توصيل الطلبات.",
      });

      if (res.success) {
        setFulfillmentRequestStatus("PENDING_APPROVAL");
        showToast("تم إرسال طلب اعتماد التوصيل عبر كباتن حواديت بنجاح! ⏳");
      } else {
        showToast(res.message || "حدث خطأ أثناء إرسال الطلب.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "فشل الاتصال بالسيرفر.", "error");
    } finally {
      setSaving(false);
    }
  };

  // حفظ جميع التغييرات في الباك إند
  const handleSaveAll = async () => {
    try {
      setSaving(true);

      // 1. تحديث الملف الشخصي والبيانات التشغيلية
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

      // 2. تحديث جدول ساعات العمل الأسبوعية
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

  // رفع غلاف المتجر
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingMedia(true);
      const formData = new FormData();
      formData.append("type", "cover");
      formData.append("image", file);

      const res = await merchantApi.uploadMedia(token, formData);
      if (res.success && res.url) {
        setCoverUrl(res.url);
        showToast("تم تحديث غلاف المتجر بنجاح! 📸");
      } else {
        showToast(res.message || "فشل رفع صورة الغلاف.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "فشل رفع الصورة.", "error");
    } finally {
      setUploadingMedia(false);
    }
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden font-sans">
      {/* =========================================================================
          الخلفية الرسمية المصممة (Base Canvas Visual Asset) - ملء الشاشة بالكامل
         ========================================================================= */}
      <Image
        src="/images/dashboard-design.jpg"
        alt="Hawadeet Merchant Dashboard"
        fill
        priority
        className="object-fill pointer-events-none"
      />

      {/* =========================================================================
          Toast Notifications Banner
         ========================================================================= */}
      {toastMessage && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce ${
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

      {/* =========================================================================
          شريط الهيدر العلوي التفاعلي (Top Bar Interactive Hotspots)
         ========================================================================= */}
      {/* زر الجرس والإشعارات */}
      <button
        type="button"
        onClick={() => showToast("لا توجد إشعارات جديدة حالياً.")}
        className="absolute z-20 cursor-pointer rounded-full hover:scale-105 active:scale-95 transition-all"
        style={{ top: "2.8%", left: "2.6%", width: "3.4%", height: "5.1%" }}
        title="الإشعارات (3)"
      />

      {/* ملف المستخدم والمدير */}
      <div
        className="absolute z-20 flex items-center gap-1.5 cursor-pointer rounded-xl hover:bg-black/5 px-1 transition-all"
        style={{ top: "2.4%", left: "6.8%", width: "13.5%", height: "5.8%" }}
        title={`المدير: ${user?.full_name || "أحمد محمود"}`}
      >
        {/* شفاف للتفاعل السلس مع الهوت سبوت */}
      </div>

      {/* حالة الاتصال: متصل الآن */}
      <div
        className="absolute z-20 flex items-center justify-center cursor-default"
        style={{ top: "3.2%", left: "22.6%", width: "7.8%", height: "4.2%" }}
        title="متجرك متصل بالإنترنت ويستقبل الطلبات فوراً"
      />

      {/* مبدل اسم المتجر في الهيدر */}
      <div
        className="absolute z-20 flex items-center justify-end pr-2 text-xs font-bold text-[#3a2818] cursor-pointer hover:bg-black/5 rounded-xl transition-all"
        style={{ top: "2.5%", right: "23.5%", width: "17.0%", height: "5.5%" }}
        title="المتجر الحالي المسجل"
      >
        <span className="truncate">{storeName}</span>
      </div>

      {/* زر تغيير الغلاف (Upload Cover) */}
      <label
        className="absolute z-20 rounded-xl cursor-pointer flex items-center justify-center gap-1 text-[11px] font-bold text-white bg-black/40 hover:bg-black/60 transition-all active:scale-95 border border-white/20 shadow-md backdrop-blur-sm"
        style={{ top: "14.8%", right: "24.2%", width: "9.2%", height: "4.4%" }}
        title="تغيير صورة الغلاف"
      >
        <Camera className="w-3.5 h-3.5 text-white" />
        <span>{uploadingMedia ? "..." : "تغيير الغلاف"}</span>
        <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
      </label>

      {/* نص اسم المتجر في البانر (Overlay مع إمكانية التحديث المباشر) */}
      <div
        className="absolute z-20 flex flex-col justify-center text-right text-white pointer-events-none drop-shadow-md"
        style={{ top: "16.8%", left: "21.0%", width: "24.0%", height: "9.5%" }}
      >
        <h2 className="text-base font-black truncate">{storeName}</h2>
        <div className="flex items-center gap-2 text-[10px] text-white/90">
          <span>النوع: {merchantType === "HOME_KITCHEN" ? "أكل بيتي" : merchantType === "RESTAURANT" ? "مطعم" : "محل"}</span>
          <span>•</span>
          <span>التقييم: ⭐ 0.0 (جديد)</span>
        </div>
      </div>

      {/* =========================================================================
          التبويبات العلوية (Step Tabs)
         ========================================================================= */}
      {/* تبويب 1: بيانات المتجر */}
      <button
        type="button"
        onClick={() => setActiveTab(1)}
        className="absolute z-20 cursor-pointer rounded-2xl"
        style={{ top: "39.5%", right: "18.3%", width: "17.5%", height: "4.8%" }}
        title="بيانات المتجر"
      />

      {/* تبويب 2: وقت التجهيز */}
      <button
        type="button"
        onClick={() => setActiveTab(2)}
        className="absolute z-20 cursor-pointer rounded-2xl"
        style={{ top: "39.5%", right: "36.8%", width: "13.5%", height: "4.8%" }}
        title="وقت التجهيز"
      />

      {/* تبويب 3: ساعات العمل */}
      <button
        type="button"
        onClick={() => setActiveTab(3)}
        className="absolute z-20 cursor-pointer rounded-2xl"
        style={{ top: "39.5%", right: "51.3%", width: "13.5%", height: "4.8%" }}
        title="ساعات العمل"
      />

      {/* تبويب 4: نظام التوصيل */}
      <button
        type="button"
        onClick={() => setActiveTab(4)}
        className="absolute z-20 cursor-pointer rounded-2xl"
        style={{ top: "39.5%", right: "65.8%", width: "13.5%", height: "4.8%" }}
        title="نظام التوصيل"
      />

      {/* =========================================================================
          [1] كارت البيانات الأساسية (Basic Info Inputs)
         ========================================================================= */}
      {/* 1.1 حقل اسم المتجر */}
      <div
        className="absolute z-20 flex items-center"
        style={{ top: "38.7%", left: "2.9%", width: "39.6%", height: "5.3%" }}
      >
        <div className="relative w-full h-full bg-white rounded-xl border border-[#ded4c5] hover:border-[#d32f2f] focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/20 transition-all flex items-center px-3 shadow-xs">
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="اسم المتجر"
            className="w-full bg-transparent text-xs font-bold text-[#3a2818] outline-none text-right pr-1"
          />
          <Store className="w-4 h-4 text-[#8b1e1e] shrink-0" />
        </div>
      </div>

      {/* 1.2 حقل العنوان التفصيلي */}
      <div
        className="absolute z-20 flex items-center"
        style={{ top: "44.9%", left: "2.9%", width: "39.6%", height: "5.3%" }}
      >
        <div className="relative w-full h-full bg-white rounded-xl border border-[#ded4c5] hover:border-[#d32f2f] focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/20 transition-all flex items-center px-3 shadow-xs">
          <input
            type="text"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            placeholder="العنوان التفصيلي (شارع، منطقة، مدينة)"
            className="w-full bg-transparent text-xs font-bold text-[#3a2818] outline-none text-right pr-1"
          />
          <MapPin className="w-4 h-4 text-[#8b1e1e] shrink-0" />
        </div>
      </div>

      {/* 1.3 حقل الحد الأدنى لقيمة الطلب (اليسار) */}
      <div
        className="absolute z-20 flex items-center"
        style={{ top: "51.3%", left: "2.9%", width: "17.6%", height: "5.3%" }}
      >
        <div className="relative w-full h-full bg-white rounded-xl border border-[#ded4c5] hover:border-[#d32f2f] focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/20 transition-all flex items-center px-2.5 shadow-xs">
          <span className="text-[10px] font-bold text-[#8b1e1e] shrink-0">ج.م</span>
          <input
            type="number"
            value={minOrderAmount}
            onChange={(e) => setMinOrderAmount(Math.max(0, Number(e.target.value)))}
            placeholder="100"
            className="w-full bg-transparent text-xs font-bold text-[#3a2818] outline-none text-center"
          />
          <span className="text-xs">💰</span>
        </div>
      </div>

      {/* 1.4 قائمة نطاق التوصيل الجغرافي بالكيلومتر (اليمين) */}
      <div
        className="absolute z-20 flex items-center"
        style={{ top: "51.3%", left: "24.9%", width: "17.6%", height: "5.3%" }}
      >
        <div className="relative w-full h-full bg-white rounded-xl border border-[#ded4c5] hover:border-[#d32f2f] focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/20 transition-all flex items-center px-2 shadow-xs cursor-pointer">
          <ChevronDown className="w-3.5 h-3.5 text-[#7c634c] shrink-0" />
          <select
            value={deliveryRadius}
            onChange={(e) => setDeliveryRadius(Number(e.target.value))}
            className="w-full bg-transparent text-xs font-bold text-[#3a2818] outline-none text-right appearance-none pr-1 cursor-pointer"
          >
            <option value={5}>5 كم</option>
            <option value={10}>10 كم</option>
            <option value={15}>15 كم</option>
            <option value={20}>20 كم</option>
            <option value={30}>30 كم</option>
          </select>
          <span className="text-xs font-black text-[#d32f2f] shrink-0">📍</span>
        </div>
      </div>

      {/* =========================================================================
          [2] كارت وقت تجهيز الطلبات (Preparation Time Slider)
         ========================================================================= */}
      {/* القيمة الرقمية لوقت التجهيز فوق السلايدر */}
      <div
        className="absolute z-20 flex items-center justify-center bg-white/90 rounded-lg px-2"
        style={{ top: "40.0%", right: "23.5%", width: "13.0%", height: "4.5%" }}
      >
        <span className="text-sm font-black text-[#8b1e1e] flex items-center gap-1">
          <span>{prepTime}</span>
          <span className="text-xs font-bold text-[#3a2818]">دقيقة</span>
        </span>
      </div>

      {/* الـ Slider التفاعلي للتحكم الدقيق في وقت التجهيز */}
      <div
        className="absolute z-20 flex items-center"
        style={{ top: "44.8%", right: "18.5%", width: "19.5%", height: "4.0%" }}
      >
        <input
          type="range"
          min={30}
          max={240}
          step={5}
          value={prepTime}
          onChange={(e) => setPrepTime(Number(e.target.value))}
          className="w-full h-2 bg-[#f0e4d0] rounded-lg appearance-none cursor-pointer accent-[#d32f2f]"
          title={`وقت تجهيز الطلب: ${prepTime} دقيقة`}
        />
      </div>

      {/* =========================================================================
          [3] كارت نظام التوصيل (Fulfillment Settings)
         ========================================================================= */}
      {/* 3.1 الخيار الأول: توصيل بمعرفتك (توصيل التاجر الخاص) */}
      <div
        onClick={() => setFulfillmentType("MERCHANT_DELIVERY")}
        className={`absolute z-20 cursor-pointer rounded-2xl transition-all ${
          fulfillmentType === "MERCHANT_DELIVERY"
            ? "ring-2 ring-emerald-500 bg-emerald-50/20"
            : "hover:bg-black/5"
        }`}
        style={{ top: "64.8%", left: "2.9%", width: "18.8%", height: "10.8%" }}
        title="توصيلك الخاص - مجاني وبدون أي رسوم منصة إضافية"
      />

      {/* 3.2 الخيار الثاني: طلب التوصيل عبر كباتن منصة حواديت */}
      <div
        onClick={handleRequestPlatformDelivery}
        className={`absolute z-20 cursor-pointer rounded-2xl transition-all ${
          fulfillmentRequestStatus === "PENDING_APPROVAL"
            ? "ring-2 ring-amber-400 bg-amber-50/20"
            : "hover:bg-black/5"
        }`}
        style={{ top: "64.8%", left: "23.6%", width: "18.8%", height: "10.8%" }}
        title="طلب الانضمام لكباتن منصة حواديت"
      />

      {/* 3.3 حقل ملاحظات التوصيل الإضافية */}
      <div
        className="absolute z-20 flex items-center"
        style={{ top: "80.8%", left: "2.9%", width: "39.6%", height: "5.3%" }}
      >
        <div className="relative w-full h-full bg-white rounded-xl border border-[#ded4c5] hover:border-[#d32f2f] focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/20 transition-all flex items-center px-3 shadow-xs">
          <input
            type="text"
            value={fulfillmentNotes}
            onChange={(e) => setFulfillmentNotes(e.target.value)}
            placeholder="أي ملاحظات إضافية بخصوص مناطق التوصيل..."
            className="w-full bg-transparent text-xs font-bold text-[#3a2818] outline-none text-right"
          />
        </div>
      </div>

      {/* =========================================================================
          [4] كارت جدول ساعات العمل الأسبوعي (7-Day Business Hours)
         ========================================================================= */}
      {/* زر نسخ وتطبيق مواعيد اليوم على باقي الأيام */}
      <button
        type="button"
        onClick={applyFirstDayToAll}
        className="absolute z-20 cursor-pointer rounded-xl hover:bg-black/5 active:scale-95 transition-all"
        style={{ top: "64.1%", right: "26.3%", width: "19.5%", height: "3.2%" }}
        title="نسخ وتطبيق مواعيد يوم السبت على باقي أيام الأسبوع"
      />

      {/* صفوف الأيام الـ 7 مع الـ Toggle التفاعلي وحقول الأوقات */}
      {businessHours.map((day, idx) => {
        // حساب الإحداثيات العمودية لكل يوم بدقة على الكانفاس
        const rowTopPercent = 66.8 + idx * 3.8;

        return (
          <React.Fragment key={day.day_of_week}>
            {/* زر التبديل (مفتوح / مغلق) مع النص التوضيحي */}
            <div
              className="absolute z-20 flex items-center justify-end gap-1.5 cursor-pointer"
              style={{
                top: `${rowTopPercent}%`,
                right: "26.8%",
                width: "9.2%",
                height: "3.4%",
              }}
              onClick={() => toggleDayStatus(idx)}
              title={`تبديل حالة ${day.day_name}`}
            >
              <span
                className={`text-[10px] font-black transition-colors ${
                  day.is_closed ? "text-gray-400" : "text-emerald-700"
                }`}
              >
                {day.is_closed ? "مغلق" : "مفتوح"}
              </span>

              {/* سويتش Toggle مرسوم ونشط */}
              <div
                className={`w-7 h-4 rounded-full p-0.5 transition-colors relative ${
                  day.is_closed ? "bg-gray-300" : "bg-emerald-500"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                    day.is_closed ? "translate-x-0" : "-translate-x-3"
                  }`}
                />
              </div>
            </div>

            {/* وقت الفتح (Open Time) */}
            <div
              className="absolute z-20 flex items-center justify-center"
              style={{
                top: `${rowTopPercent}%`,
                right: "37.1%",
                width: "8.5%",
                height: "3.4%",
              }}
            >
              {day.is_closed ? (
                <span className="text-[11px] font-bold text-gray-400">-- : --</span>
              ) : (
                <input
                  type="time"
                  value={day.open_time}
                  onChange={(e) => handleTimeChange(idx, "open_time", e.target.value)}
                  className="w-full bg-white/95 rounded-lg border border-[#e3d5c1] text-[10px] font-bold text-[#3a2818] text-center outline-none py-0.5 cursor-pointer shadow-2xs"
                />
              )}
            </div>

            {/* وقت الإغلاق (Close Time) */}
            <div
              className="absolute z-20 flex items-center justify-center"
              style={{
                top: `${rowTopPercent}%`,
                right: "47.2%",
                width: "8.5%",
                height: "3.4%",
              }}
            >
              {day.is_closed ? (
                <span className="text-[11px] font-bold text-gray-400">-- : --</span>
              ) : (
                <input
                  type="time"
                  value={day.close_time}
                  onChange={(e) => handleTimeChange(idx, "close_time", e.target.value)}
                  className="w-full bg-white/95 rounded-lg border border-[#e3d5c1] text-[10px] font-bold text-[#3a2818] text-center outline-none py-0.5 cursor-pointer shadow-2xs"
                />
              )}
            </div>
          </React.Fragment>
        );
      })}

      {/* =========================================================================
          [5] زر حفظ جميع التغييرات (Save Action Button)
         ========================================================================= */}
      <button
        type="button"
        disabled={saving}
        onClick={handleSaveAll}
        className="absolute z-20 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
        style={{
          top: "88.6%",
          left: "1.6%",
          width: "41.9%",
          height: "4.7%",
          background: "linear-gradient(to right, #d32f2f, #b71c1c)",
          boxShadow: "0 4px 14px rgba(180, 25, 25, 0.4)",
        }}
      >
        <span className="text-white font-extrabold text-xs md:text-sm flex items-center gap-2">
          {saving ? (
            <>
              <span className="inline-block animate-spin">⏳</span>
              <span>جاري حفظ التعديلات في السيرفر...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>حفظ جميع التغييرات</span>
            </>
          )}
        </span>
      </button>

      {/* =========================================================================
          القائمة الجانبية (Sidebar Navigation Items Hotspots)
         ========================================================================= */}
      {/* 1. الرئيسية */}
      <button
        type="button"
        onClick={() => setActiveMenu("main")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "30.8%", right: "1.2%", width: "15.0%", height: "5.5%" }}
        title="الرئيسية"
      />

      {/* 2. الطلبات (مع إشعار 12) */}
      <button
        type="button"
        onClick={() => {
          setActiveMenu("orders");
          showToast("صفحة إدارة الطلبات الحية ستتوفر في المرحلة القادمة! 📋");
        }}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "37.5%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="الطلبات (12 طلب نشط)"
      />

      {/* 3. قائمة الطعام والمنتجات */}
      <button
        type="button"
        onClick={() => {
          if (onNavigate) {
            onNavigate("menu");
          } else {
            setActiveMenu("menu");
          }
        }}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "43.2%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="قائمة الطعام والمنتجات"
      />

      {/* 4. العملاء */}
      <button
        type="button"
        onClick={() => showToast("صفحة إدارة العملاء ستتوفر قريباً! 👥")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "49.0%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="العملاء"
      />

      {/* 5. التقارير والإحصائيات */}
      <button
        type="button"
        onClick={() => showToast("شاشة التقارير والمحفظة المالية قادمة! 📊")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "54.8%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="التقارير والإحصائيات"
      />

      {/* 6. الإعدادات (الصفحة الحالية) */}
      <button
        type="button"
        onClick={() => showToast("أنت بالفعل في صفحة إعدادات المتجر الحالية! ⚙️")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "60.5%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="الإعدادات والتشغيل"
      />

      {/* 7. الدعم والمساعدة */}
      <button
        type="button"
        onClick={() => showToast("فريق دعم حواديت معك دائماً عبر الواتساب والهاتف 🎧")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "66.2%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="الدعم والمساعدة"
      />

      {/* 8. تسجيل الخروج */}
      <button
        type="button"
        onClick={onLogout}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/15 active:scale-95 transition-all"
        style={{ top: "71.9%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="تسجيل الخروج وإبطال التوكن"
      />
    </div>
  );
}
