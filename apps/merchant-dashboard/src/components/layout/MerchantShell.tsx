"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShoppingBag, Bell, BellOff, Menu, X,
  ClipboardList, Film, UtensilsCrossed, Wallet,
  Settings, LogOut, ChevronDown, TrendingUp,
  Circle, Zap,
} from "lucide-react";
import { soundService } from "@/lib/audioNotification";

type DashboardView = "orders" | "reels" | "menu" | "wallet" | "settings";

interface MerchantShellProps {
  children: React.ReactNode;
  currentView: DashboardView;
  onNavigate: (view: DashboardView) => void;
  onLogout: () => void;
  storeName?: string;
  storeType?: "HOME_KITCHEN" | "RESTAURANT" | "RETAIL_SHOP";
  pendingOrdersCount?: number;
  todaySales?: number;
  activeOrdersCount?: number;
  token?: string;
}

const STORE_TYPE_LABELS = {
  HOME_KITCHEN: { label: "أكل بيتي", emoji: "🍲" },
  RESTAURANT: { label: "مطعم وكافيه", emoji: "🍔" },
  RETAIL_SHOP: { label: "محل تجاري", emoji: "🏬" },
};

const NAV_ITEMS: { id: DashboardView; label: string; icon: React.ElementType; emoji: string }[] = [
  { id: "orders", label: "الطلبات المباشرة", icon: ClipboardList, emoji: "🛎️" },
  { id: "reels", label: "استوديو الريلز", icon: Film, emoji: "🎬" },
  { id: "menu", label: "المنيو والأطباق", icon: UtensilsCrossed, emoji: "🍽️" },
  { id: "wallet", label: "المحفظة والأرباح", icon: Wallet, emoji: "💰" },
  { id: "settings", label: "إعدادات المتجر", icon: Settings, emoji: "⚙️" },
];

export default function MerchantShell({
  children,
  currentView,
  onNavigate,
  onLogout,
  storeName = "مطبخ أم أحمد",
  storeType = "HOME_KITCHEN",
  pendingOrdersCount = 0,
  todaySales = 0,
  activeOrdersCount = 0,
  token,
}: MerchantShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [togglingStore, setTogglingStore] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close sidebar on outside click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) setSidebarOpen(false);
  }, []);

  // Close sidebar on nav (mobile)
  const handleNav = (view: DashboardView) => {
    onNavigate(view);
    setSidebarOpen(false);
  };

  const toggleStoreStatus = async () => {
    setTogglingStore(true);
    // Optimistic update
    setIsStoreOpen(prev => !prev);
    setTogglingStore(false);
  };

  const storeInfo = STORE_TYPE_LABELS[storeType];

  const SidebarContent = () => (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-5 border-b border-souqna-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-souqna-gold/15 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-souqna-gold" />
          </div>
          <div>
            <div className="text-souqna-gold font-black text-xl leading-none tracking-tight" style={{ fontFamily: "'Cairo', sans-serif" }}>
              سـوقـنا
            </div>
            <div className="text-souqna-text-muted text-[10px] font-medium mt-0.5">
              بوابة الشركاء والتجار
            </div>
          </div>
        </div>
      </div>

      {/* ── Store Status Toggle ── */}
      <div className="px-4 py-3 border-b border-souqna-border">
        <div className="card-glass p-3 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-souqna-text-secondary text-xs font-semibold">حالة المتجر</span>
            <button
              onClick={toggleStoreStatus}
              disabled={togglingStore}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border ${
                isStoreOpen
                  ? "status-open"
                  : "status-closed"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? "bg-souqna-emerald animate-pulse" : "bg-souqna-red"}`} />
              {isStoreOpen ? "مفتوح للطلبات" : "مغلق مؤقتاً"}
            </button>
          </div>
          {/* Store name & type */}
          <div className="flex items-center gap-2">
            <span className="text-lg">{storeInfo.emoji}</span>
            <div className="min-w-0">
              <div className="text-souqna-text-primary font-bold text-sm truncate">{storeName}</div>
              <div className="text-souqna-text-muted text-[11px]">{storeInfo.label}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`nav-item w-full text-right group ${isActive ? "nav-item-active" : ""}`}
            >
              <span className="text-base">{item.emoji}</span>
              <span className={`flex-1 font-semibold text-sm ${isActive ? "text-souqna-gold" : ""}`}>
                {item.label}
              </span>
              {item.id === "orders" && pendingOrdersCount > 0 && (
                <span className="badge-live animate-pulse">
                  {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
                </span>
              )}
              {isActive && (
                <div className="w-1 h-5 bg-souqna-gold rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom: Sound toggle + Logout ── */}
      <div className="px-3 pb-5 pt-2 border-t border-souqna-border space-y-1">
        {/* Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(prev => !prev)}
          className={`nav-item w-full text-right ${soundEnabled ? "" : "opacity-60"}`}
        >
          {soundEnabled ? (
            <Bell className="w-4 h-4 text-souqna-gold" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
          <span className="flex-1 font-semibold text-sm">
            {soundEnabled ? "جرس التنبيه شغال 🔔" : "الجرس مكتوم 🔕"}
          </span>
          <div className={`w-10 h-5 rounded-full transition-all duration-300 relative ${soundEnabled ? "bg-souqna-gold" : "bg-souqna-border"}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${soundEnabled ? "right-0.5" : "left-0.5"}`} />
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="nav-item w-full text-right text-souqna-red hover:bg-souqna-red/5 hover:text-souqna-red"
        >
          <LogOut className="w-4 h-4" />
          <span className="flex-1 font-semibold text-sm">تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-souqna-base flex overflow-x-hidden" dir="rtl">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0 bg-souqna-surface border-l border-souqna-border h-screen sticky top-0 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="lg:hidden fixed inset-0 z-50 sidebar-overlay bg-black/60"
        >
          <aside
            className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-souqna-surface border-l border-souqna-border animate-slide-in-right flex flex-col overflow-hidden"
          >
            <div className="flex justify-between items-center px-4 pt-4 pb-2 shrink-0 border-b border-souqna-border/50">
              <span className="text-souqna-text-muted text-xs font-semibold">القائمة</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-souqna-border transition-colors"
              >
                <X className="w-4 h-4 text-souqna-text-secondary" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-dvh lg:h-screen lg:overflow-auto">
        {/* ── Top Bar ── */}
        <header className="sticky top-0 z-30 bg-souqna-surface/90 backdrop-blur-sm border-b border-souqna-border px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-souqna-border transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5 text-souqna-text-secondary" />
            </button>

            {/* Store name (mobile) */}
            <div className="lg:hidden flex items-center gap-2 flex-1 min-w-0">
              <span className="text-base">{storeInfo.emoji}</span>
              <span className="text-souqna-text-primary font-bold text-sm truncate">{storeName}</span>
              <span className={`flex-shrink-0 w-2 h-2 rounded-full ${isStoreOpen ? "bg-souqna-emerald animate-pulse" : "bg-souqna-red"}`} />
            </div>

            {/* Page title (desktop) */}
            <div className="hidden lg:flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2 text-souqna-text-primary">
                <Zap className="w-4 h-4 text-souqna-gold" />
                <span className="font-bold text-sm">
                  {NAV_ITEMS.find(n => n.id === currentView)?.emoji}{" "}
                  {NAV_ITEMS.find(n => n.id === currentView)?.label}
                </span>
              </div>
            </div>

            {/* Stats strip (desktop) */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  const next = soundService.toggle();
                  setSoundEnabled(next);
                }}
                className={`p-2 rounded-xl border transition-all ${
                  soundEnabled
                    ? "bg-souqna-gold/15 border-souqna-gold/30 text-souqna-gold"
                    : "bg-souqna-surface border-souqna-border text-souqna-text-muted hover:text-white"
                }`}
                title={soundEnabled ? "صوت جرس التنبيه مفعّل (اضغط للكتم)" : "جرس التنبيه مكتوم (اضغط للتفعيل)"}
              >
                {soundEnabled ? <Bell className="w-4 h-4 text-souqna-gold" /> : <BellOff className="w-4 h-4" />}
              </button>

              {activeOrdersCount > 0 && (
                <div className="flex items-center gap-1.5 bg-souqna-gold/10 border border-souqna-gold/20 rounded-lg px-2 sm:px-3 py-1.5">
                  <span className="w-1.5 h-1.5 bg-souqna-gold rounded-full animate-pulse" />
                  <span className="text-souqna-gold text-[11px] sm:text-xs font-bold whitespace-nowrap">{activeOrdersCount} نشط</span>
                </div>
              )}
              {todaySales > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-souqna-emerald/10 border border-souqna-emerald/20 rounded-lg px-3 py-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-souqna-emerald" />
                  <span className="text-souqna-emerald text-xs font-bold whitespace-nowrap">
                    {todaySales.toLocaleString("ar-EG")} ج.م اليوم
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-24 lg:pb-6 page-enter">
          {children}
        </main>

        {/* ── Mobile Bottom Navigation Bar ── */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-souqna-surface/95 backdrop-blur-md border-t border-souqna-border px-1 py-1.5 flex items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl min-w-[56px] transition-colors ${
                  isActive ? "text-souqna-gold" : "text-souqna-text-muted hover:text-souqna-text-primary"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.id === "orders" && pendingOrdersCount > 0 && (
                    <span className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full bg-souqna-red text-white text-[9px] font-black flex items-center justify-center">
                      {pendingOrdersCount > 9 ? "9+" : pendingOrdersCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold truncate max-w-[64px]">
                  {item.id === "orders" ? "الطلبات" : item.id === "reels" ? "الريلز" : item.id === "menu" ? "المنيو" : item.id === "wallet" ? "المحفظة" : "الإعدادات"}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
