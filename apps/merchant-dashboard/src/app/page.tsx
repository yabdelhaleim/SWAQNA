"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { 
  Send, 
  Smartphone, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Store, 
  MapPin, 
  UtensilsCrossed, 
  ShoppingBag, 
  Soup, 
  Check, 
  Sparkles,
  Edit2,
  CheckCircle2
} from "lucide-react";
import { merchantApi } from "@/lib/api";

type Step = "PHONE" | "OTP" | "REGISTER_STORE" | "DASHBOARD";
type MerchantType = "RESTAURANT" | "RETAIL_SHOP" | "HOME_KITCHEN";

export default function MerchantAuthPage() {
  const [step, setStep] = useState<Step>("PHONE");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [token, setToken] = useState<string | null>(null);
  const [merchantData, setMerchantData] = useState<any>(null);

  // New Store Form State
  const [storeName, setStoreName] = useState("");
  const [merchantType, setMerchantType] = useState<MerchantType>("RESTAURANT");
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

    // التحقق من الهاتف
    const cleaned = phoneNumber.replace(/[^0-9]/g, "");
    if (!/^(010|011|012|015)[0-9]{8}$/.test(cleaned)) {
      setErrorMessage("يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015 ومكون من 11 رقماً.");
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
    } catch (err: any) {
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

    // الانتقال للخانة التالية تلقائياً
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // إذا اكتملت الأرقام الـ 4، يتم التحقق فوراً
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
  const handleRegisterStore = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden select-none bg-[#fdf8ee]">
      
      {/* 🖼️ خلفية الحضارة المصرية والنيل والأهرامات المطابقة تماماً */}
      <div className="absolute inset-0 z-0">
        <Image
          src={
            step === "PHONE"
              ? "/images/bg-phone.jpg"
              : step === "OTP"
              ? "/images/bg-otp.jpg"
              : "/images/bg-register.jpg"
          }
          alt="حضارة حواديت المصرية"
          fill
          priority
          className="object-cover object-center filter brightness-[1.02]"
        />
        {/* طبقة تظليل خفيفة جداً لتعزيز قراءة البطاقة المركزية */}
        <div className="absolute inset-0 bg-amber-950/10 pointer-events-none" />
      </div>

      {/* 🌟 كود التيست التوضيحي في بيئة التطوير السريع */}
      {debugCode && step === "OTP" && (
        <div className="fixed top-4 left-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-mono shadow-lg flex items-center gap-2 animate-bounce">
          <span>كود التحقق السريع للتجربة:</span>
          <span className="font-bold text-base bg-emerald-800 px-2 py-0.5 rounded">{debugCode}</span>
        </div>
      )}

      {/* =========================================================================
          الشاشة الأولى: إدخال رقم الهاتف (Step 1: Phone Input)
         ========================================================================= */}
      {step === "PHONE" && (
        <div className="relative z-10 w-full max-w-[540px] pt-[140px] transition-all duration-300">
          <div className="bg-[#fffdf7]/95 backdrop-blur-sm border-2 border-[#eedec0] rounded-[38px] p-8 md:p-10 shadow-[0_20px_50px_rgba(110,60,20,0.2)] text-center">
            
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#3a2818] mb-2 tracking-tight">
              مرحباً بك في لوحة تحكم التاجر
            </h1>
            <p className="text-sm md:text-base text-[#7c634c] mb-7 font-medium">
              سجّل دخولك لمتابعة مبيعاتك واستقبال الطلبات
            </p>

            {errorMessage && (
              <div className="mb-5 p-3 rounded-2xl bg-red-100/90 border border-red-300 text-red-700 text-xs font-semibold text-right">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="text-right">
                <label className="text-xs font-bold text-[#5c432d] flex items-center gap-1.5 mb-2 mr-1">
                  <Smartphone className="w-4 h-4 text-[#d32f2f]" />
                  <span>رقم الهاتف:</span>
                </label>

                {/* حقل الهاتف مع علم مصر و +20 */}
                <div className="flex items-center bg-[#fdf9f0] border-2 border-[#e6d5b8] rounded-2xl p-1.5 focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/20 transition-all shadow-inner">
                  
                  {/* بادج كود الدولة */}
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-[#e8dac0] shadow-sm text-sm font-bold text-[#4a3520]">
                    <span className="text-lg">🇪🇬</span>
                    <span>+20</span>
                    <span className="text-xs text-gray-400">▾</span>
                  </div>

                  {/* خانة رقم الهاتف */}
                  <input
                    type="tel"
                    dir="ltr"
                    maxLength={11}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="flex-1 bg-transparent px-4 py-2.5 text-base md:text-lg font-semibold text-[#3a2818] placeholder-[#b8a48e] focus:outline-none text-left tracking-wider"
                    autoFocus
                  />
                </div>
              </div>

              {/* الزر الأحمر الدائري */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d32f2f] to-[#b71c1c] text-white font-bold text-lg shadow-[0_8px_20px_rgba(211,47,47,0.35)] hover:shadow-[0_10px_25px_rgba(211,47,47,0.45)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                <Send className="w-5 h-5 -rotate-45" />
                <span>{loading ? "جاري الإرسال..." : "إرسال كود التحقق"}</span>
              </button>
            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          الشاشة الثانية: تأكيد كود الـ OTP (Step 2: Verify OTP)
         ========================================================================= */}
      {step === "OTP" && (
        <div className="relative z-10 w-full max-w-[540px] pt-[140px] transition-all duration-300">
          <div className="bg-[#fffdf7]/95 backdrop-blur-sm border-2 border-[#eedec0] rounded-[38px] p-8 md:p-10 shadow-[0_20px_50px_rgba(110,60,20,0.2)] text-center">
            
            {/* درع الأمان الأحمر */}
            <div className="flex justify-center mb-3">
              <div className="relative p-3 rounded-2xl bg-red-100/80 border border-red-200">
                <ShieldCheck className="w-9 h-9 text-[#d32f2f]" />
                <span className="absolute -top-1 -right-1 text-xs text-amber-500 font-bold">✨</span>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-[#3a2818] mb-2">
              تأكيد رقم الهاتف
            </h1>

            {/* تفاصيل الرقم المرسل إليه وزر التعديل */}
            <div className="flex items-center justify-center gap-2 text-sm text-[#7c634c] mb-7 font-medium">
              <span>تم إرسال الكود إلى</span>
              <span className="font-bold text-[#b71c1c] tracking-wider" dir="ltr">{phoneNumber}</span>
              <button
                type="button"
                onClick={() => { setStep("PHONE"); setOtpCode(["", "", "", ""]); }}
                className="text-xs text-[#9c5f2b] hover:text-[#d32f2f] flex items-center gap-1 font-semibold underline underline-offset-4 mr-1"
              >
                <Edit2 className="w-3 h-3" />
                تعديل الرقم
              </button>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3 rounded-2xl bg-red-100/90 border border-red-300 text-red-700 text-xs font-semibold">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* مربعات الإدخال الأربعة الكبيرة */}
            <div className="flex justify-center gap-3.5 mb-7" dir="ltr">
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
                  className="w-14 h-16 md:w-16 md:h-18 text-2xl md:text-3xl font-black text-center text-[#3a2818] bg-[#fdf9f0] border-2 border-[#e6d5b8] rounded-2xl focus:border-[#d32f2f] focus:bg-white focus:ring-4 focus:ring-[#d32f2f]/15 focus:outline-none transition-all shadow-inner"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {/* عداد وقت انتهاء الكود (150 ثانية) */}
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#5c432d] mb-6">
              <Clock className="w-4 h-4 text-[#d32f2f]" />
              <span>ينتهي الكود خلال:</span>
              <span className="text-[#d32f2f] font-mono text-base">{formatTime(countdown)}</span>
              <span>دقيقة</span>
            </div>

            {/* زر إعادة الإرسال المحمي بـ 60 ثانية */}
            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={() => handleSendOtp()}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                resendCooldown > 0
                  ? "bg-[#e5dcd0] text-[#8c7d6c] cursor-not-allowed"
                  : "bg-white border-2 border-[#d32f2f] text-[#d32f2f] hover:bg-red-50 active:scale-[0.99] shadow-sm"
              }`}
            >
              <Send className="w-4 h-4 -rotate-45" />
              <span>
                {resendCooldown > 0
                  ? `إعادة إرسال الكود خلال ${resendCooldown} ثانية`
                  : "إعادة إرسال كود جديد الآن"}
              </span>
            </button>

          </div>
        </div>
      )}

      {/* =========================================================================
          الشاشة الثالثة: استكمال بيانات المتجر (Step 3: Register Store)
         ========================================================================= */}
      {step === "REGISTER_STORE" && (
        <div className="relative z-10 w-full max-w-[580px] pt-[120px] transition-all duration-300">
          <div className="bg-[#fffdf7]/95 backdrop-blur-sm border-2 border-[#eedec0] rounded-[38px] p-7 md:p-9 shadow-[0_20px_50px_rgba(110,60,20,0.2)] text-right">
            
            {/* الشريط العلوي مع زر العودة والشعار */}
            <div className="flex items-center justify-between mb-4 border-b border-[#f0e2cb] pb-3">
              <span className="text-xs font-bold text-[#8c6742] tracking-wide">
                حواديت .. لكل أكلة حكاية
              </span>
              <button
                type="button"
                onClick={() => setStep("PHONE")}
                className="px-3 py-1.5 rounded-xl bg-[#fdf5e6] hover:bg-[#faebd0] text-[#7a5732] text-xs font-bold flex items-center gap-1.5 border border-[#e6d5b8] transition-all"
              >
                <span>عودة</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* بادج خطوة واحدة متبقية */}
            <div className="flex justify-center mb-3">
              <span className="px-4 py-1 rounded-full bg-[#d32f2f] text-white text-xs font-extrabold shadow-sm">
                خطوة واحدة متبقية!
              </span>
            </div>

            <h1 className="text-2xl font-extrabold text-[#3a2818] text-center mb-6">
              أدخل بيانات نشاطك التجاري
            </h1>

            {errorMessage && (
              <div className="mb-5 p-3 rounded-2xl bg-red-100/90 border border-red-300 text-red-700 text-xs font-semibold text-right">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleRegisterStore} className="space-y-5">
              
              {/* 1. اسم المتجر */}
              <div>
                <label className="text-xs font-bold text-[#5c432d] flex items-center gap-1.5 mb-2 mr-1">
                  <Store className="w-4 h-4 text-[#d32f2f]" />
                  <span>اسم المتجر:</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="مثال: كشري البرنس / بوتيك النور / مطبخ أم يوسف"
                  className="w-full bg-[#fdf9f0] border-2 border-[#e6d5b8] rounded-2xl px-4 py-3 text-sm font-semibold text-[#3a2818] placeholder-[#b8a48e] focus:border-[#d32f2f] focus:bg-white focus:outline-none transition-all"
                  required
                />
              </div>

              {/* 2. كروت اختيار نوع النشاط الثلاثة */}
              <div>
                <label className="text-xs font-bold text-[#5c432d] flex items-center gap-1.5 mb-2 mr-1">
                  <Sparkles className="w-4 h-4 text-[#d32f2f]" />
                  <span>اختر نوع النشاط:</span>
                </label>

                <div className="grid grid-cols-3 gap-2.5">
                  
                  {/* مطبخ بيتي */}
                  <div
                    onClick={() => setMerchantType("HOME_KITCHEN")}
                    className={`cursor-pointer rounded-2xl p-3 text-center border-2 transition-all flex flex-col items-center justify-center relative ${
                      merchantType === "HOME_KITCHEN"
                        ? "border-[#e69500] bg-[#fff8e7] shadow-md scale-[1.02]"
                        : "border-[#e6d5b8] bg-[#fdf9f0] hover:bg-white"
                    }`}
                  >
                    {merchantType === "HOME_KITCHEN" && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#e69500] text-white rounded-full flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    <Soup className="w-8 h-8 text-[#d32f2f] mb-1.5" />
                    <span className="text-xs font-extrabold text-[#3a2818]">مطبخ بيتي</span>
                  </div>

                  {/* محل تجاري */}
                  <div
                    onClick={() => setMerchantType("RETAIL_SHOP")}
                    className={`cursor-pointer rounded-2xl p-3 text-center border-2 transition-all flex flex-col items-center justify-center relative ${
                      merchantType === "RETAIL_SHOP"
                        ? "border-[#e69500] bg-[#fff8e7] shadow-md scale-[1.02]"
                        : "border-[#e6d5b8] bg-[#fdf9f0] hover:bg-white"
                    }`}
                  >
                    {merchantType === "RETAIL_SHOP" && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#e69500] text-white rounded-full flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    <ShoppingBag className="w-8 h-8 text-[#2563eb] mb-1.5" />
                    <span className="text-xs font-extrabold text-[#3a2818]">محل تجاري</span>
                  </div>

                  {/* مطعم */}
                  <div
                    onClick={() => setMerchantType("RESTAURANT")}
                    className={`cursor-pointer rounded-2xl p-3 text-center border-2 transition-all flex flex-col items-center justify-center relative ${
                      merchantType === "RESTAURANT"
                        ? "border-[#e69500] bg-[#fff8e7] shadow-md scale-[1.02]"
                        : "border-[#e6d5b8] bg-[#fdf9f0] hover:bg-white"
                    }`}
                  >
                    {merchantType === "RESTAURANT" && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#e69500] text-white rounded-full flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    <UtensilsCrossed className="w-8 h-8 text-[#e69500] mb-1.5" />
                    <span className="text-xs font-extrabold text-[#3a2818]">مطعم</span>
                  </div>

                </div>
              </div>

              {/* 3. العنوان والمنطقة */}
              <div>
                <label className="text-xs font-bold text-[#5c432d] flex items-center gap-1.5 mb-2 mr-1">
                  <MapPin className="w-4 h-4 text-[#d32f2f]" />
                  <span>العنوان أو المنطقة:</span>
                </label>
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="مثال: المعادي، شارع النصر، عمارة 4"
                  className="w-full bg-[#fdf9f0] border-2 border-[#e6d5b8] rounded-2xl px-4 py-3 text-sm font-semibold text-[#3a2818] placeholder-[#b8a48e] focus:border-[#d32f2f] focus:bg-white focus:outline-none transition-all"
                  required
                />
              </div>

              {/* زر الإنشاء النهائي */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d32f2f] to-[#b71c1c] text-white font-bold text-base md:text-lg shadow-[0_8px_20px_rgba(211,47,47,0.35)] hover:shadow-[0_10px_25px_rgba(211,47,47,0.45)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 pt-3 disabled:opacity-60"
              >
                <span>🚀 إنشاء متجري والدخول للوحة التحكم ➕</span>
              </button>

            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          شاشة النجاح والدخول للوحة التحكم (Step 4: Success & Dashboard Bridge)
         ========================================================================= */}
      {step === "DASHBOARD" && (
        <div className="relative z-10 w-full max-w-[540px] pt-[140px] transition-all duration-300">
          <div className="bg-[#fffdf7]/95 backdrop-blur-sm border-2 border-[#eedec0] rounded-[38px] p-8 md:p-10 shadow-[0_20px_50px_rgba(110,60,20,0.2)] text-center space-y-5">
            
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-300">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-[#3a2818]">
              أهلاً بك يا بطل! تم الدخول بنجاح 🎉
            </h2>

            <div className="p-4 rounded-2xl bg-[#fbf5e8] border border-[#e8dac0] text-right space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#7c634c]">اسم المتجر:</span>
                <span className="font-bold text-[#3a2818]">{merchantData?.name || "متجرك في حواديت"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7c634c]">نوع النشاط:</span>
                <span className="font-bold text-[#d32f2f]">
                  {merchantData?.merchant_type === "RESTAURANT" ? "مطعم 🍔" :
                   merchantData?.merchant_type === "RETAIL_SHOP" ? "محل تجاري 🛍️" : "مطبخ بيتي 🍲"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7c634c]">حالة النشاط:</span>
                <span className="font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg text-xs">
                  {merchantData?.status || "في انتظار اعتماد الإدارة"}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#7c634c]">
              تم تسجيل التوكن بنجاح في متصفحك. نحن الآن جاهزون للمرحلة التالية: إعدادات المتجر ومنيو المنتجات!
            </p>

            <button
              onClick={() => alert("سيتم فتح شاشة إدارة المنتجات في المرحلة 2!")}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold text-base shadow-md hover:brightness-105 transition-all"
            >
              الانتقال لإعدادات المتجر والمنيو ⬅️
            </button>

          </div>
        </div>
      )}

    </main>
  );
}
