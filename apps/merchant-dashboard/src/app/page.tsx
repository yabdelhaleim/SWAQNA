"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Send,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Store,
  MapPin,
  UtensilsCrossed,
  ShoppingBag,
  Home as HomeIcon,
  Phone,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { merchantApi } from "@/lib/api";
import MerchantDashboardView from "@/components/MerchantDashboardView";
import MerchantMenuView from "@/components/MerchantMenuView";

type Step = "PHONE" | "OTP" | "REGISTER_STORE" | "DASHBOARD";
type MerchantType = "RESTAURANT" | "RETAIL_SHOP" | "HOME_KITCHEN";

export default function MerchantAuthPage() {
  const [step, setStep] = useState<Step>("PHONE");
  const [currentDashboardView, setCurrentDashboardView] = useState<"settings" | "menu">("menu");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [token, setToken] = useState<string | null>(null);
  const [merchantData, setMerchantData] = useState<any>(null);

  // New Store Form State
  const [storeName, setStoreName] = useState("");
  const [merchantType, setMerchantType] = useState<MerchantType>("HOME_KITCHEN");
  const [addressText, setAddressText] = useState("");

  // Timers and UI State
  const [countdown, setCountdown] = useState(150); // دقيقتان ونصف
  const [resendCooldown, setResendCooldown] = useState(60); // 60 ثانية لإعادة الإرسال
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  // OTP Inputs refs for auto-focus
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // عداد الـ OTP التنازلي
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "OTP") {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step]);

  // فحص تسجيل الدخول المحفوظ مسبقاً (Session Persistence)
  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("hawadeet_merchant_token") : null;
    if (savedToken) {
      setToken(savedToken);
      merchantApi
        .getSettings(savedToken)
        .then((res) => {
          if (res.success && res.data) {
            setMerchantData(res.data);
            setStep("DASHBOARD");
          } else {
            localStorage.removeItem("hawadeet_merchant_token");
          }
        })
        .catch(() => {
          localStorage.removeItem("hawadeet_merchant_token");
        });
    }
  }, []);

  // تسجيل الخروج
  const handleLogout = async () => {
    if (token) {
      try {
        await merchantApi.logout(token);
      } catch (err) {}
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("hawadeet_merchant_token");
    }
    setToken(null);
    setMerchantData(null);
    setPhoneNumber("");
    setOtpCode(["", "", "", ""]);
    setStep("PHONE");
  };

  // تنسيق الثواني لصيغة mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 1. إرسال كود الـ OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleaned = phoneNumber.replace(/[^0-9]/g, "");
    if (!/^(010|011|012|015)[0-9]{8}$/.test(cleaned)) {
      setErrorMessage("يرجى إدخال رقم هاتف مصري صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015).");
      return;
    }

    setLoading(true);
    try {
      const res = await merchantApi.sendOtp(cleaned);
      if (res.success) {
        setPhoneNumber(cleaned);
        setCountdown(res.expires_in_seconds || 150);
        setResendCooldown(res.resend_in_seconds || 60);
        setDebugCode(res.debug_code || null);
        setStep("OTP");
      } else {
        setErrorMessage(res.message || "فشل إرسال كود التحقق. يرجى المحاولة لاحقاً.");
      }
    } catch (err) {
      setErrorMessage("تعذر الاتصال بالسيرفر. تأكد من تشغيل الباك إند.");
    } finally {
      setLoading(false);
    }
  };

  // 2. معالجة كتابة أرقام الـ OTP والقفز التلقائي
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (newOtp.every((digit) => digit !== "")) {
      verifyCode(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  // 3. فحص كود الـ OTP
  const verifyCode = async (code: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await merchantApi.verifyOtp(phoneNumber, code);
      if (res.success) {
        setToken(res.token || null);
        if (res.token && typeof window !== "undefined") {
          localStorage.setItem("hawadeet_merchant_token", res.token);
        }
        if (res.is_new_merchant) {
          setStep("REGISTER_STORE");
        } else {
          setMerchantData(res.merchant);
          setStep("DASHBOARD");
        }
      } else {
        setErrorMessage(res.message || "كود التحقق غير صحيح.");
      }
    } catch (err) {
      setErrorMessage("حدث خطأ أثناء فحص الكود. يرجى المحاولة ثانية.");
    } finally {
      setLoading(false);
    }
  };

  // 4. إنشاء المتجر للتاجر الجديد
  const handleRegisterStore = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;

    if (!storeName.trim() || storeName.length < 3) {
      setErrorMessage("يرجى كتابة اسم المتجر (3 أحرف على الأقل).");
      return;
    }
    if (!addressText.trim() || addressText.length < 5) {
      setErrorMessage("يرجى كتابة عنوان أو منطقة المتجر بالتفصيل.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await merchantApi.registerStore(token, {
        store_name: storeName,
        merchant_type: merchantType,
        address_text: addressText,
        latitude: 30.0444,
        longitude: 31.2357,
      });

      if (res.success) {
        setMerchantData(res.merchant);
        setStep("DASHBOARD");
      } else {
        setErrorMessage(res.message || "فشل تسجيل المتجر. يرجى مراجعة البيانات.");
      }
    } catch (err) {
      setErrorMessage("تعذر إتمام تسجيل المتجر. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full select-none" dir="rtl">
      
      {/* 🌟 كود التيست التوضيحي السريع في بيئة التطوير */}
      {debugCode && step === "OTP" && (
        <div className="fixed top-3 left-3 z-50 bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 border border-emerald-400 animate-bounce">
          <span>كود التجربة السريع:</span>
          <span className="font-bold text-base bg-emerald-950 px-2 py-0.5 rounded">{debugCode}</span>
        </div>
      )}

      {/* ⚡ زر المعاينة السريعة للوحة التحكم في بيئة التطوير */}
      {step !== "DASHBOARD" && (
        <button
          onClick={() => setStep("DASHBOARD")}
          className="fixed bottom-4 left-4 z-50 bg-gradient-to-r from-[#d32f2f] to-[#8b1e1e] text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-2xl border border-amber-300/40 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>معاينة لوحة التحكم مباشرة</span>
          <span>⚡</span>
        </button>
      )}

      {/* =========================================================================
          عند الدخول للوحة التحكم: عرض الشاشة المحددة (قائمة الطعام أو إعدادات المتجر)
         ========================================================================= */}
      {step === "DASHBOARD" ? (
        <div className="w-full h-screen overflow-hidden">
          {currentDashboardView === "menu" ? (
            <MerchantMenuView
              token={token || "mock-token"}
              storeName={merchantData?.name || "مطبخ أم أحمد للأكل البيتي"}
              user={{ full_name: "أحمد محمود (المدير)" }}
              onNavigate={(v) => setCurrentDashboardView(v)}
              onLogout={handleLogout}
            />
          ) : (
            <MerchantDashboardView
              token={token || "mock-token"}
              initialMerchant={merchantData}
              user={{ full_name: "أحمد محمود (المدير)" }}
              onNavigate={(v) => setCurrentDashboardView(v)}
              onLogout={handleLogout}
            />
          )}
        </div>
      ) : (
        /* =========================================================================
           شاشات المصادقة والتسجيل (Phone / OTP / Register) - ملء الشاشة بالكامل وبشكل Responsive
           ========================================================================= */
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#2a1308]">
          
          {/* الخلفية الحية المستوحاة من أجواء حواديت المصرية تملأ كامل نافذة المتصفح */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/bg-phone.jpg"
              alt="حواديت - أجواء مصرية"
              fill
              priority
              className="object-cover object-center filter blur-[1px] brightness-75 scale-105"
            />
            {/* طبقة تدرج دافئة لضمان الراحة البصرية والتباين */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1f0b04]/85 via-[#30160a]/60 to-[#1f0b04]/85 backdrop-blur-[2px]" />
          </div>

          {/* الكارت المركزي المتجاوب والمطابق لهوية التطبيق */}
          <div className="relative z-10 w-full max-w-md bg-[#fffdf9]/95 backdrop-blur-md rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-amber-200/50 p-6 sm:p-8">
            
            {/* الشعار والرمز التعريفي */}
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d32f2f] to-[#8b1e1e] text-white flex items-center justify-center text-3xl shadow-xl shadow-red-950/30 mb-2 border-2 border-amber-300/40">
                <span>🍲</span>
              </div>
              <h1 className="text-2xl font-black text-[#3a2818] tracking-tight">حواديت</h1>
              <p className="text-xs font-bold text-amber-800/80 mt-0.5">لكل أكلة حكاية • لوحة تحكم التاجر</p>
            </div>

            {/* رسالة الخطأ إن وُجدت */}
            {errorMessage && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl p-3 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ===================================================================
                1. شاشة رقم الهاتف
               =================================================================== */}
            {step === "PHONE" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-black text-[#3a2818]">مرحباً بك في لوحة تحكم التاجر</h2>
                  <p className="text-xs text-gray-500 mt-1">سجل دخولك لمتابعة مبيعاتك واستقبال الطلبات</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a3a2a] mb-1.5 text-right">رقم الهاتف</label>
                  <div className="flex items-center bg-[#fdfaf5] border-2 border-[#e3d0b1] focus-within:border-[#d32f2f] focus-within:ring-4 focus-within:ring-[#d32f2f]/10 rounded-2xl px-3 py-2.5 transition-all">
                    <span className="text-xs font-black text-[#8b1e1e] bg-[#f8ede0] px-2 py-1 rounded-lg shrink-0">
                      🇪🇬 +20
                    </span>
                    <input
                      type="tel"
                      dir="ltr"
                      maxLength={11}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="010xxxxxxxx"
                      className="flex-1 bg-transparent text-base font-bold text-[#3a2818] outline-none text-left px-2 tracking-wider"
                      autoFocus
                    />
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg"
                  style={{
                    background: "linear-gradient(to left, #d32f2f, #b71c1c)",
                    boxShadow: "0 6px 20px rgba(180,25,25,0.4)",
                  }}
                >
                  {loading ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 -rotate-45" />
                      <span>إرسال كود التحقق</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ===================================================================
                2. شاشة إدخال رمز التحقق OTP
               =================================================================== */}
            {step === "OTP" && (
              <div className="space-y-5 text-center">
                <div>
                  <h2 className="text-lg font-black text-[#3a2818]">تأكيد كود التحقق</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    تم إرسال كود التحقق في رسالة نصية إلى{" "}
                    <span className="font-bold text-[#b71c1c]" dir="ltr">{phoneNumber}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStep("PHONE"); setOtpCode(["", "", "", ""]); }}
                    className="text-xs font-bold text-[#d32f2f] hover:underline mt-1 inline-block"
                  >
                    تعديل الرقم ✏️
                  </button>
                </div>

                {/* 4 خانات OTP */}
                <div className="flex justify-center gap-3 my-4" dir="ltr">
                  {otpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={inputRefs[idx]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-14 h-14 text-2xl font-black text-center text-[#3a2818] bg-[#fbf5e7] border-2 border-[#e0cca9] rounded-2xl focus:border-[#d32f2f] focus:bg-white focus:ring-4 focus:ring-[#d32f2f]/20 focus:outline-none transition-all shadow-inner"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                {/* عداد انتهاء الكود */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 font-bold">
                  <Clock className="w-4 h-4 text-[#d32f2f]" />
                  <span>ينتهي الكود خلال:</span>
                  <span className="text-[#d32f2f] font-mono font-black text-sm">{formatTime(countdown)}</span>
                </div>

                {/* زر إعادة الإرسال */}
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => handleSendOtp()}
                  className={`w-full py-3 rounded-2xl font-bold text-xs transition-all ${
                    resendCooldown > 0
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-[#fdf0e6] text-[#8b1e1e] hover:bg-[#fce4c8] border border-[#e8c8a8]"
                  }`}
                >
                  {resendCooldown > 0
                    ? `إعادة إرسال الكود خلال ${resendCooldown} ثانية`
                    : "إعادة إرسال كود جديد الآن 🔄"}
                </button>
              </div>
            )}

            {/* ===================================================================
                3. شاشة تسجيل بيانات المتجر الجديد
               =================================================================== */}
            {step === "REGISTER_STORE" && (
              <form onSubmit={handleRegisterStore} className="space-y-4">
                <div className="text-center mb-3">
                  <h2 className="text-lg font-black text-[#3a2818]">بيانات متجرك الجديد</h2>
                  <p className="text-xs text-gray-500 mt-1">خطوة أخيرة للبدء في استقبال الزبائن والطلبات</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a3a2a] mb-1">اسم المتجر</label>
                  <div className="flex items-center bg-[#fdfaf5] border border-[#e3d0b1] focus-within:border-[#d32f2f] rounded-xl px-3 py-2.5">
                    <Store className="w-4 h-4 text-[#8b1e1e] shrink-0" />
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="مثال: حلويات أم يوسف / كشري البرنس"
                      className="flex-1 bg-transparent text-sm font-bold text-[#3a2818] outline-none text-right px-2"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a3a2a] mb-1.5">نوع النشاط</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMerchantType("HOME_KITCHEN")}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                        merchantType === "HOME_KITCHEN"
                          ? "border-[#d32f2f] bg-red-50/60 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <span className="text-2xl mb-1">🏠</span>
                      <span className="text-[11px] font-black text-[#3a2818]">أكل بيتي</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMerchantType("RETAIL_SHOP")}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                        merchantType === "RETAIL_SHOP"
                          ? "border-[#d32f2f] bg-red-50/60 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <span className="text-2xl mb-1">🏪</span>
                      <span className="text-[11px] font-black text-[#3a2818]">محل تجاري</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMerchantType("RESTAURANT")}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                        merchantType === "RESTAURANT"
                          ? "border-[#d32f2f] bg-red-50/60 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <span className="text-2xl mb-1">🍽️</span>
                      <span className="text-[11px] font-black text-[#3a2818]">مطعم</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a3a2a] mb-1">العنوان أو المنطقة</label>
                  <div className="flex items-center bg-[#fdfaf5] border border-[#e3d0b1] focus-within:border-[#d32f2f] rounded-xl px-3 py-2.5">
                    <MapPin className="w-4 h-4 text-[#8b1e1e] shrink-0" />
                    <input
                      type="text"
                      value={addressText}
                      onChange={(e) => setAddressText(e.target.value)}
                      placeholder="مثال: المعادي، شارع النصر، عمارة 4"
                      className="flex-1 bg-transparent text-sm text-[#3a2818] outline-none text-right px-2"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg mt-2"
                  style={{
                    background: "linear-gradient(to left, #d32f2f, #b71c1c)",
                    boxShadow: "0 6px 20px rgba(180,25,25,0.4)",
                  }}
                >
                  {loading ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      <span>جاري التسجيل...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>إنشاء متجري والدخول للوحة التحكم</span>
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </main>
  );
}
