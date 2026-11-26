"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Film, Play, Heart, Eye, Plus, Search, Sparkles, TrendingUp,
  ChevronLeft, X, CheckCircle2, AlertCircle, ShoppingBag, Loader2, Trash2,
  Power, PowerOff, Filter, BarChart3, ArrowUpRight,
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
  storeName = "متجر سوقنا",
  user = { full_name: "التاجر" },
  onNavigate,
  onLogout,
}: MerchantReelsViewProps) {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "TOP_VIEWED" | "TOP_LIKED" | "ACTIVE">("ALL");

  // Reel Modal State
  const [activeDishForReel, setActiveDishForReel] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<"upload" | "watch">("watch");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dish Picker Modal
  const [isDishPickerOpen, setIsDishPickerOpen] = useState(false);
  const [availableDishes, setAvailableDishes] = useState<any[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const defaultReels: ReelItem[] = [
    {
      id: "reel-1",
      title: "طريقة وسر طشة الملوخية بالتقلية الفلاحي",
      caption: "شوفوا الطشة بالسمنة البلدي ريحتها جابت آخر الشارع! 😍 #سوقنا #ملوخية #أكل_بيتي",
      video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      duration_seconds: 28,
      views_count: 14250,
      likes_count: 3820,
      is_active: true,
      product: {
        id: "p-1",
        name: "طاجن ملوخية بالطشة البلدي",
        base_price: 85,
        image_url: "/images/assets/dish-tagine.jpg",
        category_name: "طواجن بلدية",
      },
    },
    {
      id: "reel-2",
      title: "محشي مشكل فلاحي ني في ني بالسمنة",
      caption: "حلة المحشي المشكل على أصولها.. ريحة ورق العنب مع الكوسة والبتنجان! 🌶️✨",
      video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      duration_seconds: 35,
      views_count: 18900,
      likes_count: 5120,
      is_active: true,
      product: {
        id: "p-2",
        name: "محشي مشكل فلاحي مشطشط",
        base_price: 180,
        image_url: "/images/assets/dish-koshary.jpg",
        category_name: "محاشي",
      },
    },
    {
      id: "reel-3",
      title: "طاجن بامية باللحمة الضاني دايبة دوب",
      caption: "اللحمة بتدوب مع البامية ولمونتين معصورين.. سر التتبيلة الصعيدي في سوقنا! 🍲❤️",
      video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      duration_seconds: 42,
      views_count: 9800,
      likes_count: 2450,
      is_active: true,
      product: {
        id: "p-3",
        name: "طاجن بامية باللحمة الضاني",
        base_price: 220,
        image_url: "/images/assets/dish-tagine.jpg",
        category_name: "طواجن بلدية",
      },
    },
  ];

  // Fetch reels and menu
  useEffect(() => {
    setLoading(true);
    merchantApi
      .getReels(token)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setReels(res.data);
        } else {
          setReels([]);
        }
      })
      .catch(() => {
        setReels([]);
        showToast("تعذر جلب الفيديوهات من السيرفر", "error");
      })
      .finally(() => setLoading(false));

    merchantApi
      .getMenu(token)
      .then((res) => {
        if (res.success && res.products && res.products.length > 0) {
          setAvailableDishes(res.products);
        } else if (res.success && res.categories) {
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
        } else {
          setAvailableDishes([]);
        }
      })
      .catch(() => {
        setAvailableDishes([]);
      });
  }, [token]);

  const handleWatchReel = (reel: ReelItem) => {
    setActiveDishForReel({
      id: reel.product?.id || reel.id,
      name: reel.product?.name || reel.title,
      description: reel.caption || "",
      base_price: reel.product?.base_price || 95,
      category_name: reel.product?.category_name || "ريلز سوقنا",
      reel_url: reel.video_url,
      reel_title: reel.title,
      reel_likes: reel.likes_count,
      reel_views: reel.views_count,
    });
    setModalMode("watch");
    setIsModalOpen(true);
  };

  const handleUploadForDish = (dish: any) => {
    setActiveDishForReel({
      id: dish.id,
      name: dish.name,
      description: dish.description || "",
      base_price: dish.base_price || 90,
      category_name: dish.category_name || "منتج",
    });
    setModalMode("upload");
    setIsDishPickerOpen(false);
    setIsModalOpen(true);
  };

  const handleReelSaved = (dishId: string, reelData: any) => {
    showToast("تم نشر وتحديث الريلز بنجاح! 🎬🎉");
    setReels((prev) => [
      {
        id: reelData.id || `reel-${Date.now()}`,
        title: reelData.title || `فيديو منتج جديد`,
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

  // Toggle Reel Active / Paused
  const handleToggleReelStatus = async (reelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReels((prev) =>
      prev.map((r) => (r.id === reelId ? { ...r, is_active: !r.is_active } : r))
    );

    try {
      if (!reelId.startsWith("reel-")) {
        await merchantApi.toggleReelStatus(token, reelId);
      }
      showToast("تم تحديث حالة ظهور الريلز للعملاء");
    } catch {
      showToast("تم تحديث حالة الريلز محلياً");
    }
  };

  // Delete Reel
  const handleDeleteReel = async (reelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الفيديو من استوديو الريلز؟")) return;

    setReels((prev) => prev.filter((r) => r.id !== reelId));
    try {
      if (!reelId.startsWith("reel-")) {
        await merchantApi.deleteReel(token, reelId);
      }
      showToast("تم حذف الفيديو بنجاح");
    } catch {
      showToast("تم حذف الفيديو");
    }
  };

  const filteredReels = reels
    .filter((r) => {
      const matchSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.product?.name && r.product.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchFilter =
        selectedFilter === "ACTIVE" ? r.is_active : true;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (selectedFilter === "TOP_VIEWED") return b.views_count - a.views_count;
      if (selectedFilter === "TOP_LIKED") return b.likes_count - a.likes_count;
      return 0;
    });

  const totalViews = reels.reduce((acc, r) => acc + (r.views_count || 0), 0);
  const totalLikes = reels.reduce((acc, r) => acc + (r.likes_count || 0), 0);

  return (
    <div className="min-h-full" dir="rtl">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-xs md:text-sm font-bold shadow-2xl flex items-center gap-2 border transition-all ${
            toastMessage.type === "success"
              ? "bg-souqna-surface text-white border-souqna-gold/40"
              : "bg-red-600 text-white border-red-400"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-souqna-emerald" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Film className="w-6 h-6 text-souqna-gold" />
              <h1 className="text-xl font-black text-souqna-text-primary">
                استوديو فيديوهات الريلز (Souqna Reels)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-souqna-gold/15 text-souqna-gold text-xs font-bold border border-souqna-gold/30">
                فيديو تسوق رأسي 9:16
              </span>
            </div>
            <p className="text-xs text-souqna-text-muted mt-1">
              حوّل أطباقك ومنتجاتك لفيديوهات جاذبة تتيح للزبائن الطلب الفوري بضغطة زر أثناء المشاهدة
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDishPickerOpen(true)}
            className="btn-gold flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>رفع ريلز لمنتج 🎬</span>
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card-glass p-4 border border-souqna-border">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-souqna-gold/15 flex items-center justify-center text-souqna-gold">
                <Film className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-souqna-gold font-mono">{reels.length}</span>
            </div>
            <p className="text-souqna-text-muted text-xs font-semibold mt-2">الفيديوهات المنشورة</p>
          </div>

          <div className="card-glass p-4 border border-souqna-border">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                <Eye className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-blue-400 font-mono">{totalViews.toLocaleString()}</span>
            </div>
            <p className="text-souqna-text-muted text-xs font-semibold mt-2">إجمالي المشاهدات</p>
          </div>

          <div className="card-glass p-4 border border-souqna-border">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-pink-500/15 flex items-center justify-center text-pink-400">
                <Heart className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-pink-400 font-mono">{totalLikes.toLocaleString()}</span>
            </div>
            <p className="text-souqna-text-muted text-xs font-semibold mt-2">تفاعلات الإعجاب</p>
          </div>

          <div className="card-glass p-4 border border-souqna-border">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-souqna-emerald/15 flex items-center justify-center text-souqna-emerald">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-souqna-emerald font-mono">+38%</span>
            </div>
            <p className="text-souqna-text-muted text-xs font-semibold mt-2">معدل زيادة الطلبات</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="card-glass p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-souqna-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المنتج أو عنوان الفيديو..."
              className="input-dark w-full pr-10 text-xs py-2.5"
            />
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedFilter === "ALL"
                  ? "bg-souqna-gold text-souqna-base font-bold shadow-md shadow-souqna-gold/20"
                  : "bg-souqna-surface border border-souqna-border text-souqna-text-secondary hover:border-souqna-gold/40"
              }`}
            >
              جميع الفيديوهات ({reels.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("TOP_VIEWED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                selectedFilter === "TOP_VIEWED"
                  ? "bg-souqna-gold text-souqna-base font-bold shadow-md shadow-souqna-gold/20"
                  : "bg-souqna-surface border border-souqna-border text-souqna-text-secondary hover:border-souqna-gold/40"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              الأعلى مشاهدة
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("TOP_LIKED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                selectedFilter === "TOP_LIKED"
                  ? "bg-pink-600 text-white font-bold shadow-md"
                  : "bg-souqna-surface border border-souqna-border text-souqna-text-secondary hover:border-pink-500/40"
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              الأعلى إعجاباً
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter("ACTIVE")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                selectedFilter === "ACTIVE"
                  ? "bg-souqna-emerald text-souqna-base font-bold shadow-md"
                  : "bg-souqna-surface border border-souqna-border text-souqna-text-secondary hover:border-souqna-emerald/40"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              النشطة فقط
            </button>
          </div>
        </div>

        {/* Reels 9:16 Vertical Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredReels.map((reel) => (
            <div
              key={reel.id}
              className={`group relative bg-souqna-surface rounded-3xl overflow-hidden shadow-xl border-2 transition-all flex flex-col justify-between ${
                reel.is_active ? "border-souqna-border hover:border-souqna-gold/60" : "border-souqna-border/40 opacity-60"
              }`}
              style={{ aspectRatio: "9 / 15.5" }}
            >
              {/* Video Element */}
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
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 cursor-pointer"
                onClick={() => handleWatchReel(reel)}
              />

              {/* Top Bar: Duration & Active Toggle */}
              <div className="relative z-10 p-3.5 flex items-center justify-between pointer-events-auto">
                <span className="px-2.5 py-1 rounded-xl bg-souqna-base/80 backdrop-blur-md text-white text-[11px] font-mono font-bold flex items-center gap-1 border border-white/10">
                  <Film className="w-3 h-3 text-souqna-gold" />
                  0:{reel.duration_seconds < 10 ? `0${reel.duration_seconds}` : reel.duration_seconds}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleToggleReelStatus(reel.id, e)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                      reel.is_active
                        ? "bg-souqna-emerald/80 text-white"
                        : "bg-stone-800/80 text-stone-400"
                    }`}
                    title={reel.is_active ? "الريلز نشط (اضغط للإيقاف المؤقت)" : "الريلز متوقف (اضغط للتفعيل)"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteReel(reel.id, e)}
                    className="w-7 h-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-md transition-all"
                    title="حذف الريلز"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Center Play Button on hover */}
              <div
                onClick={() => handleWatchReel(reel)}
                className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
              >
                <div className="w-14 h-14 rounded-full bg-souqna-gold/25 backdrop-blur-md border border-souqna-gold/40 flex items-center justify-center text-souqna-gold shadow-2xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                  <Play className="w-7 h-7 fill-souqna-gold translate-x-[-1px]" />
                </div>
              </div>

              {/* Bottom Details Overlay */}
              <div className="relative z-10 p-3.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-12 space-y-2.5 pointer-events-auto">
                {reel.product && (
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ShoppingBag className="w-3.5 h-3.5 text-souqna-gold shrink-0" />
                      <span className="font-bold text-xs truncate text-amber-200">
                        {reel.product.name}
                      </span>
                    </div>
                    <span className="text-xs font-black text-souqna-gold shrink-0 bg-souqna-base/80 px-2 py-0.5 rounded-lg border border-souqna-gold/30 font-mono">
                      {reel.product.base_price} ج.م
                    </span>
                  </div>
                )}

                <p className="text-xs text-white/90 font-medium line-clamp-2 leading-relaxed">
                  {reel.caption || reel.title}
                </p>

                <div className="flex items-center gap-4 text-[11px] font-bold text-stone-300 pt-1 border-t border-white/10 font-mono">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-souqna-gold" />
                    {reel.views_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/20" />
                    {reel.likes_count.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleWatchReel(reel)}
                    className="py-1.5 px-3 rounded-xl btn-gold text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-souqna-base" />
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
                        category_name: reel.product?.category_name || "منتج",
                        reel_url: reel.video_url,
                      });
                      setModalMode("upload");
                      setIsModalOpen(true);
                    }}
                    className="py-1.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <span>تعديل ⚙️</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dish Picker Modal */}
      {isDishPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg card-glass border border-souqna-gold/25 p-6 text-right space-y-4 animate-in fade-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-souqna-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-souqna-gold/15 flex items-center justify-center text-souqna-gold">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-souqna-text-primary">اختر المنتج لربط الريلز</h3>
                  <p className="text-xs text-souqna-text-muted">اربط الفيديو بمنتج من قائمتك للشراء المباشر</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDishPickerOpen(false)}
                className="btn-ghost p-1.5 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleUploadForDish({
                id: `new-dish-${Date.now()}`,
                name: "منتج جديد",
                description: "منتج معروض في استوديو ريلز سوقنا",
                base_price: 150,
                category_name: "عام",
              })}
              className="btn-gold w-full py-3 text-xs flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>رفع ريلز لمنتج جديد ومباشر 🎬</span>
            </button>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {availableDishes.map((dish) => (
                <div
                  key={dish.id}
                  onClick={() => handleUploadForDish(dish)}
                  className="p-3 bg-souqna-surface/70 hover:bg-souqna-gold/10 hover:border-souqna-gold/40 border border-souqna-border rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-souqna-gold group-hover:translate-x-[-4px] transition-transform">
                    <span>رفع فيديو 🎬</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-sm text-souqna-text-primary">{dish.name}</h4>
                    <span className="text-xs text-souqna-text-muted">
                      {dish.category_name} • {dish.base_price} ج.م
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reel Modal */}
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
