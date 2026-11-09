"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Film,
  Camera,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Users,
  Calendar,
  ChevronDown,
  Home,
  ClipboardList,
  UtensilsCrossed,
  Settings,
  LogOut,
  Bell,
  Store,
  Layers,
  Sparkles,
} from "lucide-react";
import { merchantApi } from "@/lib/api";
import ReelModal from "@/components/ReelModal";

interface DishItem {
  id: string;
  name: string;
  description: string;
  base_price: number;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  reel_url?: string;
  reel_title?: string;
  reel_likes?: number;
  reel_views?: number;
  is_available: boolean;
  prep_time_minutes: number;
  servings_count: string;
  requires_preorder: boolean;
  variants?: Array<{ id?: string; name: string; price: number; is_available?: boolean }>;
  modifier_groups?: Array<{
    id?: string;
    name: string;
    items: Array<{ id?: string; name: string; additional_price: number }>;
  }>;
}

interface MerchantMenuViewProps {
  token: string;
  storeName?: string;
  user?: any;
  onNavigate: (view: "settings" | "menu" | "orders") => void;
  onLogout: () => void;
}

const INITIAL_DISHES: DishItem[] = [
  {
    id: "dish-1",
    name: "محشي مشكل بيتي بالسمنة البلدي",
    description: "محشي مشكل بيتي بالسمنة البلدي الفاخرة على أصوله",
    base_price: 180,
    category_name: "محاشي",
    image_url: "/images/assets/dish-tagine.jpg",
    reel_url: "https://assets.mixkit.co/videos/preview/mixkit-top-shot-of-a-dish-with-curry-and-rice-42407-large.mp4",
    reel_title: "سر خلطة وطشة المحشي البلدي بالسمنة",
    reel_likes: 2450,
    reel_views: 8900,
    is_available: true,
    prep_time_minutes: 90,
    servings_count: "3-4 أفراد",
    requires_preorder: true,
    variants: [
      { name: "وسط", price: 180 },
      { name: "عائلي", price: 250 },
    ],
  },
  {
    id: "dish-2",
    name: "طاجن بامية بلدي باللحمة الضاني",
    description: "طاجن بامية بلدي باللحمة الضاني طازجة على أصولها بالفرن البلدي",
    base_price: 220,
    category_name: "طواجن",
    image_url: "/images/assets/dish-koshary.jpg",
    is_available: true,
    prep_time_minutes: 60,
    servings_count: "يكفي فردين",
    requires_preorder: false,
    variants: [
      { name: "فردي", price: 140 },
      { name: "وسط", price: 220 },
    ],
  },
];

export default function MerchantMenuView({
  token,
  storeName = "مطبخ أم أحمد للأكل البيتي",
  user,
  onNavigate,
  onLogout,
}: MerchantMenuViewProps) {
  const [dishes, setDishes] = useState<DishItem[]>(INITIAL_DISHES);
  const [categories, setCategories] = useState<string[]>(["الكل", "طواجن", "محاشي", "حلويات"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  // Reels Modal State
  const [selectedDishForReel, setSelectedDishForReel] = useState<DishItem | null>(null);
  const [isReelModalOpen, setIsReelModalOpen] = useState<boolean>(false);
  const [reelModalMode, setReelModalMode] = useState<"upload" | "watch">("upload");

  // Form Fields
  const [formName, setFormName] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formPrice, setFormPrice] = useState<number>(180);
  const [formCategory, setFormCategory] = useState<string>("طواجن");
  const [formServings, setFormServings] = useState<string>("3-4 أفراد");
  const [formPrepTime, setFormPrepTime] = useState<number>(60);
  const [selectedVariant, setSelectedVariant] = useState<string>("وسط");
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>(["أبيض", "شطة"]);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // جلب قائمة الطعام من الباك إند بواسطة Eager Loading
  useEffect(() => {
    let isMounted = true;
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const res = await merchantApi.getMenu(token);
        if (res.success && isMounted) {
          if (res.products && res.products.length > 0) {
            setDishes(res.products);
          }
          if (res.categories && res.categories.length > 0) {
            const catNames = ["الكل", ...res.categories.map((c: any) => c.name)];
            setCategories(Array.from(new Set(catNames)));
          }
        }
      } catch (err) {
        console.error("فشل جلب قائمة الطعام:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMenu();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // فتح نافذة إضافة طبق جديد
  const handleOpenAddModal = () => {
    setEditingDishId(null);
    setFormName("");
    setFormDescription("");
    setFormPrice(150);
    setFormCategory("طواجن");
    setFormServings("3-4 أفراد");
    setFormPrepTime(60);
    setSelectedVariant("وسط");
    setSelectedModifiers(["أبيض"]);
    setIsModalOpen(true);
  };

  // فتح نافذة تعديل طبق
  const handleOpenEditModal = (dish: DishItem) => {
    setEditingDishId(dish.id);
    setFormName(dish.name);
    setFormDescription(dish.description || "");
    setFormPrice(dish.base_price);
    setFormCategory(dish.category_name || "طواجن");
    setFormServings(dish.servings_count || "3-4 أفراد");
    setFormPrepTime(dish.prep_time_minutes || 60);
    setIsModalOpen(true);
  };

  // تبديل توفر الطبق اليوم (متاح / غير متاح)
  const handleToggleAvailability = async (dishId: string) => {
    setDishes((prev) =>
      prev.map((d) => (d.id === dishId ? { ...d, is_available: !d.is_available } : d))
    );

    try {
      const res = await merchantApi.toggleProductAvailability(token, dishId);
      if (res.success) {
        showToast(res.message || "تم تغيير حالة توفر الطبق بنجاح!");
      }
    } catch (e) {
      showToast("تم تحديث حالة التوفر.");
    }
  };

  // فتح نافذة ربط أو رفع ريلز جديد للطبق
  const handleOpenReelUpload = (dish: DishItem) => {
    setSelectedDishForReel(dish);
    setReelModalMode("upload");
    setIsReelModalOpen(true);
  };

  // فتح نافذة مشاهدة ومعاينة الريلز المباشر للطبق
  const handleOpenReelWatch = (dish: DishItem) => {
    setSelectedDishForReel(dish);
    setReelModalMode("watch");
    setIsReelModalOpen(true);
  };

  // تحديث بيانات الطبق فور حفظ الريلز
  const handleReelSaved = (dishId: string, reelData: any) => {
    setDishes((prev) =>
      prev.map((d) =>
        d.id === dishId
          ? {
              ...d,
              reel_url: reelData.video_url,
              reel_title: reelData.title,
              reel_likes: reelData.likes_count || 120,
              reel_views: reelData.views_count || 450,
            }
          : d
      )
    );
    showToast("تم نشر وربط فيديو الريلز بالطبق بنجاح! 🎬✨");
  };

  // تبديل اختيار إضافة معينة
  const toggleModifier = (name: string) => {
    setSelectedModifiers((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  // حفظ الطبق (إضافة أو تعديل)
  const handleSaveDish = async () => {
    if (!formName.trim()) {
      showToast("يرجى إدخال اسم الطبق.", "error");
      return;
    }
    if (formPrice <= 0) {
      showToast("يرجى إدخال سعر صحيح للطبق.", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formName,
        description: formDescription,
        base_price: formPrice,
        servings_count: formServings,
        prep_time_minutes: formPrepTime,
        is_available: true,
        variants: [
          { name: "وسط", price: formPrice },
          { name: "عائلي", price: Math.round(formPrice * 1.4) },
        ],
      };

      if (editingDishId && !editingDishId.startsWith("dish-")) {
        const res = await merchantApi.updateProduct(token, editingDishId, payload);
        if (res.success && res.product) {
          setDishes((prev) =>
            prev.map((d) => (d.id === editingDishId ? { ...d, ...res.product } : d))
          );
        }
      } else {
        const res = await merchantApi.createProduct(token, payload);
        if (res.success && res.product) {
          setDishes((prev) => [res.product, ...prev]);
        } else {
          const newDish: DishItem = {
            id: `dish-${Date.now()}`,
            name: formName,
            description: formDescription,
            base_price: formPrice,
            category_name: formCategory,
            is_available: true,
            prep_time_minutes: formPrepTime,
            servings_count: formServings,
            requires_preorder: formPrepTime >= 90,
            image_url: "/images/assets/dish-tagine.jpg",
          };
          setDishes((prev) => [newDish, ...prev]);
        }
      }

      showToast("تم حفظ الطبق وإضافته لقائمة طعام متجرك بنجاح! 🍲");
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء الحفظ.", "error");
    } finally {
      setSaving(false);
    }
  };

  // حذف طبق
  const handleDeleteDish = async (dishId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الطبق من القائمة؟")) return;

    setDishes((prev) => prev.filter((d) => d.id !== dishId));
    try {
      if (!dishId.startsWith("dish-")) {
        await merchantApi.deleteProduct(token, dishId);
      }
      showToast("تم حذف الطبق من القائمة.");
    } catch (e) {
      showToast("تم حذف الطبق من القائمة.");
    }
  };

  // Filter dishes
  const filteredDishes = dishes.filter((dish) => {
    const matchesCat =
      selectedCategory === "الكل" ||
      dish.category_name?.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      !searchQuery.trim() ||
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#faf5eb] text-[#3a2818] font-sans selection:bg-[#d32f2f] selection:text-white">
      {/* =========================================================================
          Main Content Column
         ========================================================================= */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden relative">
        {/* Top Header Bar */}
        <div className="w-full bg-[#f6edd9] border-b border-[#e6d6bc] px-6 py-3.5 flex items-center justify-between shadow-xs z-10">
          {/* Header Left: Notifications, Profile */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => showToast("لا توجد إشعارات جديدة حالياً")}
              className="relative p-2 rounded-2xl bg-[#fffdfa] border border-[#e8dac1] hover:border-[#d32f2f] text-[#5c3a16] shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Bell className="w-5 h-5 text-[#8c2b18]" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#d32f2f] text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow">
                3
              </span>
            </button>

            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#fffdfa] border border-[#e8dac1] shadow-xs">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#d97706]/40">
                <Image
                  src="/images/assets/chef-logo.jpg"
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs font-black text-[#3a2818] leading-tight">
                  أحمد محمود
                </span>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  مدير المتجر
                </span>
              </div>
            </div>
          </div>

          {/* Header Right: Store Title & Icon */}
          <div className="flex items-center gap-2.5">
            <span className="text-sm md:text-base font-black text-[#3a2818]">
              {storeName}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#8c2b18]/10 border border-[#8c2b18]/20 flex items-center justify-center text-[#8c2b18]">
              <Store className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold animate-bounce ${
              toastMessage.type === "success"
                ? "bg-emerald-600 text-white border border-emerald-400"
                : "bg-red-600 text-white border border-red-400"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-200" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="p-6 space-y-6">
          {/* Action & Filter Bar */}
          <div className="bg-[#fffdf9] border-2 border-[#eddcc4] rounded-3xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الأطباق..."
                className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white text-xs font-bold text-[#3a2818] rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none focus:ring-2 focus:ring-[#d32f2f]/15 py-2.5 pr-9 pl-3 text-right transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-[#8c2b18] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-[#d32f2f] text-white shadow-md shadow-red-900/20"
                      : "bg-[#fffdfa] border-2 border-[#eddcc4] text-[#5c3a16] hover:bg-amber-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Add New Dish Button */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#d32f2f] to-[#b71c1c] text-white text-xs font-black shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all cursor-pointer mr-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إضافة طبق جديد</span>
            </button>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDishes.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-[#fffdf9] border-2 border-dashed border-[#e6d6bc] rounded-3xl">
                <p className="text-sm font-bold text-stone-500">
                  لا توجد أطباق تطابق البحث المختار حالياً.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="mt-3 text-xs font-bold text-[#d32f2f] hover:underline cursor-pointer"
                >
                  اضغط هنا لإضافة طبق جديد إلى المنيو
                </button>
              </div>
            ) : (
              filteredDishes.map((dish) => (
                <div
                  key={dish.id}
                  className={`bg-[#fffefb] border-2 rounded-3xl p-4.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                    dish.is_available
                      ? "border-[#eddcc4] hover:border-[#d97706]/60"
                      : "border-stone-300 opacity-70 bg-stone-50"
                  }`}
                >
                  <div>
                    {/* Dish Image with Price Badge */}
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden border-2 border-[#eddcc4] shadow-xs mb-3">
                      <Image
                        src={dish.image_url || "/images/assets/dish-tagine.jpg"}
                        alt={dish.name}
                        fill
                        className="object-cover"
                      />
                      {/* Price Badge */}
                      <div className="absolute top-2.5 right-2.5 bg-[#8c2b18] text-white text-xs font-black px-3 py-1 rounded-xl shadow-md border border-amber-300/30">
                        {dish.base_price} ج.م
                      </div>

                      {/* Reel Available Watch Badge */}
                      {dish.reel_url && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReelWatch(dish);
                          }}
                          className="absolute top-2.5 left-2.5 bg-gradient-to-r from-red-600 to-amber-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-lg border border-white/40 flex items-center gap-1 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          <Film className="w-3 h-3 fill-white" />
                          <span>شاهد الريلز 🎬</span>
                        </button>
                      )}

                      {/* Category Badge */}
                      {dish.category_name && (
                        <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                          {dish.category_name}
                        </div>
                      )}
                    </div>

                    {/* Dish Name & Description */}
                    <h3 className="text-base font-black text-[#3a2818] mb-1">
                      {dish.name}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-3">
                      {dish.description}
                    </p>

                    {/* Info Pills */}
                    <div className="flex flex-wrap gap-2 mb-3 text-[11px] font-bold text-[#5c3a16]">
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#e67e22]" />
                        {dish.servings_count || "3-4 أفراد"}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-1 text-blue-900">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        تجهيز: {dish.prep_time_minutes} دقيقة
                      </span>
                      {dish.requires_preorder && (
                        <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-rose-600" />
                          حجز مسبق
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Availability Toggle & Action Buttons */}
                  <div className="pt-3 border-t border-[#f2e5d3] space-y-2.5">
                    {/* Availability Switch */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#3a2818]">
                        {dish.is_available ? "متاح للطلب اليوم" : "غير متوفر اليوم"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(dish.id)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          dish.is_available ? "bg-emerald-600" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            dish.is_available ? "right-1" : "right-6"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Action Buttons: Edit, Delete, Reels */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(dish)}
                        className="flex-1 py-1.5 rounded-xl border border-[#eddcc4] hover:bg-amber-50 text-[#5c3a16] text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDish(dish.id)}
                        className="py-1.5 px-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="حذف الطبق"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenReelUpload(dish)}
                        className={`flex-1 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          dish.reel_url
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 hover:bg-emerald-500/20"
                            : "bg-amber-500/10 border-amber-500/30 text-[#8c2b18] hover:bg-amber-500/20"
                        }`}
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>{dish.reel_url ? "تعديل الريلز" : "ربط ريلز"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto py-3 px-6 bg-[#f6edd9] border-t border-[#e6d6bc] flex items-center justify-between text-xs font-bold text-stone-600">
          <span>2025 © حواديت | جميع الحقوق محفوظة</span>
          <span className="text-[#8c2b18] font-black">حواديت لي .. لكل أكلة حكاية</span>
        </div>
      </div>

      {/* =========================================================================
          Right Sidebar (Fixed in RTL layout on the right)
         ========================================================================= */}
      <aside className="w-60 h-screen bg-[#38140c] text-white flex flex-col justify-between shrink-0 shadow-2xl relative select-none">
        <div>
          {/* Logo Banner */}
          <div className="relative w-full h-32 border-b border-amber-900/40 overflow-hidden">
            <Image
              src="/images/assets/chef-logo.jpg"
              alt="Hawadeet Logo"
              fill
              className="object-cover"
            />
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1.5 text-xs font-black">
            {/* 1. الرئيسية */}
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>الرئيسية</span>
            </button>

            {/* 2. الطلبات */}
            <button
              type="button"
              onClick={() => onNavigate("orders")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="w-4 h-4 text-amber-400" />
                <span>الطلبات</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-[#d32f2f] text-white text-[10px] font-black flex items-center justify-center">
                12
              </span>
            </button>

            {/* 3. قائمة الطعام (Active) */}
            <button
              type="button"
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl bg-[#d32f2f] text-white shadow-lg cursor-pointer text-right"
            >
              <UtensilsCrossed className="w-4 h-4 text-white" />
              <span>قائمة الطعام</span>
            </button>

            {/* 4. العملاء */}
            <button
              type="button"
              onClick={() => showToast("شاشة سجل العملاء قيد التطوير")}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>العملاء</span>
            </button>

            {/* 5. الإعدادات */}
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>الإعدادات</span>
            </button>

            {/* 6. تسجيل الخروج */}
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-2xl text-red-300 hover:bg-red-950/40 transition-all cursor-pointer text-right"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>تسجيل الخروج</span>
            </button>
          </nav>
        </div>

        {/* Decorative Egyptian Silhouette at Bottom */}
        <div className="relative w-full h-36 border-t border-amber-900/40 opacity-80">
          <Image
            src="/images/assets/pharaoh-art.jpg"
            alt="Egyptian Art"
            fill
            className="object-cover"
          />
        </div>
      </aside>

      {/* =========================================================================
          MODAL: إضافة / تعديل طبق (Add/Edit Dish Modal)
         ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#fefcf7] border-2 border-[#e3d0b1] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-right max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e8d7be]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#3a2818]">
                  {editingDishId ? "تعديل بيانات الطبق" : "إضافة طبق جديد للمنيو"}
                </h3>
                <span className="p-1.5 bg-amber-100 text-[#8c2b18] rounded-xl">
                  <UtensilsCrossed className="w-5 h-5" />
                </span>
              </div>
            </div>

            {/* Modal Form */}
            <div className="my-4 space-y-4 text-xs font-bold text-[#3a2818]">
              {/* Dish Name */}
              <div>
                <label className="block mb-1 font-black">اسم الطبق</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: محشي مشكل بيتي بالسمنة البلدي"
                  className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-2.5 text-right transition-all"
                  autoFocus
                />
              </div>

              {/* Dish Description */}
              <div>
                <label className="block mb-1 font-black">وصف الطبق والمكونات</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="اكتب وصفاً جذاباً للطبق ومكوناته..."
                  rows={2}
                  className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-2.5 text-right resize-none transition-all"
                />
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-black">السعر الأساسي (ج.م)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-2.5 text-center font-black transition-all"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-black">القسم</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-2.5 text-right font-bold transition-all"
                  >
                    <option value="طواجن">طواجن</option>
                    <option value="محاشي">محاشي</option>
                    <option value="حلويات">حلويات</option>
                    <option value="مشويات">مشويات</option>
                    <option value="وجبات عائلية">وجبات عائلية</option>
                  </select>
                </div>
              </div>

              {/* Servings & Prep Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-black">عدد الأفراد</label>
                  <select
                    value={formServings}
                    onChange={(e) => setFormServings(e.target.value)}
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-2.5 text-right font-bold transition-all"
                  >
                    <option value="فرد واحد">فرد واحد</option>
                    <option value="يكفي فردين">يكفي فردين</option>
                    <option value="3-4 أفراد">3-4 أفراد</option>
                    <option value="عائلي (5-6 أفراد)">عائلي (5-6 أفراد)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-black">وقت التحضير (دقيقة)</label>
                  <select
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(Number(e.target.value))}
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-2.5 text-right font-bold transition-all"
                  >
                    <option value={30}>30 دقيقة</option>
                    <option value={45}>45 دقيقة</option>
                    <option value={60}>60 دقيقة (ساعة)</option>
                    <option value={90}>90 دقيقة (ساعة ونصف)</option>
                    <option value={120}>120 دقيقة (ساعتان)</option>
                  </select>
                </div>
              </div>

              {/* Modifiers & Add-ons */}
              <div>
                <label className="block mb-1.5 font-black">خيارات وإضافات الطبق</label>
                <div className="flex flex-wrap gap-2">
                  {["أرز أبيض", "أرز بسمتي", "أرز بالشعرية", "سلطة خضراء", "شطة إضافية", "ليمون ومخلل"].map((mod) => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModifier(mod)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedModifiers.includes(mod)
                          ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                          : "bg-white border-[#eddcc4] text-[#5c3a16] hover:bg-amber-50"
                      }`}
                    >
                      {mod} {selectedModifiers.includes(mod) && "✓"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#e8d7be]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-[#5c3a16] text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDish}
                className="flex-2 py-2.5 rounded-2xl bg-[#d32f2f] hover:bg-[#b71c1c] active:scale-95 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات في المنيو"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reel Modal (Upload & Watch modes) */}
      <ReelModal
        isOpen={isReelModalOpen}
        mode={reelModalMode}
        dish={selectedDishForReel}
        token={token}
        onClose={() => setIsReelModalOpen(false)}
        onReelSaved={handleReelSaved}
      />
    </div>
  );
}
