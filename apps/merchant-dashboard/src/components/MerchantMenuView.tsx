"use client";

import React, { useState, useEffect } from "react";
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
  Home,
  ShoppingBag,
  UtensilsCrossed,
  BarChart2,
  Settings,
  Headphones,
  LogOut,
  ChevronDown,
  Bell,
  Save,
  Calendar,
} from "lucide-react";
import { merchantApi } from "@/lib/api";

interface DishItem {
  id: string;
  name: string;
  description: string;
  base_price: number;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  is_available: boolean;
  prep_time_minutes: number;
  servings_count: string;
  requires_preorder: boolean;
  variants?: Array<{ id?: string; name: string; price: number; is_available?: boolean }>;
  modifier_groups?: Array<{ id?: string; name: string; items: Array<{ id?: string; name: string; additional_price: number }> }>;
}

interface MerchantMenuViewProps {
  token: string;
  storeName?: string;
  user?: any;
  onNavigate: (view: "settings" | "menu") => void;
  onLogout: () => void;
}

const INITIAL_DISHES: DishItem[] = [
  {
    id: "dish-1",
    name: "محشي مشكل بيتي بالسمنة البلدي",
    description: "محشي مشكل بيتي بالسمنة البلدي الفاخرة",
    base_price: 180,
    category_name: "محاشي",
    is_available: true,
    prep_time_minutes: 90,
    servings_count: "3-4 أفراد",
    requires_preorder: true,
    variants: [{ name: "وسط", price: 180 }, { name: "عائلي", price: 250 }],
  },
  {
    id: "dish-2",
    name: "طاجن بامية بلدي باللحمة الضاني",
    description: "طاجن بامية بلدي باللحمة الضاني طازجة على أصولها",
    base_price: 220,
    category_name: "طواجن",
    is_available: true,
    prep_time_minutes: 60,
    servings_count: "يكفي فردين",
    requires_preorder: false,
    variants: [{ name: "فردي", price: 140 }, { name: "وسط", price: 220 }],
  },
];

// ===== Toggle Switch =====
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-emerald-500" : "bg-gray-300"
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${checked ? "-translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// ===== Dish Card =====
function DishCard({
  dish,
  onEdit,
  onDelete,
  onToggle,
  onReels,
}: {
  dish: DishItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onReels: () => void;
}) {
  return (
    <div className={`relative bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-all hover:shadow-md ${dish.is_available ? "border-[#e8d8c4]" : "border-gray-200 opacity-70"}`}>
      {/* Price Badge */}
      <div className="absolute top-3 right-3 z-10 bg-[#d32f2f] text-white text-xs font-black px-2 py-1 rounded-xl shadow">
        {dish.base_price} ج.م
      </div>

      {/* Image Area */}
      <div className="h-32 bg-gradient-to-br from-[#f5e6d0] to-[#e8d0b0] flex items-center justify-center">
        {dish.image_url ? (
          <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl opacity-50">🍲</span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-black text-[#3a2818] text-sm leading-tight mb-1 line-clamp-2">{dish.name}</h3>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-2">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{dish.servings_count}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{dish.prep_time_minutes} دقيقة</span>
        </div>
        {dish.requires_preorder && (
          <div className="flex items-center gap-1 text-amber-600 text-[10px] font-bold mb-2">
            <Calendar className="w-3 h-3" />
            <span>يتطلب حجز مسبق قبله بيوم</span>
          </div>
        )}

        {/* Availability Toggle */}
        <div className="flex items-center justify-between mb-3">
          <ToggleSwitch checked={dish.is_available} onChange={onToggle} />
          <span className={`text-[11px] font-bold ${dish.is_available ? "text-emerald-600" : "text-gray-400"}`}>
            {dish.is_available ? "متاح اليوم" : "غير متاح"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReels}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 text-[10px] font-bold transition-colors border border-purple-200"
          >
            <Film className="w-3 h-3" />
            <span>ربط ريلز</span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold transition-colors border border-blue-200"
          >
            <Edit2 className="w-3 h-3" />
            <span>تعديل</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 text-[10px] font-bold transition-colors border border-red-200"
          >
            <Trash2 className="w-3 h-3" />
            <span>حذف</span>
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formPrice, setFormPrice] = useState<number>(100);
  const [formCategory, setFormCategory] = useState<string>("أطباق رئيسية");
  const [formServings, setFormServings] = useState<string>("3-4 أفراد");
  const [formPrepTime, setFormPrepTime] = useState<number>(60);
  const [formVariants, setFormVariants] = useState<Array<{ name: string; price: number }>>([
    { name: "وسط", price: 100 },
    { name: "عائلي", price: 140 },
  ]);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // جلب قائمة الطعام بـ Eager Loading
  useEffect(() => {
    let isMounted = true;
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const res = await merchantApi.getMenu(token);
        if (res.success && isMounted) {
          if (res.products && res.products.length > 0) setDishes(res.products);
          if (res.categories && res.categories.length > 0) {
            setCategories(["الكل", ...Array.from(new Set(res.categories.map((c: any) => c.name)))]);
          }
        }
      } catch (err) {
        console.error("فشل جلب قائمة الطعام:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMenu();
    return () => { isMounted = false; };
  }, [token]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenAddModal = () => {
    setEditingDishId(null);
    setFormName(""); setFormDescription(""); setFormPrice(100);
    setFormCategory("أطباق رئيسية"); setFormServings("3-4 أفراد"); setFormPrepTime(60);
    setFormVariants([{ name: "وسط", price: 100 }, { name: "عائلي", price: 140 }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dish: DishItem) => {
    setEditingDishId(dish.id);
    setFormName(dish.name); setFormDescription(dish.description || "");
    setFormPrice(dish.base_price); setFormCategory(dish.category_name || "أطباق رئيسية");
    setFormServings(dish.servings_count || "3-4 أفراد"); setFormPrepTime(dish.prep_time_minutes || 60);
    setFormVariants(dish.variants?.map(v => ({ name: v.name, price: v.price })) || [{ name: "وسط", price: dish.base_price }]);
    setIsModalOpen(true);
  };

  const handleToggleAvailability = async (dishId: string) => {
    setDishes((prev) => prev.map((d) => d.id === dishId ? { ...d, is_available: !d.is_available } : d));
    try {
      await merchantApi.toggleProductAvailability(token, dishId);
    } catch (e) {}
    showToast("تم تغيير حالة توفر الطبق!");
  };

  const handleSaveDish = async () => {
    if (!formName.trim()) { showToast("يرجى إدخال اسم الطبق.", "error"); return; }
    if (formPrice <= 0) { showToast("يرجى إدخال سعر صحيح.", "error"); return; }
    try {
      setSaving(true);
      const payload = {
        name: formName, description: formDescription, base_price: formPrice,
        servings_count: formServings, prep_time_minutes: formPrepTime, is_available: true,
        variants: formVariants,
      };
      if (editingDishId && !editingDishId.startsWith("dish-")) {
        const res = await merchantApi.updateProduct(token, editingDishId, payload);
        if (res.success && res.product) setDishes((prev) => prev.map((d) => d.id === editingDishId ? { ...d, ...res.product } : d));
      } else {
        const res = await merchantApi.createProduct(token, payload);
        if (res.success && res.product) {
          setDishes((prev) => [res.product, ...prev]);
        } else {
          const newDish: DishItem = { id: `dish-${Date.now()}`, name: formName, description: formDescription, base_price: formPrice, category_name: formCategory, is_available: true, prep_time_minutes: formPrepTime, servings_count: formServings, requires_preorder: formPrepTime >= 90, variants: formVariants };
          setDishes((prev) => [newDish, ...prev]);
        }
      }
      showToast("تم حفظ الطبق بنجاح! 🍲");
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || "خطأ أثناء الحفظ.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطبق؟")) return;
    setDishes((prev) => prev.filter((d) => d.id !== dishId));
    try { await merchantApi.deleteProduct(token, dishId); } catch (e) {}
    showToast("تم حذف الطبق.");
  };

  const filteredDishes = dishes.filter((dish) => {
    const matchesCat = selectedCategory === "الكل" || dish.category_name?.includes(selectedCategory);
    const matchesSearch = !searchQuery.trim() || dish.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const NAV_ITEMS = [
    { id: "main", label: "الرئيسية", icon: Home, badge: null },
    { id: "orders", label: "الطلبات", icon: ShoppingBag, badge: 12 },
    { id: "menu", label: "قائمة الطعام", icon: UtensilsCrossed, badge: null },
    { id: "customers", label: "العملاء", icon: Users, badge: null },
    { id: "reports", label: "التقارير والإحصائيات", icon: BarChart2, badge: null },
    { id: "settings", label: "الإعدادات", icon: Settings, badge: null },
    { id: "support", label: "الدعم والمساعدة", icon: Headphones, badge: null },
  ];

  return (
    <div className="flex h-screen w-full bg-[#f5ede0] overflow-hidden" dir="rtl">

      {/* ===== Toast ===== */}
      {toastMessage && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold border animate-bounce ${
          toastMessage.type === "success" ? "bg-emerald-600 text-white border-emerald-400" : "bg-red-600 text-white border-red-400"
        }`}>
          {toastMessage.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
        </div>
      )}

      {/* ===== SIDEBAR ===== */}
      <aside className="w-48 shrink-0 flex flex-col bg-gradient-to-b from-[#5c1a1a] via-[#7a2222] to-[#8b4513] shadow-2xl overflow-y-auto">
        <div className="flex flex-col items-center py-5 px-3 border-b border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-2 shadow-inner">
            <span className="text-3xl">🍲</span>
          </div>
          <span className="text-white font-black text-sm">حواديتلي</span>
          <span className="text-white/60 text-[10px]">لوحة تحكم التاجر</span>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === "menu";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === "settings") onNavigate("settings");
                  else if (item.id === "menu") onNavigate("menu");
                  else if (item.id === "orders") showToast("صفحة الطلبات الحية قادمة قريباً! 📋");
                  else showToast(`${item.label} قادمة قريباً!`);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-right text-xs font-bold transition-all ${
                  isActive ? "bg-white text-[#8b1e1e] shadow-md" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button type="button" onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-red-700/40 text-xs font-bold transition-all">
            <LogOut className="w-4 h-4 shrink-0" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="shrink-0 bg-white border-b border-[#e8d8c4] shadow-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b1e1e] to-[#c0392b] flex items-center justify-center shadow">
              <span className="text-lg">🏠</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-[#3a2818] text-sm">{storeName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span className="text-emerald-600 font-bold">متصل الآن • مفتوح ويستقبل طلبات</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => showToast("لا توجد إشعارات جديدة.")} className="relative w-9 h-9 rounded-xl bg-[#fdf0e6] hover:bg-[#fce4c8] flex items-center justify-center transition-colors">
              <Bell className="w-4 h-4 text-[#8b1e1e]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">3</span>
            </button>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-xl px-3 py-2 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a574] to-[#c0855a] flex items-center justify-center shadow">
                <span className="text-white text-xs font-black">أح</span>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-[#3a2818]">{user?.full_name || "أحمد محمود"}</div>
                <div className="text-[10px] text-gray-500">مدير المتجر</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
        </header>

        {/* Toolbar: Search + Filter + Add Button */}
        <div className="shrink-0 px-6 pt-4 pb-3 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-[#e3d0b1] rounded-2xl px-3 py-2.5 w-64 focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/15 transition-all shadow-sm">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الأطباق..."
              className="flex-1 bg-transparent text-sm text-[#3a2818] outline-none text-right"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-500">تصفية:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-[#d32f2f] text-white shadow-md"
                    : "bg-white text-[#5a3a2a] border border-[#e8d8c4] hover:bg-[#fdf0e6]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Add Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mr-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#d32f2f] text-white text-sm font-black shadow-md hover:bg-[#b71c1c] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة طبق جديد +</span>
          </button>
        </div>

        {/* Dishes Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="flex flex-col items-center gap-3 text-[#8b4513]">
                <div className="w-10 h-10 border-4 border-[#d32f2f] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold">جاري تحميل قائمة الطعام...</span>
              </div>
            </div>
          ) : filteredDishes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
              <span className="text-5xl">🍽️</span>
              <p className="text-sm font-bold">لا توجد أطباق في هذا القسم</p>
              <button type="button" onClick={handleOpenAddModal} className="text-xs font-bold text-[#d32f2f] hover:underline">+ أضف طبقك الأول الآن</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredDishes.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  onEdit={() => handleOpenEditModal(dish)}
                  onDelete={() => handleDeleteDish(dish.id)}
                  onToggle={() => handleToggleAvailability(dish.id)}
                  onReels={() => showToast("سيتم فتح نافذة ربط فيديو ريلز للطبق! 🎬")}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== ADD / EDIT MODAL ===== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          {/* Modal Box */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#e8d8c4]">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-l from-[#d32f2f] to-[#8b1e1e] rounded-t-3xl">
              <h2 className="text-white font-black text-base flex items-center gap-2">
                <span>🍲</span>
                <span>{editingDishId ? "تعديل طبق" : "إضافة / تعديل طبق"}</span>
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Section 1: Basic Info */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-[#3a2818] mb-3">
                  <span className="w-6 h-6 bg-[#d32f2f] text-white rounded-lg flex items-center justify-center text-xs font-black">1</span>
                  البيانات الأساسية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#5a3a2a] mb-1">اسم الطبق *</label>
                    <input
                      type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                      placeholder="مثال: محشي مشكل بيتي"
                      className="w-full bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2.5 text-sm font-bold text-[#3a2818] outline-none focus:border-[#d32f2f] focus:ring-2 focus:ring-[#d32f2f]/15 text-right transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a3a2a] mb-1">السعر الأساسي *</label>
                    <div className="flex items-center gap-2 bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2.5 focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/15 transition-all">
                      <span className="text-xs font-black text-[#8b1e1e]">ج.م</span>
                      <input
                        type="number" value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="flex-1 bg-transparent text-sm font-bold text-[#3a2818] outline-none text-center"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#5a3a2a] mb-1">الوصف</label>
                    <input
                      type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="وصف مختصر للطبق ومكوناته"
                      className="w-full bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2.5 text-sm text-[#3a2818] outline-none focus:border-[#d32f2f] focus:ring-2 focus:ring-[#d32f2f]/15 text-right transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a3a2a] mb-1">القسم</label>
                    <div className="flex items-center gap-2 bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2.5 focus-within:border-[#d32f2f] transition-all">
                      <select
                        value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                        className="flex-1 bg-transparent text-sm font-bold text-[#3a2818] outline-none appearance-none text-right cursor-pointer"
                      >
                        <option value="أطباق رئيسية">🍲 أطباق رئيسية</option>
                        <option value="طواجن">🥘 طواجن</option>
                        <option value="محاشي">🥬 محاشي</option>
                        <option value="مشويات">🍖 مشويات</option>
                        <option value="حلويات">🍯 حلويات</option>
                        <option value="مقبلات">🥗 مقبلات</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Home Kitchen Options */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-[#3a2818] mb-3">
                  <span className="w-6 h-6 bg-[#d32f2f] text-white rounded-lg flex items-center justify-center text-xs font-black">2</span>
                  خيارات الأكل البيتي
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#5a3a2a] mb-1">عدد الأفراد</label>
                    <div className="flex items-center gap-2 bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2.5 transition-all">
                      <select value={formServings} onChange={(e) => setFormServings(e.target.value)} className="flex-1 bg-transparent text-sm font-bold text-[#3a2818] outline-none appearance-none text-right cursor-pointer">
                        <option value="فرد واحد">👤 فرد واحد</option>
                        <option value="يكفي فردين">👫 يكفي فردين</option>
                        <option value="3-4 أفراد">👨‍👩‍👧‍👦 3-4 أفراد</option>
                        <option value="عائلي 5-7 أفراد">🏰 عائلي 5-7 أفراد</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a3a2a] mb-1">وقت التجهيز: {formPrepTime} دقيقة</label>
                    <input
                      type="range" min={20} max={180} step={5} value={formPrepTime}
                      onChange={(e) => setFormPrepTime(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#d32f2f] bg-[#f0e4d0] mt-2"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
                      <span>180 دقيقة</span>
                      <span>20 دقيقة</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Variants / Sizes */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-[#3a2818] mb-3">
                  <span className="w-6 h-6 bg-[#d32f2f] text-white rounded-lg flex items-center justify-center text-xs font-black">3</span>
                  الأحجام والأسعار
                </h3>
                <div className="space-y-2">
                  {formVariants.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text" value={v.name} onChange={(e) => setFormVariants((prev) => { const n = [...prev]; n[idx] = { ...n[idx], name: e.target.value }; return n; })}
                        placeholder="اسم الحجم (مثال: وسط)"
                        className="flex-1 bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2 text-sm font-bold text-[#3a2818] outline-none focus:border-[#d32f2f] text-right"
                      />
                      <div className="flex items-center gap-1 bg-[#fdfaf5] border border-[#e3d0b1] rounded-xl px-3 py-2 w-28 focus-within:border-[#d32f2f] transition-all">
                        <span className="text-[10px] font-black text-[#8b1e1e]">ج.م</span>
                        <input
                          type="number" value={v.price} onChange={(e) => setFormVariants((prev) => { const n = [...prev]; n[idx] = { ...n[idx], price: Number(e.target.value) }; return n; })}
                          className="w-full bg-transparent text-sm font-bold text-[#3a2818] outline-none text-center"
                        />
                      </div>
                      {formVariants.length > 1 && (
                        <button type="button" onClick={() => setFormVariants((prev) => prev.filter((_, i) => i !== idx))} className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormVariants((prev) => [...prev, { name: "", price: 0 }])}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#d32f2f] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة حجم آخر
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex items-center gap-3 px-6 py-4 bg-white border-t border-[#e8d8c4] rounded-b-3xl">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDish}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-md"
                style={{ background: "linear-gradient(to left, #d32f2f, #b71c1c)" }}
              >
                {saving ? (
                  <><span className="animate-spin inline-block">⏳</span><span>جاري الحفظ...</span></>
                ) : (
                  <><Save className="w-4 h-4" /><span>💾 حفظ التغييرات</span></>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 rounded-2xl font-black text-sm text-[#5a3a2a] bg-[#fdf0e6] hover:bg-[#fce4c8] transition-colors border border-[#e8c8a8]"
              >
                إلغاء ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
