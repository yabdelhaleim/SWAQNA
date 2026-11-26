// src/components/layout/AdminShell.tsx
"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  Bike,
  Wallet,
  ShieldCheck,
  LogOut,
  Bell,
  Menu,
  X,
  Search,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { AdminUser } from "../../types/admin";

interface AdminShellProps {
  user: AdminUser;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  pendingMerchantsCount: number;
  liveOrdersCount: number;
  pendingWithdrawalsCount: number;
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  user,
  activeTab,
  onTabChange,
  onLogout,
  pendingMerchantsCount,
  liveOrdersCount,
  pendingWithdrawalsCount,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: "overview",
      label: "غرفة العمليات",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "merchants",
      label: "المتاجر والشركاء",
      icon: Store,
      badge: pendingMerchantsCount > 0 ? `${pendingMerchantsCount} معلق` : null,
      badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    },
    {
      id: "orders",
      label: "الطلبات الحية",
      icon: ShoppingBag,
      badge: liveOrdersCount > 0 ? `${liveOrdersCount} نشط` : null,
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
    {
      id: "captains",
      label: "المناديب والتوصيل",
      icon: Bike,
      badge: "تأكيد PIN",
      badgeColor: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    },
    {
      id: "financials",
      label: "المالية والسحوبات",
      icon: Wallet,
      badge: pendingWithdrawalsCount > 0 ? `${pendingWithdrawalsCount} سحب` : null,
      badgeColor: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    },
    {
      id: "moderation",
      label: "المحتوى والكوبونات",
      icon: ShieldCheck,
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen flex bg-souqna-base text-souqna-text-primary antialiased">
      {/* ===== Sidebar (Desktop) ===== */}
      <aside className="hidden lg:flex flex-col w-72 bg-souqna-surface/90 backdrop-blur-xl border-l border-souqna-border/80 p-5 shrink-0 select-none">
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-souqna-border/60">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-souqna-gold to-souqna-gold-dark flex items-center justify-center shadow-gold-glow">
            <span className="text-2xl">🛒</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-2xl tracking-tight text-white font-cairo">سـوقـنا</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-souqna-gold/15 text-souqna-gold border border-souqna-gold/30">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-souqna-text-secondary">مركز القيادة والتحكم العام</p>
          </div>
        </div>

        {/* Server & Live Status Indicator */}
        <div className="mt-4 px-3 py-2.5 rounded-xl bg-souqna-card/70 border border-souqna-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-semibold">السيرفر والـ WS متصل</span>
          </div>
          <span className="text-souqna-text-muted font-mono">v1.0.0</span>
        </div>

        {/* Nav Items */}
        <nav className="mt-6 flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-souqna-gold/20 to-transparent text-souqna-gold border-r-4 border-souqna-gold shadow-sm font-bold"
                    : "text-souqna-text-secondary hover:text-white hover:bg-souqna-card/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? "text-souqna-gold scale-110" : "text-souqna-text-muted"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      item.badgeColor || "bg-souqna-card text-souqna-text-muted"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin User Section & Logout */}
        <div className="pt-4 border-t border-souqna-border/60 space-y-3">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-souqna-card/60 border border-souqna-border/40">
            <div className="w-10 h-10 rounded-xl bg-souqna-border flex items-center justify-center overflow-hidden shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">👑</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-souqna-gold font-medium truncate">سوبر أدمن المنصة</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ===== Main Content Area ===== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-souqna-base/80 backdrop-blur-xl border-b border-souqna-border/60 px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-souqna-card border border-souqna-border text-souqna-text-secondary hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-white font-cairo flex items-center gap-2">
                <span>{navItems.find((n) => n.id === activeTab)?.label}</span>
                <Sparkles className="w-4 h-4 text-souqna-gold" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.location.reload()}
              title="تحديث البيانات"
              className="p-2 rounded-xl bg-souqna-card/80 border border-souqna-border/70 text-souqna-text-secondary hover:text-souqna-gold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-souqna-card/60 border border-souqna-border/60 text-xs">
              <span className="text-souqna-text-muted">المنطقة:</span>
              <span className="font-bold text-souqna-gold">مصر (القاهرة الكبرى) 🇪🇬</span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-souqna-surface border-b border-souqna-border p-4 space-y-2 z-20">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold ${
                    isActive ? "bg-souqna-gold/20 text-souqna-gold font-bold" : "text-souqna-text-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-souqna-card text-souqna-gold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
