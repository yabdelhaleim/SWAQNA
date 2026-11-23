"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShoppingBag, ArrowLeft, Phone, CheckCircle2, AlertCircle,
  Loader2, ChevronLeft, Eye, EyeOff, Sparkles, Store,
  UtensilsCrossed, ShoppingCart, Home,
} from "lucide-react";
import { merchantApi } from "@/lib/api";
import MerchantShell from "@/components/layout/MerchantShell";
import MerchantOrdersView from "@/components/MerchantOrdersView";
import MerchantMenuView from "@/components/MerchantMenuView";
import MerchantReelsView from "@/components/MerchantReelsView";
import MerchantDashboardView from "@/components/MerchantDashboardView";
import MerchantWalletView from "@/components/MerchantWalletView";

type AuthStep = "PHONE" | "OTP" | "REGISTER_STORE" | "DASHBOARD";
type DashboardView = "orders" | "reels" | "menu" | "wallet" | "settings";
type MerchantType = "HOME_KITCHEN" | "RESTAURANT" | "RETAIL_SHOP";

const STORE_TYPES: { id: MerchantType; emoji: string; title: string; desc: string }[] = [
  {
    id: "HOME_KITCHEN",
    emoji: "🍲",
    title: "أكل بيتي ومطابخ منزلية",
    desc: "وجبات منزلية بمذاق أصيل ودافئ",
  },
  {
    id: "RESTAURANT",
    emoji: "🍔",
    title: "مطاعم وكافيهات",
    desc: "مطاعم احترافية وكافيهات عصرية",
  },
  {
    id: "RETAIL_SHOP",
    emoji: "🏬",
    title: "محلات وشوبينج عام",
    desc: "أزياء، تجميل، إلكترونيات، وأكثر",
  },
];

export default function MerchantPortalPage() {
  const [step, setStep] = useState<AuthStep>("PHONE");
  const [dashView, setDashView] = useState<DashboardView>("orders");

  // Auth state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [token, setToken] = useState<string | null>(null);
  const [merchantData, setMerchantData] = useState<any>(null);

  // Store registration
  const [storeName, setStoreName] = useState("");
  const [merchantType, setMerchantType] = useState<MerchantType>("HOME_KITCHEN");
  const [address, setAddress] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [showDebugCode, setShowDebugCode] = useState(true);
  const [countdown, setCountdown] = useState(120);
  const [resendCooldown, setResendCooldown] = useState(60);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // ── Session persistence ──
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("souqna_merchant_token") : null;
    if (!saved) return;
    setToken(saved);
    merchantApi.getSettings(saved)
      .then((res) => {
        if (res.success && res.data) {
          setMerchantData(res.data);
          setStep("DASHBOARD");
        } else {
          localStorage.removeItem("souqna_merchant_token");
        }
      })
      .catch(() => localStorage.removeItem("souqna_merchant_token"));
  }, []);

  // ── OTP Countdown ──
  useEffect(() => {
    if (step !== "OTP") return;
    const t = setInterval(() => {
      setCountdown(p => (p > 0 ? p - 1 : 0));
      setResendCooldown(p => (p > 0 ? p - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Send OTP ──
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const cleaned = phone.replace(/\D/g, "");
    if (!/^(010|011|012|015)\d{8}$/.test(cleaned)) {
      setError("يرجى إدخال رقم هاتف مصري صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015)");
      return;
    }
    setLoading(true);
    try {
      const res = await merchantApi.sendOtp(cleaned);
      if (res.success) {
        setPhone(cleaned);
        setCountdown(res.expires_in_seconds || 120);
        setResendCooldown(res.resend_in_seconds || 60);
        setDebugCode(res.debug_code || null);
        setOtp(["", "", "", ""]);
        setStep("OTP");
      } else {
        setError(res.message || "حدث خطأ، يرجى المحاولة مرة أخرى");
      }
    } catch {
      setError("لا يوجد اتصال بالسيرفر، يرجى التحقق من الاتصال");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handler ──
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 3) otpRefs[index + 1].current?.focus();
    // Auto-submit when all 4 filled
    if (digit && index === 3 && next.every(d => d)) {
      handleVerifyOtp(next.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      setOtp(pasted.split(""));
      otpRefs[3].current?.focus();
      handleVerifyOtp(pasted);
    }
  };

  // ── Verify OTP ──
  const handleVerifyOtp = async (code?: string) => {
    setError(null);
    const finalCode = code || otp.join("");
    if (finalCode.length < 4) {
      setError("يرجى إدخال الكود المكون من 4 أرقام");
      return;
    }
    setLoading(true);
    try {
      const res = await merchantApi.verifyOtp(phone, finalCode);
      if (res.success && res.token) {
        setToken(res.token);
        localStorage.setItem("souqna_merchant_token", res.token);
        if (res.is_new_merchant) {
          setStep("REGISTER_STORE");
        } else {
          setMerchantData(res.merchant || res.data);
          setStep("DASHBOARD");
        }
      } else {
        setError(res.message || "الكود غير صحيح، يرجى المحاولة مرة أخرى");
      }
    } catch {
      setError("حدث خطأ في التحقق، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  // ── Register Store ──
  const handleRegisterStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!storeName.trim()) { setError("يرجى إدخال اسم المتجر"); return; }
    if (!address.trim()) { setError("يرجى إدخال العنوان أو المنطقة"); return; }
    if (!token) return;
    setLoading(true);
    try {
      const res = await merchantApi.registerStore(token, {
        store_name: storeName.trim(),
        merchant_type: merchantType,
        address_text: address.trim(),
      });
      if (res.success) {
        setMerchantData(res.merchant || res.data);
        setStep("DASHBOARD");
      } else {
        setError(res.message || "فشل إنشاء المتجر، يرجى المحاولة مرة أخرى");
      }
    } catch {
      setError("حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ──
  const handleLogout = async () => {
    if (token) {
      try { await merchantApi.logout(token); } catch {}
    }
    localStorage.removeItem("souqna_merchant_token");
    setToken(null);
    setMerchantData(null);
    setPhone("");
    setOtp(["", "", "", ""]);
    setStep("PHONE");
  };

  // ================================================================
  // DASHBOARD — rendered inside MerchantShell
  // ================================================================
  if (step === "DASHBOARD" && token) {
    const storeName_ = merchantData?.store_name || merchantData?.merchant?.store_name || "متجر سوقنا";
    const storeType_ = merchantData?.merchant_type || merchantData?.merchant?.merchant_type || "HOME_KITCHEN";

    return (
      <MerchantShell
        currentView={dashView}
        onNavigate={setDashView}
        onLogout={handleLogout}
        storeName={storeName_}
        storeType={storeType_}
        token={token}
      >
        <div className="page-enter">
          {dashView === "orders" && (
            <MerchantOrdersView
              token={token}
              storeName={storeName_}
              user={merchantData}
              onNavigate={(v: any) => setDashView(v)}
              onLogout={handleLogout}
            />
          )}
          {dashView === "reels" && (
            <MerchantReelsView
              token={token}
              storeName={storeName_}
              user={merchantData}
              onNavigate={(v: any) => setDashView(v)}
              onLogout={handleLogout}
            />
          )}
          {dashView === "menu" && (
            <MerchantMenuView
              token={token}
              storeName={storeName_}
              user={merchantData}
              onNavigate={(v: any) => setDashView(v)}
              onLogout={handleLogout}
            />
          )}
          {dashView === "wallet" && (
            <MerchantWalletView
              token={token}
              storeName={storeName_}
              user={merchantData}
              onNavigate={(v: any) => setDashView(v)}
              onLogout={handleLogout}
            />
          )}
          {dashView === "settings" && (
            <MerchantDashboardView
              token={token}
              initialMerchant={merchantData}
              user={merchantData}
              onNavigate={(v: any) => setDashView(v)}
              onLogout={handleLogout}
            />
          )}
        </div>
      </MerchantShell>
    );
  }

  // ================================================================
  // AUTH SCREENS — shared background layout
  // ================================================================
  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #07100F 0%, #0D1E1C 50%, #0A1917 100%)" }}
      dir="rtl"
    >
      {/* Background decorative circles */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-souqna-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-souqna-emerald/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* ── Logo Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-souqna-gold/10 border border-souqna-gold/20 mb-4"
            style={{ boxShadow: "0 0 32px rgba(245,158,11,0.15)" }}>
            <ShoppingBag className="w-8 h-8 text-souqna-gold" />
          </div>
          <h1 className="text-souqna-gold font-black text-3xl leading-none mb-1" style={{ fontFamily: "'Cairo', sans-serif" }}>
            سـوقـنا
          </h1>
          <p className="text-souqna-text-muted text-sm font-medium">لقطة في كل حاجة ..</p>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-souqna-gold/8 border border-souqna-gold/15 rounded-full px-3 py-1">
            <Sparkles className="w-3 h-3 text-souqna-gold" />
            <span className="text-souqna-gold text-xs font-semibold">بوابة الشركاء والتجار</span>
          </div>
        </div>

        {/* ── STEP: PHONE ── */}
        {step === "PHONE" && (
          <div className="card-glass p-6 animate-fade-up">
            <h2 className="text-souqna-text-primary font-bold text-lg mb-1">ابدأ رحلتك كتاجر 🚀</h2>
            <p className="text-souqna-text-secondary text-sm mb-6">
              أدخل رقم موبايلك وهنبعتلك كود تحقق فوري
            </p>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-souqna-text-secondary text-xs font-semibold mb-2 block">
                  رقم الموبايل المصري 🇪🇬
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="01XXXXXXXXX"
                    className="input-dark text-left ltr text-lg tracking-widest font-bold"
                    style={{ direction: "ltr", letterSpacing: "0.1em" }}
                    autoFocus
                    disabled={loading}
                  />
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-souqna-text-muted" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-souqna-red/10 border border-souqna-red/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-souqna-red flex-shrink-0 mt-0.5" />
                  <p className="text-souqna-red text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || phone.length < 11}
                className="btn-gold w-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
                ) : (
                  <><span>إرسال كود التحقق</span><ChevronLeft className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-souqna-surface border border-souqna-border rounded-xl">
              <p className="text-souqna-text-muted text-xs text-center leading-relaxed">
                بتسجيل دخولك، أنت موافق على شروط الاستخدام وسياسة الخصوصية لمنصة سوقنا.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP: OTP ── */}
        {step === "OTP" && (
          <div className="card-glass p-6 animate-fade-up">
            <button
              onClick={() => { setStep("PHONE"); setError(null); setOtp(["","","",""]); }}
              className="flex items-center gap-1 text-souqna-text-muted hover:text-souqna-text-secondary text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              <span>تغيير الرقم</span>
            </button>

            <h2 className="text-souqna-text-primary font-bold text-lg mb-1">أدخل كود التحقق 🔐</h2>
            <p className="text-souqna-text-secondary text-sm mb-2">
              بعتنالك كود على رقم <span className="text-souqna-gold font-bold" style={{ direction: "ltr", display: "inline-block" }}>{phone}</span>
            </p>
            <p className="text-souqna-text-muted text-xs mb-6">
              الكود صالح لمدة {formatTime(countdown)}
            </p>

            {/* OTP Boxes */}
            <div className="flex gap-3 justify-center mb-6" dir="ltr">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="tel"
                  inputMode="numeric"
                  value={digit}
                  maxLength={1}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  disabled={loading}
                  className={`w-14 h-16 text-center text-2xl font-black rounded-xl border-2 transition-all duration-200 bg-souqna-surface outline-none
                    ${digit
                      ? "border-souqna-gold text-souqna-gold bg-souqna-gold/5"
                      : "border-souqna-border text-souqna-text-primary focus:border-souqna-gold/60 focus:bg-souqna-gold/5"
                    }`}
                />
              ))}
            </div>

            {/* Debug Code Hint */}
            {debugCode && (
              <div className="mb-4 p-3 rounded-xl border-2 flex items-center justify-between"
                style={{ background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.4)" }}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-souqna-gold text-xs font-bold">🔑 كود التجربة (DEV)</span>
                  <span className="text-souqna-text-muted text-xs">اضغط عليه للنسخ</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { navigator.clipboard?.writeText(debugCode); }}
                    className={`font-black tracking-widest text-xl px-3 py-1 rounded-lg transition-all ${showDebugCode ? "text-souqna-gold bg-souqna-gold/10" : "text-souqna-gold blur-sm"}`}
                    title="اضغط للنسخ"
                  >
                    {debugCode}
                  </button>
                  <button onClick={() => setShowDebugCode(p => !p)} className="p-1 rounded-lg hover:bg-souqna-gold/10 transition-colors">
                    {showDebugCode
                      ? <EyeOff className="w-4 h-4 text-souqna-text-muted" />
                      : <Eye className="w-4 h-4 text-souqna-text-muted" />
                    }
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-souqna-red/10 border border-souqna-red/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-souqna-red flex-shrink-0 mt-0.5" />
                <p className="text-souqna-red text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={() => handleVerifyOtp()}
              disabled={loading || otp.some(d => !d)}
              className="btn-gold w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-3 disabled:opacity-40"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> جاري التحقق...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> تأكيد الكود والدخول</>
              )}
            </button>

            <button
              onClick={handleSendOtp}
              disabled={resendCooldown > 0 || loading}
              className="w-full py-2 text-xs font-semibold text-souqna-text-muted hover:text-souqna-gold disabled:opacity-40 transition-colors"
            >
              {resendCooldown > 0 ? `إعادة إرسال الكود بعد ${formatTime(resendCooldown)}` : "إعادة إرسال الكود"}
            </button>
          </div>
        )}

        {/* ── STEP: REGISTER STORE ── */}
        {step === "REGISTER_STORE" && (
          <div className="card-glass p-6 animate-fade-up">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-souqna-emerald/15 flex items-center justify-center">
                <Store className="w-4 h-4 text-souqna-emerald" />
              </div>
              <div>
                <h2 className="text-souqna-text-primary font-bold text-base leading-tight">أنشئ متجرك على سوقنا ✨</h2>
                <p className="text-souqna-text-muted text-xs">خطوتين بس وهتبدأ تبيع!</p>
              </div>
            </div>

            <form onSubmit={handleRegisterStore} className="space-y-5">
              {/* Store type cards */}
              <div>
                <label className="text-souqna-text-secondary text-xs font-semibold mb-3 block">نوع المتجر</label>
                <div className="space-y-2">
                  {STORE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setMerchantType(type.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-right ${
                        merchantType === type.id
                          ? "border-souqna-gold bg-souqna-gold/8"
                          : "border-souqna-border hover:border-souqna-border/80 bg-souqna-surface"
                      }`}
                    >
                      <span className="text-2xl">{type.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm ${merchantType === type.id ? "text-souqna-gold" : "text-souqna-text-primary"}`}>
                          {type.title}
                        </div>
                        <div className="text-souqna-text-muted text-xs">{type.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        merchantType === type.id ? "border-souqna-gold bg-souqna-gold" : "border-souqna-border"
                      }`}>
                        {merchantType === type.id && <div className="w-2 h-2 bg-black rounded-full" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Store name */}
              <div>
                <label className="text-souqna-text-secondary text-xs font-semibold mb-2 block">اسم المتجر</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  placeholder="مثال: مطبخ أم أحمد، كافيه الربيع، محل الأناقة"
                  className="input-dark text-sm"
                  disabled={loading}
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-souqna-text-secondary text-xs font-semibold mb-2 block">المنطقة أو العنوان</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="مثال: المعادي، شارع النصر، عمارة 4"
                  className="input-dark text-sm"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-souqna-red/10 border border-souqna-red/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-souqna-red flex-shrink-0 mt-0.5" />
                  <p className="text-souqna-red text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> جاري إنشاء المتجر...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> إنشاء المتجر والدخول للوحة التحكم</>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Wallet Placeholder (Phase 4) ──
function WalletPlaceholder({ storeName }: { storeName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="w-20 h-20 rounded-2xl bg-souqna-gold/10 border border-souqna-gold/20 flex items-center justify-center">
        <span className="text-4xl">💰</span>
      </div>
      <div>
        <h3 className="text-souqna-text-primary font-bold text-lg mb-1">المحفظة والأرباح</h3>
        <p className="text-souqna-text-muted text-sm max-w-xs">
          صفحة المحفظة والأرباح قادمة قريباً في المرحلة الرابعة، ستجد فيها رصيدك ومبيعاتك وتفاصيل العمولات.
        </p>
      </div>
      <div className="bg-souqna-card border border-souqna-border rounded-xl px-6 py-3">
        <p className="text-souqna-gold text-sm font-semibold">المرحلة 4 — قيد التطوير</p>
      </div>
    </div>
  );
}
