"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Film,
  Play,
  Upload,
  Heart,
  Eye,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Video,
  ChevronLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Home,
  ClipboardList,
  UtensilsCrossed,
  Users,
  Settings,
  LogOut,
  ShoppingBag,
} from "lucide-react";
import { merchantApi } from "@/lib/api";
import ReelModal from "./ReelModal";

interface ReelItem {
  id: string;
  title: string;
  caption?: string;
  video_url: string;
  duration_seconds: number;
  views_count: number;
  likes_count: number;
  is_active: boolean;
  product?: {
    id: string;
    name: string;
    base_price: number;
    image_url?: string;
    category_name?: string;
  };
}

interface MerchantReelsViewProps {
  token: string;
  storeName?: string;
  user?: { full_name?: string };
  onNavigate: (view: "settings" | "menu" | "orders" | "reels") => void;
  onLogout: () => void;
}

export default function MerchantReelsView({
  token,
  storeName = "مطبخ أم أحمد للأكل البيتي",
  user = { full_name: "الشيف أم أحمد" },
  onNavigate,
  onLogout,
}: MerchantReelsViewProps) {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "TOP_VIEWED" | "TOP_LIKED">("ALL");

  // Reel Modal State
  const [activeDishForReel, setActiveDishForReel] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<"upload" | "watch">("watch");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dish Picker Modal (for creating reel from scratch)
  const [isDishPickerOpen, setIsDishPickerOpen] = useState(false);
  const [availableDishes, setAvailableDishes] = useState<any[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Mock initial sample reels to guarantee instant presentation
  const defaultReels: ReelItem[] = [
    {
      id: "reel-1",
      title: "طريقة وسر طشة الملوخية بالتقلية البلدي",
      caption: "شوفوا الطشة بالسمنة البلدي ريحتها جابت آخر الشارع! 😍 #حواديت #ملوخية",
      video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      duration_seconds: 28,
      views_count: 14250,
      likes_count: 3820,
      is_active: true,
      product: {
        id: "p-1",
        name: "طاجن ملوخية بالطشة البلدي",
        base_price: 85,
        image_url: "/images/bg-phone.jpg",
        category_name: "طواجن بلدية",
      },
    },
    {
      id: "reel-2",
      title: "محشي مشكل بيتي ني في ني بالسمنة",
      caption: "حلة المحشي المشكل على أصولها.. ريحة ورق العنب مع البتنجان والكوسة! 🌶️✨",
      video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      duration_seconds: 35,
      views_count: 18900,
      likes_count: 5120,
      is_active: true,
      product: {
        id: "p-2",
        name: "محشي مشكل بيتي مشطشط",
        base_price: 110,
        image_url: "/images/bg-otp.jpg",
        category_name: "محاشي",
      },
    },
    {
      id: "reel-3",
      title: "طاجن بامية باللحمة الضاني دايبة دوب",
      caption: "اللحمة بتدوب مع البامية ولمونتين معصورين.. سر التتبيلة في حواديت! 🍲❤️",
      video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      duration_seconds: 42,
      views_count: 9800,
      likes_count: 2450,
      is_active: true,
      product: {
        id: "p-3",
        name: "طاجن بامية باللحمة الضاني",
        base_price: 165,
        image_url: "/images/bg-register.jpg",
        category_name: "طواجن بلدية",
      },
    },
    {
      id: "reel-4",
      title: "كباب حلة بصل مكرمل على الهادي",
      caption: "صوص البصل المكرمل مع قطع اللحم الكندوز العجالي.. تغميسة العمر! 🥩",
      video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
      duration_seconds: 30,
      views_count: 7300,
      likes_count: 1890,
      is_active: true,
      product: {
        id: "p-4",
        name: "كباب حلة بالبصل المكرمل",
        base_price: 190,
        image_url: "/images/bg-phone.jpg",
        category_name: "أطباق لحوم",
      },
    },
  ];

  // Fetch store reels & menu dishes from API
  useEffect(() => {
    setLoading(true);
    // Fetch reels
    merchantApi
      .getReels(token)
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setReels(res.data);
        } else {
          setReels(defaultReels);
        }
      })
      .catch(() => {
        setReels(defaultReels);
      })
      .finally(() => setLoading(false));

    // Fetch menu to populate dish picker
    merchantApi
      .getMenu(token)
      .then((res) => {
        if (res.success && res.categories) {
          const allDishes: any[] = [];
          res.categories.forEach((cat: any) => {
            if (cat.products) {
              cat.products.forEach((p: any) => {
                allDishes.push({
                  ...p,
                  category_name: cat.name,
                });
              });
            }
          });
          setAvailableDishes(allDishes);
        }
      })
      .catch(() => {
        // Fallback default dishes
        setAvailableDishes([
          { id: "p-1", name: "طاجن ملوخية بالطشة البلدي", base_price: 85, category_name: "طواجن بلدية" },
          { id: "p-2", name: "محشي مشكل بيتي مشطشط", base_price: 110, category_name: "محاشي" },
          { id: "p-3", name: "طاجن بامية باللحمة الضاني", base_price: 165, category_name: "طواجن بلدية" },
          { id: "p-4", name: "كباب حلة بالبصل المكرمل", base_price: 190, category_name: "أطباق لحوم" },
          { id: "p-5", name: "أرز معمر فلاحي بالقشطة", base_price: 75, category_name: "أطباق أرز" },
        ]);
      });
  }, [token]);

  // Handle open modal for watch
  const handleWatchReel = (reel: ReelItem) => {
    setActiveDishForReel({
      id: reel.product?.id || reel.id,
      name: reel.product?.name || reel.title,
      description: reel.caption || "",
      base_price: reel.product?.base_price || 95,
      category_name: reel.product?.category_name || "ريلز حواديت",
      reel_url: reel.video_url,
      reel_title: reel.title,
      reel_likes: reel.likes_count,
      reel_views: reel.views_count,
    });
    setModalMode("watch");
    setIsModalOpen(true);
  };

  // Handle open modal for upload
  const handleUploadForDish = (dish: any) => {
    setActiveDishForReel({
      id: dish.id,
      name: dish.name,
      description: dish.description || "",
      base_price: dish.base_price || 90,
      category_name: dish.category_name || "طبق بيتي",
    });
    setModalMode("upload");
    setIsDishPickerOpen(false);
    setIsModalOpen(true);
  };

  // Callback when a reel is saved
  const handleReelSaved = (dishId: string, reelData: any) => {
    showToast("تم نشر وتحديث الريلز بنجاح! 🎬🎉");
    // Add or update in list
    setReels((prev) => [
      {
        id: reelData.id || `reel-${Date.now()}`,
        title: reelData.title || `فيديو طبق جديد`,
        caption: reelData.caption || "",
        video_url: reelData.video_url || "",
        duration_seconds: reelData.duration_seconds || 30,
        views_count: reelData.views_count || 1,
        likes_count: reelData.likes_count || 0,
        is_active: true,
        product: activeDishForReel
          ? {
              id: activeDishForReel.id,
              name: activeDishForReel.name,
              base_price: activeDishForReel.base_price,
              category_name: activeDishForReel.category_name,
            }
          : undefined,
      },
      ...prev,
    ]);
  };

  // Filtered reels
  const filteredReels = reels
    .filter((r) => {
      const matchSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.product?.name && r.product.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    })
    .sort((a, b) => {
      if (selectedFilter === "TOP_VIEWED") return b.views_count - a.views_count;
      if (selectedFilter === "TOP_LIKED") return b.likes_count - a.likes_count;
      return 0;
    });

  // Totals
  const totalViews = reels.reduce((acc, r) => acc + (r.views_count || 0), 0);
  const totalLikes = reels.reduce((acc, r) => acc + (r.likes_count || 0), 0);

  return (
    <div className="w-screen h-screen flex bg-[#f7f3ea] font-sans text-[#3a2818] overflow-hidden" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#3a2818] text-white px-5 py-3 rounded-2xl text-xs md:text-sm font-bold shadow-2xl flex items-center gap-2 border border-amber-500/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          RIGHT SIDEBAR (Navigation)
         ========================================================================= */}
      <aside className="w-64 bg-[#231710] text-[#f7f3ea] flex flex-col justify-between p-5 select-none shrink-0 border-l border-amber-950/40">
        <div className="space-y-6">
          {/* Logo & Store Branding */}
          <div className="flex items-center gap-3 pb-5 border-b border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-[#d32f2f] flex items-center justify-center text-white font-black text-2xl shadow-lg ring-2 ring-amber-400/30">
              ح
            </div>
            <div>
              <h2 className="font-extrabold text-base leading-tight text-white">{storeName}</h2>
              <span className="text-xs text-amber-300 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                حواديت - لوحة التاجر
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2 font-bold text-sm">
            {/* 1. الرئيسية / الإعدادات */}
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>الرئيسية</span>
            </button>

            {/* 2. الطلبات الحية */}
            <button
              type="button"
              onClick={() => onNavigate("orders")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="w-4 h-4 text-amber-400" />
                <span>الطلبات</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-white/15 text-stone-300 text-[10px] font-black flex items-center justify-center">
                12
              </span>
            </button>

            {/* 3. قائمة الطعام */}
            <button
              type="button"
              onClick={() => onNavigate("menu")}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              <span>قائمة الطعام</span>
            </button>

            {/* 4. فيديوهات الريلز (ACTIVE NOW) */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-[#d32f2f] to-[#b71c1c] text-white shadow-xl ring-1 ring-amber-400/40 cursor-pointer text-right"
            >
              <div className="flex items-center gap-3">
                <Film className="w-4 h-4 text-amber-200 animate-bounce" />
                <span className="font-extrabold">فيديوهات الريلز 🎬</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-black">
                {reels.length}
              </span>
            </button>

            {/* 5. العملاء */}
            <button
              type="button"
              onClick={() => showToast("شاشة سجل العملاء قيد التطوير")}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>العملاء</span>
            </button>

            {/* 6. الإعدادات */}
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>الإعدادات</span>
            </button>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-5 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-sm">
              👨‍🍳
            </div>
            <div>
              <p className="font-extrabold text-xs text-white leading-tight">{user.full_name}</p>
              <span className="text-[11px] text-stone-400">مدير المتجر</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="تسجيل الخروج"
            className="p-2 rounded-xl text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTENT AREA: REELS STUDIO
         ========================================================================= */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="bg-[#fffdfa] border-b border-[#ebdcc8] px-8 py-5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🎬</span>
              <h1 className="text-2xl font-black text-[#2e1d10]">
                استوديو فيديوهات الريلز (Hawadeet Reels)
              </h1>
              <span className="px-2.5 py-1 rounded-xl bg-red-100 text-[#d32f2f] text-xs font-black">
                فيديوهات رأسية 9:16
              </span>
            </div>
            <p className="text-xs text-stone-500 font-bold mt-1">
              منصة حواديت تتيح لزبائنك تذوق طعامك بعيونهم من خلال فيديوهات رأسية حقيقية ترفع مبيعات الأطباق بنسبة 40%
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDishPickerOpen(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#d32f2f] to-[#b71c1c] text-white font-black text-sm shadow-lg hover:shadow-xl hover:brightness-105 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>رفع ريلز جديد لطبق ➕</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 space-y-7 max-w-7xl w-full mx-auto">
          {/* 🌟 STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 1. إجمالي الفيديوهات */}
            <div className="p-5 bg-[#fffdfa] rounded-3xl border-2 border-[#eddcc4] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-[#d32f2f]">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-500">الفيديوهات النشطة</span>
                <p className="text-2xl font-black text-[#3a2818]">{reels.length} ريلز</p>
              </div>
            </div>

            {/* 2. إجمالي المشاهدات */}
            <div className="p-5 bg-[#fffdfa] rounded-3xl border-2 border-[#eddcc4] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-500">إجمالي المشاهدات</span>
                <p className="text-2xl font-black text-[#3a2818]">{totalViews.toLocaleString()} مشاهدة</p>
              </div>
            </div>

            {/* 3. إجمالي الإعجابات */}
            <div className="p-5 bg-[#fffdfa] rounded-3xl border-2 border-[#eddcc4] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-600">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-500">تفاعلات الإعجاب</span>
                <p className="text-2xl font-black text-[#3a2818]">{totalLikes.toLocaleString()} إعجاب</p>
              </div>
            </div>

            {/* 4. معدل تحويل الطلبات */}
            <div className="p-5 bg-[#fffdfa] rounded-3xl border-2 border-[#eddcc4] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-stone-500">معدل التحويل للطلب</span>
                <p className="text-2xl font-black text-emerald-700">+34% مبيعات</p>
              </div>
            </div>
          </div>

          {/* 🔍 FILTER & SEARCH BAR */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#fffdfa] p-4 rounded-3xl border-2 border-[#eddcc4] shadow-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطبق أو عنوان الفيديو..."
                className="w-full bg-[#fcf9f2] text-sm font-bold text-[#3a2818] pr-11 pl-4 py-2.5 rounded-2xl border border-[#e0cfb8] focus:border-[#d32f2f] focus:outline-none transition-all placeholder:text-stone-400"
              />
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setSelectedFilter("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedFilter === "ALL"
                    ? "bg-[#3a2818] text-white shadow"
                    : "bg-[#fcf9f2] text-stone-600 hover:bg-stone-200"
                }`}
              >
                جميع الفيديوهات ({reels.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter("TOP_VIEWED")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  selectedFilter === "TOP_VIEWED"
                    ? "bg-[#d32f2f] text-white shadow"
                    : "bg-[#fcf9f2] text-stone-600 hover:bg-stone-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                الأعلى مشاهدة
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter("TOP_LIKED")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  selectedFilter === "TOP_LIKED"
                    ? "bg-pink-600 text-white shadow"
                    : "bg-[#fcf9f2] text-stone-600 hover:bg-stone-200"
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                الأعلى إعجاباً
              </button>
            </div>
          </div>

          {/* 📱 REELS VERTICAL 9:16 GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredReels.map((reel) => (
              <div
                key={reel.id}
                className="group relative bg-[#1c120c] rounded-3xl overflow-hidden shadow-xl border-2 border-[#ebdcc8] hover:border-[#d32f2f] transition-all flex flex-col justify-between"
                style={{ aspectRatio: "9 / 15.5" }}
              >
                {/* Background Video Looper Preview or Gradient */}
                <video
                  src={reel.video_url}
                  muted
                  loop
                  playsInline
                  onMouseEnter={(e) => {
                    const v = e.currentTarget;
                    v.play().catch(() => {});
                  }}
                  onMouseLeave={(e) => {
                    const v = e.currentTarget;
                    v.pause();
                    v.currentTime = 0;
                  }}
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 pointer-events-auto cursor-pointer"
                  onClick={() => handleWatchReel(reel)}
                />

                {/* Top Overlay: Duration & Active Badge */}
                <div className="relative z-10 p-4 flex items-center justify-between pointer-events-none">
                  <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-mono font-bold flex items-center gap-1 border border-white/10">
                    <Film className="w-3 h-3 text-red-400" />
                    0:{reel.duration_seconds < 10 ? `0${reel.duration_seconds}` : reel.duration_seconds}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 shadow"></span>
                </div>

                {/* Center Play Button (appears on hover) */}
                <div
                  onClick={() => handleWatchReel(reel)}
                  className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-2xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                    <Play className="w-8 h-8 fill-white translate-x-[-2px]" />
                  </div>
                </div>

                {/* Bottom Overlay: Dish Details & Actions */}
                <div className="relative z-10 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-12 space-y-3 pointer-events-auto">
                  {/* Dish Badge */}
                  {reel.product && (
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-extrabold text-xs truncate text-amber-200">
                          {reel.product.name}
                        </span>
                      </div>
                      <span className="text-xs font-black text-white shrink-0 bg-white/20 px-2 py-0.5 rounded-lg">
                        {reel.product.base_price} ج.م
                      </span>
                    </div>
                  )}

                  {/* Reel Caption */}
                  <p className="text-xs text-white/90 font-bold line-clamp-2 leading-relaxed">
                    {reel.caption || reel.title}
                  </p>

                  {/* Views & Likes Counters */}
                  <div className="flex items-center gap-4 text-[11px] font-bold text-stone-300 pt-1 border-t border-white/10">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      {reel.views_count.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/20" />
                      {reel.likes_count.toLocaleString()}
                    </span>
                  </div>

                  {/* Interactive Button */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleWatchReel(reel)}
                      className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#d32f2f] to-[#b71c1c] text-white text-xs font-extrabold shadow hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>مشاهدة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDishForReel({
                          id: reel.product?.id || reel.id,
                          name: reel.product?.name || reel.title,
                          description: reel.caption || "",
                          base_price: reel.product?.base_price || 95,
                          category_name: reel.product?.category_name || "طبق بيتي",
                          reel_url: reel.video_url,
                        });
                        setModalMode("upload");
                        setIsModalOpen(true);
                      }}
                      className="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>تعديل ⚙️</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto py-5 border-t border-[#ebdcc8] bg-[#fffdfa] text-center text-xs font-bold text-stone-500">
          <div className="flex items-center justify-center gap-2">
            <span>2025 © حواديت | جميع الحقوق محفوظة</span>
            <span>•</span>
            <span className="text-[#8c2b18] font-black">حواديت .. لكل أكلة حكاية</span>
          </div>
        </footer>
      </main>

      {/* =========================================================================
          DISH PICKER MODAL (Select which dish to create a reel for)
         ========================================================================= */}
      {isDishPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#fffdfa] rounded-3xl border-2 border-[#eddcc4] shadow-2xl p-6 text-right space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#eddcc4] pb-4">
              <button
                type="button"
                onClick={() => setIsDishPickerOpen(false)}
                className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-black text-[#2e1d10]">اختر الطبق لرفع الريلز</h3>
                <p className="text-xs font-bold text-stone-500">حدد الطبق من قائمتك لربط الفيديو الرأسي به</p>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {availableDishes.map((dish) => (
                <div
                  key={dish.id}
                  onClick={() => handleUploadForDish(dish)}
                  className="p-3.5 bg-[#fcf9f2] hover:bg-red-50 hover:border-[#d32f2f] border border-[#e8d8c2] rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-black text-[#d32f2f] group-hover:translate-x-[-4px] transition-transform">
                    <span>رفع فيديو 🎬</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <h4 className="font-extrabold text-sm text-[#2e1d10]">{dish.name}</h4>
                    <span className="text-xs font-bold text-stone-500">
                      {dish.category_name} • {dish.base_price} ج.م
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FULL 9:16 SMARTPHONE REEL MODAL (Watch or Upload)
         ========================================================================= */}
      <ReelModal
        isOpen={isModalOpen}
        mode={modalMode}
        dish={activeDishForReel}
        token={token}
        onClose={() => setIsModalOpen(false)}
        onReelSaved={handleReelSaved}
      />
    </div>
  );
}
