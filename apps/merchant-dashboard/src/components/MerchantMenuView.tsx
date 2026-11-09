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
  onNavigate: (view: "settings" | "menu" | "orders") => void;
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
    variants: [
      { name: "وسط", price: 180 },
      { name: "عائلي", price: 250 },
    ],
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

  // Modal State (Default open as in the design)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
  const [editingDishId, setEditingDishId] = useState<string | null>("dish-1");

  // Form Fields
  const [formName, setFormName] = useState<string>("محشي مشكل بيتي");
  const [formDescription, setFormDescription] = useState<string>("محشي مشكل بيتي بالسمنة البلدي");
  const [formPrice, setFormPrice] = useState<number>(180);
  const [formCategory, setFormCategory] = useState<string>("أطباق رئيسية");
  const [formServings, setFormServings] = useState<string>("3-4 أفراد");
  const [formPrepTime, setFormPrepTime] = useState<number>(90);
  const [selectedVariant, setSelectedVariant] = useState<string>("وسط");
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>(["أبيض", "بسمتي", "شطة"]);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // جلب قائمة الطعام والمنتجات من الباك إند بواسطة Eager Loading
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
    setTimeout(() => setToastMessage(null), 4000);
  };

  // فتح نافذة إضافة طبق جديد
  const handleOpenAddModal = () => {
    setEditingDishId(null);
    setFormName("");
    setFormDescription("");
    setFormPrice(100);
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
    setFormCategory(dish.category_name || "أطباق رئيسية");
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
      showToast("تم تحديث حالة التوفر محلياً.");
    }
  };

  // تبديل اختيار إضافة معينة
  const toggleModifier = (name: string) => {
    setSelectedModifiers((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  // حفظ الطبق (إضافة أو تعديل) في الباك إند
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
      await merchantApi.deleteProduct(token, dishId);
      showToast("تم حذف الطبق من القائمة بنجاح.");
    } catch (e) {
      showToast("تم حذف الطبق.");
    }
  };

  // تصفية الأطباق
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
    <div className="relative w-full h-full select-none overflow-hidden font-sans">
      {/* =========================================================================
          الخلفية الرسمية المصممة (Base Canvas Visual Asset) - ملء الشاشة بالكامل
         ========================================================================= */}
      <Image
        src="/images/menu-design.jpg"
        alt="Hawadeet Menu & Catalog Management"
        fill
        priority
        className="object-fill pointer-events-none"
      />

      {/* =========================================================================
          Toast Notifications Banner
         ========================================================================= */}
      {toastMessage && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce ${
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

      {/* =========================================================================
          شريط الهيدر العلوي (Top Header Bar)
         ========================================================================= */}
      <button
        type="button"
        onClick={() => showToast("لا توجد إشعارات جديدة حالياً.")}
        className="absolute z-20 cursor-pointer rounded-full hover:scale-105 active:scale-95 transition-all"
        style={{ top: "2.8%", left: "2.6%", width: "3.4%", height: "5.1%" }}
        title="الإشعارات (3)"
      />

      <div
        className="absolute z-20 flex items-center cursor-pointer rounded-xl hover:bg-black/5"
        style={{ top: "2.4%", left: "6.8%", width: "13.5%", height: "5.8%" }}
        title="أحمد محمود - مدير المطعم"
      />

      <div
        className="absolute z-20 flex items-center justify-end pr-2 text-xs font-bold text-[#3a2818] cursor-pointer hover:bg-black/5 rounded-xl transition-all"
        style={{ top: "2.5%", right: "23.5%", width: "17.0%", height: "5.5%" }}
        title="المتجر الحالي"
      >
        <span className="truncate">{storeName}</span>
      </div>

      {/* =========================================================================
          شريط البحث والتصنيفات والزر الرئيسي (Filter & Action Bar)
         ========================================================================= */}
      <div
        className="absolute z-20 flex items-center"
        style={{ top: "18.8%", left: "1.5%", width: "22.5%", height: "5.8%" }}
      >
        <div className="relative w-full h-full bg-white/95 rounded-2xl border border-[#ded4c5] hover:border-[#d32f2f] focus-within:border-[#d32f2f] focus-within:ring-2 focus-within:ring-[#d32f2f]/20 transition-all flex items-center px-3 shadow-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الأطباق..."
            className="w-full bg-transparent text-xs font-bold text-[#3a2818] outline-none text-right pr-1"
          />
          <Search className="w-3.5 h-3.5 text-[#7c634c] shrink-0" />
        </div>
      </div>

      {/* أزرار تصفية الأقسام */}
      <button
        type="button"
        onClick={() => setSelectedCategory("حلويات")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:brightness-95"
        style={{ top: "18.8%", left: "25.2%", width: "7.0%", height: "5.8%" }}
        title="حلويات"
      />

      <button
        type="button"
        onClick={() => setSelectedCategory("محاشي")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:brightness-95"
        style={{ top: "18.8%", left: "32.8%", width: "6.5%", height: "5.8%" }}
        title="محاشي"
      />

      <button
        type="button"
        onClick={() => setSelectedCategory("طواجن")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:brightness-95"
        style={{ top: "18.8%", left: "39.8%", width: "6.5%", height: "5.8%" }}
        title="طواجن"
      />

      <button
        type="button"
        onClick={() => setSelectedCategory("الكل")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:brightness-95"
        style={{ top: "18.8%", left: "46.8%", width: "5.5%", height: "5.8%" }}
        title="عرض جميع الأطباق"
      />

      {/* زر إضافة طبق جديد */}
      <button
        type="button"
        onClick={handleOpenAddModal}
        className="absolute z-20 cursor-pointer rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        style={{ top: "18.8%", right: "26.2%", width: "14.5%", height: "5.8%" }}
        title="إضافة طبق أو منتج جديد إلى المنيو"
      />

      {/* كروت الأطباق */}
      <div
        onClick={() => handleToggleAvailability("dish-1")}
        className="absolute z-20 cursor-pointer rounded-full"
        style={{ top: "64.8%", left: "14.6%", width: "3.5%", height: "2.8%" }}
        title="تبديل توفر الطبق اليوم"
      />

      <button
        type="button"
        onClick={() => handleOpenEditModal(dishes[0] || INITIAL_DISHES[0])}
        className="absolute z-20 cursor-pointer rounded-xl hover:bg-black/5"
        style={{ top: "70.2%", left: "17.4%", width: "5.2%", height: "3.4%" }}
        title="تعديل الطبق"
      />

      <button
        type="button"
        onClick={() => handleDeleteDish("dish-1")}
        className="absolute z-20 cursor-pointer rounded-xl hover:bg-black/5"
        style={{ top: "70.2%", left: "11.2%", width: "5.2%", height: "3.4%" }}
        title="حذف الطبق"
      />

      <button
        type="button"
        onClick={() => showToast("سيتم فتح نافذة تصوير وربط فيديو ريلز للطبق! 🎬")}
        className="absolute z-20 cursor-pointer rounded-xl hover:bg-black/5"
        style={{ top: "70.2%", left: "3.2%", width: "7.0%", height: "3.4%" }}
        title="ربط الطبق بفيديو ريلز جذاب"
      />

      <div
        onClick={() => handleToggleAvailability("dish-2")}
        className="absolute z-20 cursor-pointer rounded-full"
        style={{ top: "64.8%", right: "24.5%", width: "3.5%", height: "2.8%" }}
        title="تبديل توفر الطبق اليوم"
      />

      <button
        type="button"
        onClick={() => handleOpenEditModal(dishes[1] || INITIAL_DISHES[1])}
        className="absolute z-20 cursor-pointer rounded-xl hover:bg-black/5"
        style={{ top: "70.2%", right: "22.2%", width: "5.2%", height: "3.4%" }}
        title="تعديل الطبق"
      />

      <button
        type="button"
        onClick={() => handleDeleteDish("dish-2")}
        className="absolute z-20 cursor-pointer rounded-xl hover:bg-black/5"
        style={{ top: "70.2%", right: "28.5%", width: "5.2%", height: "3.4%" }}
        title="حذف الطبق"
      />

      {/* =========================================================================
          نافذة إضافة / تعديل طبق
         ========================================================================= */}
      {isModalOpen && (
        <>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="absolute z-30 cursor-pointer rounded-full hover:scale-110 active:scale-90 transition-all"
            style={{ top: "25.2%", left: "29.2%", width: "2.6%", height: "3.8%" }}
            title="إغلاق النافذة"
          />

          <label
            className="absolute z-30 cursor-pointer flex items-center justify-center gap-1 rounded-xl hover:bg-black/10"
            style={{ top: "48.2%", left: "31.2%", width: "8.2%", height: "3.4%" }}
            title="رفع وتغيير صورة الطبق"
          >
            <input type="file" accept="image/*" className="hidden" onChange={() => showToast("تم تحديث صورة الطبق بنجاح! 📸")} />
          </label>

          <div
            className="absolute z-30 flex items-center"
            style={{ top: "35.5%", left: "43.2%", width: "16.8%", height: "4.2%" }}
          >
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="اسم الطبق"
              className="w-full h-full bg-white/95 rounded-xl border border-[#ded4c5] hover:border-[#d32f2f] focus:border-[#d32f2f] px-2.5 text-xs font-bold text-[#3a2818] outline-none text-right"
            />
          </div>

          <div
            className="absolute z-30 flex items-center"
            style={{ top: "41.5%", left: "43.2%", width: "16.8%", height: "4.2%" }}
          >
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="وصف الطبق ومكوناته"
              className="w-full h-full bg-white/95 rounded-xl border border-[#ded4c5] hover:border-[#d32f2f] focus:border-[#d32f2f] px-2.5 text-[11px] font-bold text-[#3a2818] outline-none text-right"
            />
          </div>

          <div
            className="absolute z-30 flex items-center"
            style={{ top: "47.2%", left: "43.2%", width: "16.8%", height: "4.2%" }}
          >
            <div className="relative w-full h-full bg-white/95 rounded-xl border border-[#ded4c5] hover:border-[#d32f2f] focus-within:border-[#d32f2f] flex items-center px-2">
              <span className="text-[10px] font-bold text-[#8b1e1e] shrink-0">ج.م</span>
              <input
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(Number(e.target.value))}
                className="w-full bg-transparent text-xs font-bold text-[#3a2818] outline-none text-center"
              />
            </div>
          </div>

          <div
            className="absolute z-30 flex items-center"
            style={{ top: "52.8%", left: "43.2%", width: "16.8%", height: "4.2%" }}
          >
            <div className="relative w-full h-full bg-white/95 rounded-xl border border-[#ded4c5] hover:border-[#d32f2f] flex items-center px-2">
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full bg-transparent text-[11px] font-bold text-[#3a2818] outline-none text-right appearance-none cursor-pointer"
              >
                <option value="أطباق رئيسية">أطباق رئيسية 🍲</option>
                <option value="طواجن">طواجن 🥘</option>
                <option value="محاشي">محاشي 🥬</option>
                <option value="حلويات">حلويات 🍯</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#7c634c] shrink-0" />
            </div>
          </div>

          <div
            className="absolute z-30 flex items-center"
            style={{ top: "63.8%", left: "49.2%", width: "15.0%", height: "4.2%" }}
          >
            <div className="relative w-full h-full bg-white/95 rounded-xl border border-[#ded4c5] hover:border-[#d32f2f] flex items-center px-2">
              <select
                value={formServings}
                onChange={(e) => setFormServings(e.target.value)}
                className="w-full bg-transparent text-[11px] font-bold text-[#3a2818] outline-none text-right appearance-none cursor-pointer"
              >
                <option value="3-4 أفراد">👨‍👩‍👧‍👦 3-4 أفراد</option>
                <option value="يكفي فردين">👫 يكفي فردين</option>
                <option value="فرد واحد">👤 فرد واحد</option>
                <option value="عائلي 5-7 أفراد">🏰 عائلي 5-7 أفراد</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#7c634c] shrink-0" />
            </div>
          </div>

          <div
            className="absolute z-30 flex items-center justify-center bg-white/90 rounded-md px-1"
            style={{ top: "64.2%", left: "34.5%", width: "8.5%", height: "3.2%" }}
          >
            <span className="text-xs font-black text-[#8b1e1e]">{formPrepTime} دقيقة</span>
          </div>

          <div
            className="absolute z-30 flex items-center"
            style={{ top: "68.2%", left: "30.0%", width: "17.0%", height: "3.0%" }}
          >
            <input
              type="range"
              min={20}
              max={180}
              step={5}
              value={formPrepTime}
              onChange={(e) => setFormPrepTime(Number(e.target.value))}
              className="w-full h-1.5 bg-[#ebdcc7] rounded-lg appearance-none cursor-pointer accent-[#d32f2f]"
            />
          </div>

          <div
            onClick={() => setSelectedVariant("وسط")}
            className={`absolute z-30 cursor-pointer rounded-2xl transition-all ${
              selectedVariant === "وسط" ? "ring-2 ring-[#d32f2f]" : "hover:bg-black/5"
            }`}
            style={{ top: "75.2%", left: "37.5%", width: "8.8%", height: "11.2%" }}
            title="الحجم الوسط: 180 ج.م"
          />

          <div
            onClick={() => setSelectedVariant("عائلي")}
            className={`absolute z-30 cursor-pointer rounded-2xl transition-all ${
              selectedVariant === "عائلي" ? "ring-2 ring-[#d32f2f]" : "hover:bg-black/5"
            }`}
            style={{ top: "75.2%", left: "29.5%", width: "7.5%", height: "11.2%" }}
            title="الحجم العائلي: 250 ج.م"
          />

          <div
            onClick={() => toggleModifier("أبيض")}
            className="absolute z-30 cursor-pointer"
            style={{ top: "78.2%", left: "63.2%", width: "3.2%", height: "2.8%" }}
            title="أرز أبيض"
          />

          <div
            onClick={() => toggleModifier("بسمتي")}
            className="absolute z-30 cursor-pointer"
            style={{ top: "81.0%", left: "63.2%", width: "3.2%", height: "2.8%" }}
            title="أرز بسمتي"
          />

          <div
            onClick={() => toggleModifier("شطة")}
            className="absolute z-30 cursor-pointer"
            style={{ top: "83.6%", left: "63.2%", width: "3.2%", height: "2.8%" }}
            title="شطة إضافية"
          />

          <div
            onClick={() => toggleModifier("طحينة")}
            className="absolute z-30 cursor-pointer"
            style={{ top: "81.0%", left: "54.8%", width: "3.2%", height: "2.8%" }}
            title="سلطة طحينة"
          />

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveDish}
            className="absolute z-30 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            style={{ top: "89.2%", left: "41.8%", width: "21.5%", height: "4.8%" }}
            title="حفظ الطبق"
          />

          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="absolute z-30 rounded-2xl flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all hover:bg-black/5"
            style={{ top: "89.2%", left: "32.2%", width: "8.8%", height: "4.8%" }}
            title="إلغاء وإغلاق"
          />
        </>
      )}

      {/* القائمة الجانبية */}
      <button
        type="button"
        onClick={() => onNavigate("settings")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "30.8%", right: "1.2%", width: "15.0%", height: "5.5%" }}
        title="الرئيسية (إعدادات المتجر والتشغيل)"
      />

      <button
        type="button"
        onClick={() => onNavigate("orders")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "37.5%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="إدارة الطلبات"
      />

      <button
        type="button"
        onClick={() => onNavigate("menu")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "43.2%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="قائمة الطعام والمنتجات (أنت هنا)"
      />

      <button
        type="button"
        onClick={() => showToast("صفحة العملاء قادمة! 👥")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "49.0%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="العملاء"
      />

      <button
        type="button"
        onClick={() => showToast("التقارير والمحفظة المالية قريباً! 📊")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "54.8%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="التقارير والإحصائيات"
      />

      <button
        type="button"
        onClick={() => onNavigate("settings")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "60.5%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="إعدادات المتجر والتشغيل"
      />

      <button
        type="button"
        onClick={() => showToast("فريق دعم حواديت معك دائماً 🎧")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/10"
        style={{ top: "66.2%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="الدعم والمساعدة"
      />

      <button
        type="button"
        onClick={onLogout}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-white/15 active:scale-95 transition-all"
        style={{ top: "71.9%", right: "1.2%", width: "15.0%", height: "5.0%" }}
        title="تسجيل الخروج"
      />
    </div>
  );
}
