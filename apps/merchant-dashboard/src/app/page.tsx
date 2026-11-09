"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Send,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Phone,
  Store,
  ChefHat,
  ShoppingBag,
  Utensils,
  MapPin,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { merchantApi } from "@/lib/api";
import MerchantDashboardView from "@/components/MerchantDashboardView";
import MerchantMenuView from "@/components/MerchantMenuView";
import MerchantOrdersView from "@/components/MerchantOrdersView";

type Step = "PHONE" | "OTP" | "REGISTER_STORE" | "DASHBOARD";
type MerchantType = "RESTAURANT" | "RETAIL_SHOP" | "HOME_KITCHEN";

export default function MerchantAuthPage() {
  const [step, setStep] = useState<Step>("PHONE");
  const [currentDashboardView, setCurrentDashboardView] = useState<"settings" | "menu" | "orders">("orders");
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
    <main className="w-screen h-screen overflow-hidden select-none relative bg-[#faf5eb] flex flex-col items-center justify-center font-sans text-[#3a2818]">
      {/* 🌟 كود التجربة السريع في بيئة التطوير */}
      {debugCode && step === "OTP" && (
        <div className="fixed top-3 left-3 z-50 bg-emerald-700 text-white px-4 py-2 rounded-2xl text-xs font-mono shadow-2xl flex items-center gap-2 border border-emerald-400 animate-bounce">
          <span>كود التجربة السريع:</span>
          <span className="font-bold text-base bg-emerald-950 px-2.5 py-0.5 rounded-lg">{debugCode}</span>
        </div>
      )}

      {/* ⚡ زر المعاينة السريعة للوحة التحكم */}
      {step !== "DASHBOARD" && (
        <button
          onClick={() => setStep("DASHBOARD")}
          className="fixed bottom-3 right-3 z-50 bg-[#8c2b18] text-white px-4 py-2 rounded-2xl text-xs font-black shadow-xl border border-amber-300/40 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>معاينة لوحة التحكم مباشرة</span>
          <span>⚡</span>
        </button>
      )}

      {/* =========================================================================
          DASHBOARD VIEW (Orders, Menu, Settings)
         ========================================================================= */}
      {step === "DASHBOARD" ? (
        currentDashboardView === "orders" ? (
          <MerchantOrdersView
            token={token || "mock-token"}
            storeName={merchantData?.name || "مطبخ أم أحمد للأكل البيتي"}
            user={{ full_name: "الشيف أم أحمد" }}
            onNavigate={(v) => setCurrentDashboardView(v)}
            onLogout={handleLogout}
          />
        ) : currentDashboardView === "menu" ? (
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
        )
      ) : (
        /* =====================================================================
           AUTH SCREENS: 100% PURE NATIVE CODE CARDS
           ===================================================================== */
        <div className="w-full max-w-md mx-4 p-7 bg-[#fffdf9] border-2 border-[#eddcc4] rounded-3xl shadow-2xl relative text-right flex flex-col items-center">
          {/* Logo & Character Banner */}
          <div className="relative w-48 h-24 mb-3">
            <Image
              src="/images/assets/chef-logo.jpg"
              alt="Hawadeet Logo"
              fill
              priority
              className="object-contain"
            />
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="w-full mb-4 bg-red-500/10 border border-red-500/30 text-red-700 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ===================================================================
              STEP 1: PHONE NUMBER INPUT
             =================================================================== */}
          {step === "PHONE" && (
            <form onSubmit={handleSendOtp} className="w-full space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black text-[#3a2818]">
                  مرحباً بك في لوحة تحكم التاجر
                </h2>
                <p className="text-xs font-bold text-stone-500">
                  سجّل دخولك لمتابعة مبيعاتك واستقبال الطلبات
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-[#3a2818] mb-1.5 flex items-center justify-between">
                  <span className="text-stone-400 font-normal">مثال: 01012345678</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#8c2b18]" />
                    رقم الهاتف
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-black text-stone-500 pointer-events-none" dir="ltr">
                    EG +20
                  </span>
                  <input
                    type="tel"
                    dir="ltr"
                    maxLength={11}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white text-[#3a2818] text-base font-black rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none focus:ring-4 focus:ring-[#d32f2f]/15 py-3 pl-20 pr-4 text-left tracking-wider transition-all shadow-inner"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#d32f2f] to-[#b71c1c] text-white font-black text-sm shadow-lg hover:shadow-xl hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4 -rotate-45" />
                <span>{loading ? "جاري الإرسال..." : "إرسال كود التحقق"}</span>
              </button>
            </form>
          )}

          {/* ===================================================================
              STEP 2: OTP VERIFICATION
             =================================================================== */}
          {step === "OTP" && (
            <div className="w-full space-y-5">
              {/* Back & Change Phone */}
              <div className="flex items-center justify-between pb-2 border-b border-[#f2e5d3]">
                <button
                  type="button"
                  onClick={() => {
                    setStep("PHONE");
                    setOtpCode(["", "", "", ""]);
                  }}
                  className="text-xs font-bold text-[#8c2b18] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>تعديل الرقم</span>
                </button>
                <span className="text-xs font-bold text-stone-500">
                  تم إرسال الكود إلى <strong className="text-[#3a2818]" dir="ltr">{phoneNumber}</strong>
                </span>
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-lg font-black text-[#3a2818]">
                  تأكيد كود التحقق
                </h2>
                <p className="text-xs font-bold text-stone-500">
                  أدخل الكود المكون من 4 أرقام لتسجيل الدخول
                </p>
              </div>

              {/* 4 OTP Digit Inputs */}
              <div className="flex justify-center gap-3" dir="ltr">
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
                    className="w-14 h-16 text-3xl font-black text-center text-[#3a2818] bg-[#fdfaf3] border-2 border-[#eddcc4] rounded-2xl focus:border-[#d32f2f] focus:bg-white focus:ring-4 focus:ring-[#d32f2f]/15 focus:outline-none transition-all shadow-inner"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600 bg-amber-500/10 border border-amber-500/20 py-2 rounded-xl">
                <Clock className="w-4 h-4 text-[#d32f2f]" />
                <span>ينتهي الكود خلال:&nbsp;</span>
                <span className="text-[#d32f2f] font-mono font-black text-sm">{formatTime(countdown)}</span>
                <span>&nbsp;دقيقة</span>
              </div>

              {/* Resend Button */}
              {resendCooldown <= 0 && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full text-xs font-bold text-[#8c2b18] hover:underline flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة إرسال كود جديد</span>
                </button>
              )}
            </div>
          )}

          {/* ===================================================================
              STEP 3: REGISTER NEW STORE
             =================================================================== */}
          {step === "REGISTER_STORE" && (
            <form onSubmit={handleRegisterStore} className="w-full space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black text-[#3a2818]">
                  إنشاء وتجهيز متجرك 🏪
                </h2>
                <p className="text-xs font-bold text-stone-500">
                  خطوة واحدة فقط لبدء استقبال الطلبات وزيادة مبيعاتك!
                </p>
              </div>

              {/* Store Name Input */}
              <div>
                <label className="block text-xs font-black text-[#3a2818] mb-1 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-[#8c2b18]" />
                  اسم المتجر أو المطعم
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="مثال: مطبخ أم أحمد للأكل البيتي"
                  className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white text-[#3a2818] text-xs font-bold rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none focus:ring-4 focus:ring-[#d32f2f]/15 py-2.5 px-3.5 text-right transition-all shadow-inner"
                  autoFocus
                />
              </div>

              {/* Merchant Type 3 Selection Cards */}
              <div>
                <label className="block text-xs font-black text-[#3a2818] mb-1.5">
                  نوع النشاط التجاري
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Home Kitchen */}
                  <div
                    onClick={() => setMerchantType("HOME_KITCHEN")}
                    className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                      merchantType === "HOME_KITCHEN"
                        ? "bg-amber-100/70 border-[#e67e22] text-[#8c2b18] ring-2 ring-amber-300"
                        : "bg-[#fdfaf3] border-[#eddcc4] text-stone-600 hover:border-amber-400"
                    }`}
                  >
                    <ChefHat className="w-5 h-5 text-[#e67e22]" />
                    <span className="text-[11px] font-black">مطبخ بيتي</span>
                  </div>

                  {/* Retail Shop */}
                  <div
                    onClick={() => setMerchantType("RETAIL_SHOP")}
                    className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                      merchantType === "RETAIL_SHOP"
                        ? "bg-amber-100/70 border-[#e67e22] text-[#8c2b18] ring-2 ring-amber-300"
                        : "bg-[#fdfaf3] border-[#eddcc4] text-stone-600 hover:border-amber-400"
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5 text-[#e67e22]" />
                    <span className="text-[11px] font-black">محل تجاري</span>
                  </div>

                  {/* Restaurant */}
                  <div
                    onClick={() => setMerchantType("RESTAURANT")}
                    className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                      merchantType === "RESTAURANT"
                        ? "bg-amber-100/70 border-[#e67e22] text-[#8c2b18] ring-2 ring-amber-300"
                        : "bg-[#fdfaf3] border-[#eddcc4] text-stone-600 hover:border-amber-400"
                    }`}
                  >
                    <Utensils className="w-5 h-5 text-[#e67e22]" />
                    <span className="text-[11px] font-black">مطعم</span>
                  </div>
                </div>
              </div>

              {/* Address Input */}
              <div>
                <label className="block text-xs font-black text-[#3a2818] mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#8c2b18]" />
                  العنوان بالتفصيل
                </label>
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="مثال: المعادي - شارع النصر، عمارة 4"
                  className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white text-[#3a2818] text-xs font-bold rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none focus:ring-4 focus:ring-[#d32f2f]/15 py-2.5 px-3.5 text-right transition-all shadow-inner"
                />
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#d32f2f] to-[#b71c1c] text-white font-black text-sm shadow-lg hover:shadow-xl hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? "جاري الإنشاء..." : "إنشاء متجري والدخول للوحة التحكم 🚀"}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
