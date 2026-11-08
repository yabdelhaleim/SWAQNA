"use client";

import React, { useState, useEffect } from "react";
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
  Home,
  ShoppingBag,
  UtensilsCrossed,
  Users,
  BarChart2,
  Settings,
  Headphones,
  ChevronRight,
  X,
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

// ======== Toggle Switch Component ========
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-emerald-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
          checked ? "-translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

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
  const [fulfillmentType, setFulfillmentType] = useState<string>(
    initialMerchant?.fulfillment_type || "MERCHANT_DELIVERY"
  );
  const [fulfillmentRequestStatus, setFulfillmentRequestStatus] = useState<string>(
    initialMerchant?.fulfillment_request_status || "NONE"
  );
  const [fulfillmentNotes, setFulfillmentNotes] = useState<string>("");
  const [businessHours, setBusinessHours] = useState<BusinessHourItem[]>(DEFAULT_DAYS);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingMedia, setUploadingMedia] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // جلب إعدادات المتجر بـ Eager Loading عند الفتح
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
          setFulfillmentType(d.fulfillment_type || "MERCHANT_DELIVERY");
          setFulfillmentRequestStatus(d.fulfillment_request_status || "NONE");
          if (d.fulfillment_request_notes) setFulfillmentNotes(d.fulfillment_request_notes);
          if (d.business_hours && Array.isArray(d.business_hours) && d.business_hours.length > 0) {
            const mapped = DEFAULT_DAYS.map((defDay) => {
              const found = d.business_hours.find((h: any) => h.day_of_week === defDay.day_of_week);
              if (found) return { ...defDay, open_time: found.open_time || defDay.open_time, close_time: found.close_time || defDay.close_time, is_closed: Boolean(found.is_closed) };
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
    return () => { isMounted = false; };
  }, [token]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const toggleDayStatus = (index: number) => {
    setBusinessHours((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], is_closed: !updated[index].is_closed };
      return updated;
    });
  };

  const handleTimeChange = (index: number, field: "open_time" | "close_time", value: string) => {
    setBusinessHours((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const applyFirstDayToAll = () => {
    const src = businessHours[0];
    setBusinessHours((prev) =>
      prev.map((day, idx) => idx === 0 ? day : { ...day, open_time: src.open_time, close_time: src.close_time, is_closed: src.is_closed })
    );
    showToast("تم نسخ مواعيد السبت على جميع الأيام ✅");
  };

  const handleRequestPlatformDelivery = async () => {
    if (fulfillmentRequestStatus === "PENDING_APPROVAL") {
      showToast("طلبك قيد المراجعة بالفعل من الإدارة.", "error");
      return;
    }
    try {
      setSaving(true);
      const res = await merchantApi.requestFulfillmentChange(token, {
        requested_fulfillment_type: "PLATFORM_DELIVERY",
        notes: fulfillmentNotes || "نطلب الانضمام لكباتن أسطول حواديت.",
      });
      if (res.success) {
        setFulfillmentRequestStatus("PENDING_APPROVAL");
        showToast("تم إرسال طلب التوصيل عبر كباتن حواديت! ⏳");
      } else {
        showToast(res.message || "حدث خطأ.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "فشل الاتصال.", "error");
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
      if (!profileRes.success) throw new Error(profileRes.message || "فشل تحديث البيانات.");

      const hoursPayload = businessHours.map((h) => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time.length === 5 ? `${h.open_time}:00` : h.open_time,
        close_time: h.close_time.length === 5 ? `${h.close_time}:00` : h.close_time,
        is_closed: h.is_closed,
      }));
      const hoursRes = await merchantApi.updateBusinessHours(token, hoursPayload);
      if (!hoursRes.success) throw new Error(hoursRes.message || "فشل تحديث ساعات العمل.");

      showToast("تم حفظ جميع التعديلات بنجاح! 🎉");
    } catch (err: any) {
      showToast(err.message || "خطأ أثناء الحفظ.", "error");
    } finally {
      setSaving(false);
    }
  };

  const merchantTypeLabel = merchantType === "HOME_KITCHEN" ? "أكل بيتي" : merchantType === "RESTAURANT" ? "مطعم" : "محل تجاري";

  const TABS = [
    { id: 1, label: "بيانات المتجر", icon: "🏪" },
    { id: 2, label: "وقت التجهيز", icon: "⏱️" },
    { id: 3, label: "ساعات العمل", icon: "📅" },
    { id: 4, label: "نظام التوصيل", icon: "🚴" },
  ];

  const NAV_ITEMS = [
    { id: "main", label: "الرئيسية", icon: Home, badge: null },
    { id: "orders", label: "الطلبات", icon: ShoppingBag, badge: 12 },
    { id: "menu", label: "قائمة الطعام", icon: UtensilsCrossed, badge: null },
    { id: "customers", label: "العملاء", icon: Users, badge: null },
    { id: "reports", label: "التقارير والإحصائيات", icon: BarChart2, badge: null },
    { id: "settings", label: "الإعدادات", icon: Settings, badge: null },
    { id: "support", label: "الدعم والمساعدة", icon: Headphones, badge: null },
  ];

  return (
    <div className="flex h-screen w-full bg-[#f5ede0] overflow-hidden" dir="rtl">

      {/* ========= Toast ========= */}
      {toastMessage && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold border animate-bounce ${
          toastMessage.type === "success" ? "bg-emerald-600 text-white border-emerald-400" : "bg-red-600 text-white border-red-400"
        }`}>
          {toastMessage.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
        </div>
      )}

      {/* ========= SIDEBAR ========= */}
      <aside className="w-48 shrink-0 flex flex-col bg-gradient-to-b from-[#5c1a1a] via-[#7a2222] to-[#8b4513] shadow-2xl overflow-y-auto">
        {/* Logo */}
        <div className="flex flex-col items-center py-5 px-3 border-b border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-2 shadow-inner">
            <span className="text-3xl">🍲</span>
          </div>
          <span className="text-white font-black text-sm">حواديتلي</span>
          <span className="text-white/60 text-[10px]">لوحة تحكم التاجر</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === "settings";
            const isMenu = item.id === "menu";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isMenu && onNavigate) onNavigate("menu");
                  else if (item.id === "orders") showToast("صفحة الطلبات الحية قادمة قريباً! 📋");
                  else if (item.id !== "settings") showToast(`${item.label} قادمة قريباً!`);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-right text-xs font-bold transition-all ${
                  isActive
                    ? "bg-white text-[#8b1e1e] shadow-md"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-red-700/40 text-xs font-bold transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ========= MAIN CONTENT ========= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ======= HEADER ======= */}
        <header className="shrink-0 bg-white border-b border-[#e8d8c4] shadow-sm px-6 py-3 flex items-center justify-between">
          {/* Left: Store Name & Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b1e1e] to-[#c0392b] flex items-center justify-center shadow">
              <span className="text-lg">🏠</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-[#3a2818] text-sm">{storeName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span className="text-emerald-600 font-bold">متصل الآن • مفتوح ويستقبل طلبات</span>
              </div>
            </div>
          </div>

          {/* Right: User & Notifications */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => showToast("لا توجد إشعارات جديدة.")}
              className="relative w-9 h-9 rounded-xl bg-[#fdf0e6] hover:bg-[#fce4c8] flex items-center justify-center transition-colors"
            >
              <Bell className="w-4.5 h-4.5 text-[#8b1e1e]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">3</span>
            </button>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-xl px-3 py-2 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a574] to-[#c0855a] flex items-center justify-center shadow">
                <span className="text-white text-xs font-black">أح</span>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-[#3a2818]">{user?.full_name || "أحمد محمود"}</div>
                <div className="text-[10px] text-gray-500">مدير المتجر</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
        </header>

        {/* ======= STORE BANNER ======= */}
        <div className="shrink-0 mx-6 mt-4 rounded-2xl overflow-hidden relative h-32 bg-gradient-to-l from-[#8b1e1e] via-[#a52a2a] to-[#6b4423] shadow-lg">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('/images/dashboard-design.jpg')", backgroundSize: "cover", backgroundPosition: "center top" }} />
          <div className="relative z-10 p-5 flex items-center justify-between h-full">
            <div>
              <h1 className="text-white font-black text-xl drop-shadow">{storeName}</h1>
              <div className="flex items-center gap-3 mt-1 text-white/80 text-xs">
                <span>النوع: {merchantTypeLabel}</span>
                <span>•</span>
                <span>⭐ 0.0 (جديد)</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-emerald-300 text-[11px] font-bold">الحالة: مفتوح ويستقبل طلبات</span>
              </div>
            </div>
            <label className="flex items-center gap-1.5 bg-black/30 hover:bg-black/50 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer transition-colors border border-white/20 backdrop-blur-sm">
              <Camera className="w-4 h-4" />
              <span>{uploadingMedia ? "جاري الرفع..." : "تغيير الغلاف"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingMedia(true);
                try {
                  const fd = new FormData(); fd.append("type", "cover"); fd.append("image", file);
                  const res = await merchantApi.uploadMedia(token, fd);
                  if (res.success) showToast("تم تحديث غلاف المتجر! 📸");
                  else showToast(res.message || "فشل رفع الصورة.", "error");
                } catch { showToast("فشل رفع الصورة.", "error"); } finally { setUploadingMedia(false); }
              }} />
            </label>
          </div>
          {/* Mascot */}
          <div className="absolute left-4 bottom-0 opacity-30 text-6xl pointer-events-none select-none">🧑‍🍳</div>
        </div>

        {/* ======= TABS ======= */}
        <div className="shrink-0 mx-6 mt-4 flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#d32f2f] text-white shadow-md"
                  : "bg-white text-[#5a3a2a] hover:bg-[#fdf0e6] border border-[#e8d8c4]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.id}. {tab.label}</span>
            </button>
          ))}
        </div>

        {/* ======= TAB CONTENT (Scrollable) ======= */}
        <div className="flex-1 overflow-y-auto mx-6 my-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="flex flex-col items-center gap-3 text-[#8b4513]">
                <div className="w-10 h-10 border-4 border-[#d32f2f] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold">جاري تحميل بيانات المتجر...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">

              {/* ===== TAB 1: بيانات المتجر ===== */}
              {activeTab === 1 && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#e8d8c4] p-5">
                  <h2 className="flex items-center gap-2 text-sm font-black text-[#3a2818] mb-4">
                    <span className="w-7 h-7 bg-[#fdf0e6] rounded-lg flex items-center justify-center">🏪</span>
                    البيانات الأساسية
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#5a3a2a] mb-1">اسم المتجر</label>
                      <div className="flex items-center gap-2 bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2.5 focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/15 transition-all">
                        <Store className="w-4 h-4 text-[#8b1e1e] shrink-0" />
                        <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="flex-1 bg-transparent text-sm font-bold text-[#3a2818] outline-none text-right" placeholder="اسم المتجر" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5a3a2a] mb-1">العنوان التفصيلي</label>
                      <div className="flex items-center gap-2 bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2.5 focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/15 transition-all">
                        <MapPin className="w-4 h-4 text-[#8b1e1e] shrink-0" />
                        <input type="text" value={addressText} onChange={(e) => setAddressText(e.target.value)} className="flex-1 bg-transparent text-sm font-bold text-[#3a2818] outline-none text-right" placeholder="المعادي، شارع النصر" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5a3a2a] mb-1">الحد الأدنى لقيمة الطلب</label>
                      <div className="flex items-center gap-2 bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2.5 focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/15 transition-all">
                        <span className="text-xs font-black text-[#8b1e1e]">ج.م</span>
                        <input type="number" value={minOrderAmount} onChange={(e) => setMinOrderAmount(Math.max(0, Number(e.target.value)))} className="flex-1 bg-transparent text-sm font-bold text-[#3a2818] outline-none text-center" />
                        <span>💰</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#5a3a2a] mb-1">نطاق التوصيل الجغرافي</label>
                      <div className="flex items-center gap-2 bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2.5 focus-within:border-[#d32f2f] transition-all">
                        <span>📍</span>
                        <select value={deliveryRadius} onChange={(e) => setDeliveryRadius(Number(e.target.value))} className="flex-1 bg-transparent text-sm font-bold text-[#3a2818] outline-none appearance-none text-right cursor-pointer">
                          <option value={5}>5 كم</option>
                          <option value={10}>10 كم</option>
                          <option value={15}>15 كم</option>
                          <option value={20}>20 كم</option>
                          <option value={30}>30 كم</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== TAB 2: وقت التجهيز ===== */}
              {activeTab === 2 && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#e8d8c4] p-5">
                  <h2 className="flex items-center gap-2 text-sm font-black text-[#3a2818] mb-4">
                    <span className="w-7 h-7 bg-[#fdf0e6] rounded-lg flex items-center justify-center">⏱️</span>
                    وقت تجهيز الطلبات
                  </h2>
                  <div className="flex flex-col items-center gap-6 py-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-6xl font-black text-[#d32f2f]">{prepTime}</div>
                      <div className="text-lg font-bold text-[#5a3a2a]">دقيقة</div>
                    </div>
                    <div className="w-full max-w-md">
                      <input
                        type="range" min={30} max={240} step={5} value={prepTime}
                        onChange={(e) => setPrepTime(Number(e.target.value))}
                        className="w-full h-3 rounded-full appearance-none cursor-pointer accent-[#d32f2f] bg-[#f0e4d0]"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1 font-bold">
                        <span>240 دقيقة</span>
                        <span>30 دقيقة</span>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md text-center">
                      <p className="text-sm text-amber-800 font-bold">
                        🏠 نظرًا لأن أطباقك تُطهى طازجة، حددي الوقت الكافي للطهي
                      </p>
                      <p className="text-xs text-amber-600 mt-1">المطابخ المنزلية عادةً: 90–180 دقيقة</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== TAB 3: ساعات العمل ===== */}
              {activeTab === 3 && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#e8d8c4] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="flex items-center gap-2 text-sm font-black text-[#3a2818]">
                      <span className="w-7 h-7 bg-[#fdf0e6] rounded-lg flex items-center justify-center">📅</span>
                      جدول ساعات العمل الأسبوعي
                    </h2>
                    <button
                      type="button" onClick={applyFirstDayToAll}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#8b1e1e] bg-[#fdf0e6] hover:bg-[#fce4c8] px-3 py-2 rounded-xl transition-colors border border-[#e8c8a8]"
                    >
                      <span>📋</span>
                      تطبيق مواعيد السبت على باقي أيام الأسبوع
                    </button>
                  </div>
                  <div className="space-y-2">
                    {/* Header Row */}
                    <div className="grid grid-cols-4 gap-3 px-4 py-2 bg-[#fdfaf5] rounded-xl text-xs font-black text-[#5a3a2a]">
                      <span>اليوم</span>
                      <span className="text-center">الحالة</span>
                      <span className="text-center">الفتح</span>
                      <span className="text-center">الإغلاق</span>
                    </div>
                    {businessHours.map((day, idx) => (
                      <div key={day.day_of_week} className={`grid grid-cols-4 gap-3 items-center px-4 py-3 rounded-xl transition-colors ${day.is_closed ? "bg-gray-50 opacity-70" : "bg-[#fdfaf5] hover:bg-[#fdf5ec]"}`}>
                        <span className="text-sm font-black text-[#3a2818]">{day.day_name}</span>
                        <div className="flex items-center justify-center gap-2">
                          <ToggleSwitch checked={!day.is_closed} onChange={() => toggleDayStatus(idx)} />
                          <span className={`text-[11px] font-bold ${day.is_closed ? "text-gray-400" : "text-emerald-600"}`}>
                            {day.is_closed ? "مغلق" : "مفتوح"}
                          </span>
                        </div>
                        <div className="flex justify-center">
                          {day.is_closed ? (
                            <span className="text-xs text-gray-400 font-bold">--:--</span>
                          ) : (
                            <input type="time" value={day.open_time} onChange={(e) => handleTimeChange(idx, "open_time", e.target.value)} className="bg-white border border-[#e3d5c1] rounded-lg text-xs font-bold text-[#3a2818] text-center outline-none py-1 px-2 cursor-pointer w-24" />
                          )}
                        </div>
                        <div className="flex justify-center">
                          {day.is_closed ? (
                            <span className="text-xs text-gray-400 font-bold">--:--</span>
                          ) : (
                            <input type="time" value={day.close_time} onChange={(e) => handleTimeChange(idx, "close_time", e.target.value)} className="bg-white border border-[#e3d5c1] rounded-lg text-xs font-bold text-[#3a2818] text-center outline-none py-1 px-2 cursor-pointer w-24" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== TAB 4: نظام التوصيل ===== */}
              {activeTab === 4 && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#e8d8c4] p-5">
                  <h2 className="flex items-center gap-2 text-sm font-black text-[#3a2818] mb-4">
                    <span className="w-7 h-7 bg-[#fdf0e6] rounded-lg flex items-center justify-center">🚴</span>
                    نظام التوصيل
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Option 1: Merchant Delivery */}
                    <div
                      onClick={() => setFulfillmentType("MERCHANT_DELIVERY")}
                      className={`relative cursor-pointer rounded-2xl p-4 border-2 transition-all ${
                        fulfillmentType === "MERCHANT_DELIVERY"
                          ? "border-emerald-500 bg-emerald-50 shadow-md"
                          : "border-[#e8d8c4] bg-[#fdfaf5] hover:border-[#d32f2f]/40"
                      }`}
                    >
                      {fulfillmentType === "MERCHANT_DELIVERY" && (
                        <span className="absolute top-3 left-3 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                      <div className="text-3xl mb-2">🏍️</div>
                      <h3 className="font-black text-[#3a2818] text-sm mb-1">توصيل بمعرفتك</h3>
                      <p className="text-xs text-gray-500">توصيل التاجر الخاص</p>
                      <div className="flex items-center gap-1 mt-2 text-emerald-600 text-xs font-bold">
                        <Check className="w-3.5 h-3.5" />
                        <span>مجاني</span>
                      </div>
                    </div>

                    {/* Option 2: Platform Delivery */}
                    <div
                      onClick={handleRequestPlatformDelivery}
                      className={`relative cursor-pointer rounded-2xl p-4 border-2 transition-all ${
                        fulfillmentRequestStatus === "PENDING_APPROVAL"
                          ? "border-amber-400 bg-amber-50 shadow-md"
                          : "border-[#e8d8c4] bg-[#fdfaf5] hover:border-[#d32f2f]/40"
                      }`}
                    >
                      {fulfillmentRequestStatus === "PENDING_APPROVAL" && (
                        <span className="absolute top-3 left-3 bg-amber-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          قيد المراجعة
                        </span>
                      )}
                      <div className="text-3xl mb-2">🛵</div>
                      <h3 className="font-black text-[#3a2818] text-sm mb-1">طلب التوصيل عبر كباتن حواديت</h3>
                      <p className="text-xs text-gray-500">التوصيل عبر منصة حواديت</p>
                      <div className="flex items-center gap-1 mt-2 text-amber-600 text-xs font-bold">
                        <span>☑️</span>
                        <span>طلب قيد المراجعة</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes Field */}
                  <div>
                    <label className="block text-xs font-bold text-[#5a3a2a] mb-1">ملاحظات إضافية (اختياري)</label>
                    <div className="flex items-center gap-2 bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2.5 focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/15 transition-all">
                      <input
                        type="text" value={fulfillmentNotes}
                        onChange={(e) => setFulfillmentNotes(e.target.value)}
                        placeholder="أي ملاحظات بخصوص مناطق التوصيل..."
                        className="flex-1 bg-transparent text-sm text-[#3a2818] outline-none text-right"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======= SAVE BUTTON (Sticky Footer) ======= */}
        <div className="shrink-0 mx-6 mb-5">
          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSaveAll}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg"
            style={{ background: "linear-gradient(to left, #d32f2f, #b71c1c)", boxShadow: "0 6px 20px rgba(180,25,25,0.35)" }}
          >
            {saving ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                <span>جاري حفظ التعديلات في السيرفر...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>💾 حفظ جميع التغييرات</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
