"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Send, ArrowRight, Check, CheckCircle2 } from "lucide-react";
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
    <main className="min-h-screen w-full flex items-center justify-center p-2 md:p-6 bg-[#ecd5b5] select-none">
      
      {/* 🌟 كود التيست التوضيحي السريع في بيئة التطوير */}
      {debugCode && step === "OTP" && (
        <div className="fixed top-3 left-3 z-50 bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 border border-emerald-400 animate-bounce">
          <span>كود التجربة السريع:</span>
          <span className="font-bold text-base bg-emerald-950 px-2 py-0.5 rounded">{debugCode}</span>
        </div>
      )}

      {/* 🖼️ الحاوية المتجاوبة بدقة أبعاد التصميم الأصلي 1024x682 (بدون أي تكرار أو Duplicate) */}
      <div className="relative w-full max-w-[1024px] aspect-[1024/682] shadow-[0_25px_60px_rgba(80,40,10,0.35)] rounded-[26px] overflow-hidden border border-[#d8be99] bg-[#f8efe0]">
        
        {/* الصورة الأصلية التي تمثل الشاشة كاملة */}
        <Image
          src={
            step === "PHONE"
              ? "/images/bg-phone.jpg"
              : step === "OTP"
              ? "/images/bg-otp.jpg"
              : step === "REGISTER_STORE"
              ? "/images/bg-register.jpg"
              : "/images/bg-phone.jpg"
          }
          alt="حواديت - لوحة تحكم التاجر"
          fill
          priority
          className="object-cover object-center pointer-events-none"
        />

        {/* تنبيه الأخطاء إن وُجد */}
        {errorMessage && (
          <div className="absolute top-[34%] left-1/2 -translate-x-1/2 z-40 w-[48%] bg-red-600/95 text-white text-xs md:text-sm font-bold py-2 px-4 rounded-xl shadow-lg text-center animate-fade-in border border-red-300">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* =====================================================================
            الشاشة الأولى: إدخال الهاتف (Interactive Overlays Only - Zero Duplicate)
           ===================================================================== */}
        {step === "PHONE" && (
          <form onSubmit={handleSendOtp}>
            {/* 1. حقل كتابة رقم الهاتف (يغطي بالضبط خانة 010xxxxxxxx في الصورة) */}
            <div 
              className="absolute z-20 flex items-center"
              style={{
                top: "57.8%",
                left: "26.3%",
                width: "47.2%",
                height: "9.0%",
              }}
            >
              {/* إخفاء علم +20 إذا أراد المستخدم، أو استخدام الحقل مباشرة */}
              <input
                type="tel"
                dir="ltr"
                maxLength={11}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full h-full bg-[#fcf6ea]/95 hover:bg-white focus:bg-white text-[#3a2818] text-base md:text-xl font-bold rounded-2xl border-2 border-[#e3d0b1] focus:border-[#d32f2f] focus:outline-none focus:ring-4 focus:ring-[#d32f2f]/20 px-5 text-left tracking-wider transition-all shadow-inner"
                autoFocus
              />
            </div>

            {/* 2. زر إرسال كود التحقق (فوق الزر الأحمر بالمليمتر) */}
            <button
              type="submit"
              disabled={loading}
              className="absolute z-20 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                top: "69.8%",
                left: "26.3%",
                width: "47.2%",
                height: "9.2%",
                background: "linear-gradient(to right, #cf2828, #af1a1a)",
                boxShadow: "0 6px 16px rgba(180, 25, 25, 0.4)",
              }}
            >
              <Send className="w-5 h-5 text-white -rotate-45" />
              <span className="text-white font-extrabold text-base md:text-lg">
                {loading ? "جاري الإرسال..." : "إرسال كود التحقق"}
              </span>
            </button>
          </form>
        )}

        {/* =====================================================================
            الشاشة الثانية: كود الـ OTP (Overlays on 4-boxes & Timers)
           ===================================================================== */}
        {step === "OTP" && (
          <div>
            {/* زر تعديل الرقم في الصورة */}
            <button
              type="button"
              onClick={() => { setStep("PHONE"); setOtpCode(["", "", "", ""]); }}
              className="absolute z-20 cursor-pointer rounded-lg hover:bg-amber-100/40 transition-colors"
              style={{
                top: "49.0%",
                left: "27.0%",
                width: "13.5%",
                height: "4.8%",
              }}
              title="تعديل الرقم"
            />

            {/* عرض رقم الهاتف الفعلي فوق الرقم المطبوع في الصورة */}
            <div 
              className="absolute z-10 flex items-center justify-start text-[#b71c1c] font-black text-sm md:text-base pointer-events-none"
              style={{
                top: "49.0%",
                left: "42.0%",
                width: "16.0%",
                height: "4.8%",
              }}
              dir="ltr"
            >
              {phoneNumber}
            </div>

            {/* مربعات الإدخال الأربعة (تغطي المربعات 1 2 9 4 في الصورة) */}
            <div 
              className="absolute z-20 flex justify-between items-center"
              style={{
                top: "56.5%",
                left: "28.5%",
                width: "43.0%",
                height: "11.2%",
              }}
              dir="ltr"
            >
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
                  className="w-[21.5%] h-full text-2xl md:text-3xl font-black text-center text-[#3a2818] bg-[#fbf5e7] border-2 border-[#e0cca9] rounded-2xl focus:border-[#d32f2f] focus:bg-white focus:ring-4 focus:ring-[#d32f2f]/20 focus:outline-none transition-all shadow-inner"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {/* عداد وقت انتهاء الكود (يغطي نص الوقت في الصورة بالوقت الحقيقي) */}
            <div 
              className="absolute z-20 flex items-center justify-center font-bold text-xs md:text-sm text-[#4a3420] pointer-events-none bg-[#fffaf0] rounded-lg px-2"
              style={{
                top: "76.4%",
                left: "35.0%",
                width: "30.0%",
                height: "4.0%",
              }}
            >
              <span>ينتهي الكود خلال:&nbsp;</span>
              <span className="text-[#d32f2f] font-mono font-black text-sm md:text-base">{formatTime(countdown)}</span>
              <span>&nbsp;دقيقة</span>
            </div>

            {/* زر إعادة الإرسال (فوق الزر الرمادي في الصورة) */}
            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={() => handleSendOtp()}
              className={`absolute z-20 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs md:text-sm transition-all cursor-pointer ${
                resendCooldown > 0
                  ? "bg-[#9a918a] text-white/90 cursor-not-allowed shadow-inner"
                  : "bg-[#d32f2f] text-white hover:brightness-110 shadow-lg active:scale-[0.98]"
              }`}
              style={{
                top: "80.4%",
                left: "30.5%",
                width: "39.0%",
                height: "8.6%",
              }}
            >
              <Send className="w-4 h-4 text-white -rotate-45" />
              <span>
                {resendCooldown > 0
                  ? `إعادة إرسال الكود خلال ${resendCooldown} ثانية`
                  : "إعادة إرسال كود جديد الآن"}
              </span>
            </button>
          </div>
        )}

        {/* =====================================================================
            الشاشة الثالثة: بيانات المتجر (Interactive Overlays on Store Form)
           ===================================================================== */}
        {step === "REGISTER_STORE" && (
          <div>
            {/* زر العودة في أعلى اليسار */}
            <button
              type="button"
              onClick={() => setStep("PHONE")}
              className="absolute z-20 cursor-pointer rounded-2xl hover:bg-amber-100/50 transition-colors"
              style={{
                top: "4.7%",
                left: "4.6%",
                width: "11.0%",
                height: "6.5%",
              }}
              title="عودة للشاشة السابقة"
            />

            {/* 1. حقل اسم المتجر (يغطي خانة اسم المتجر في الصورة) */}
            <div
              className="absolute z-20"
              style={{
                top: "41.9%",
                left: "24.8%",
                width: "50.4%",
                height: "7.4%",
              }}
            >
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="مثال: حلويات أم يوسف / كشري البرنس"
                className="w-full h-full bg-[#fdf9f0]/95 hover:bg-white focus:bg-white px-5 text-sm md:text-base font-bold text-[#3a2818] rounded-2xl border-2 border-[#e3d0b1] focus:border-[#d32f2f] focus:outline-none focus:ring-4 focus:ring-[#d32f2f]/15 transition-all text-right shadow-inner"
                autoFocus
              />
            </div>

            {/* 2. كروت اختيار نوع النشاط الثلاثة (مطبخ بيتي / محل تجاري / مطعم) */}
            {/* مطبخ بيتي */}
            <div
              onClick={() => setMerchantType("HOME_KITCHEN")}
              className={`absolute z-20 cursor-pointer rounded-2xl transition-all ${
                merchantType === "HOME_KITCHEN"
                  ? "border-[3px] border-[#e69500] bg-amber-500/10 shadow-md ring-2 ring-amber-400/40"
                  : "hover:bg-amber-500/5"
              }`}
              style={{
                top: "52.4%",
                left: "25.9%",
                width: "15.0%",
                height: "14.4%",
              }}
            >
              {merchantType === "HOME_KITCHEN" && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#e69500] text-white rounded-full flex items-center justify-center text-xs shadow">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </div>

            {/* محل تجاري */}
            <div
              onClick={() => setMerchantType("RETAIL_SHOP")}
              className={`absolute z-20 cursor-pointer rounded-2xl transition-all ${
                merchantType === "RETAIL_SHOP"
                  ? "border-[3px] border-[#e69500] bg-amber-500/10 shadow-md ring-2 ring-amber-400/40"
                  : "hover:bg-amber-500/5"
              }`}
              style={{
                top: "52.4%",
                left: "42.5%",
                width: "15.0%",
                height: "14.4%",
              }}
            >
              {merchantType === "RETAIL_SHOP" && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#e69500] text-white rounded-full flex items-center justify-center text-xs shadow">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </div>

            {/* مطعم */}
            <div
              onClick={() => setMerchantType("RESTAURANT")}
              className={`absolute z-20 cursor-pointer rounded-2xl transition-all ${
                merchantType === "RESTAURANT"
                  ? "border-[3px] border-[#e69500] bg-amber-500/10 shadow-md ring-2 ring-amber-400/40"
                  : "hover:bg-amber-500/5"
              }`}
              style={{
                top: "52.4%",
                left: "59.1%",
                width: "15.0%",
                height: "14.4%",
              }}
            >
              {merchantType === "RESTAURANT" && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#e69500] text-white rounded-full flex items-center justify-center text-xs shadow">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </div>

            {/* 3. حقل العنوان أو المنطقة */}
            <div
              className="absolute z-20"
              style={{
                top: "72.4%",
                left: "24.8%",
                width: "50.4%",
                height: "7.4%",
              }}
            >
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="مثال: المعادي، شارع النصر، عمارة 4"
                className="w-full h-full bg-[#fdf9f0]/95 hover:bg-white focus:bg-white px-5 text-sm md:text-base font-bold text-[#3a2818] rounded-2xl border-2 border-[#e3d0b1] focus:border-[#d32f2f] focus:outline-none focus:ring-4 focus:ring-[#d32f2f]/15 transition-all text-right shadow-inner"
              />
            </div>

            {/* 4. زر إنشاء المتجر النهائي */}
            <button
              type="button"
              disabled={loading}
              onClick={handleRegisterStore}
              className="absolute z-20 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                top: "81.2%",
                left: "28.7%",
                width: "42.6%",
                height: "8.0%",
                background: "linear-gradient(to right, #d32f2f, #b71c1c)",
                boxShadow: "0 6px 16px rgba(180, 25, 25, 0.4)",
              }}
            >
              <span className="text-white font-extrabold text-sm md:text-base flex items-center gap-1.5">
                <span>🚀</span>
                <span>{loading ? "جاري الإنشاء..." : "إنشاء متجري والدخول للوحة التحكم ➕"}</span>
              </span>
            </button>
          </div>
        )}

        {/* =====================================================================
            شاشة النجاح والترحيب بالتاجر (Step 4: Success & Welcome Dashboard)
           ===================================================================== */}
        {step === "DASHBOARD" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-[#fffdf7] border-2 border-[#eedec0] rounded-[34px] p-8 max-w-[480px] w-full text-center shadow-2xl space-y-4 animate-scale-up">
              
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-300 mx-auto">
                <CheckCircle2 className="w-10 h-10" />
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
                  <span className="text-[#7c634c]">حالة الاعتماد:</span>
                  <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg text-xs">
                    {merchantData?.status || "في انتظار اعتماد الإدارة"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#7c634c]">
                تم حفظ التوكن بنجاح. نحن الآن جاهزون للمرحلة الثانية: إعدادات المتجر وإدارة المنتجات والمنيو!
              </p>

              <button
                onClick={() => alert("سيتم بناء صفحة إدارة المنتجات والمنيو في المرحلة القادمة!")}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold text-sm shadow-md hover:brightness-105 transition-all"
              >
                الانتقال لإعدادات المتجر والمنيو ⬅️
              </button>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
