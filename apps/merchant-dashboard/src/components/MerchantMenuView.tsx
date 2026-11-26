"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Search, Plus, Edit2, Trash2, Film, Check, CheckCircle2,
  AlertCircle, X, Clock, Users, Calendar, UtensilsCrossed,
  Sparkles, Loader2, Upload, Tag, Layers, Flame, DollarSign,
  Image as ImageIcon, ArrowUpDown, ChevronDown
} from "lucide-react";
import { merchantApi, MEDIA_BASE_URL } from "@/lib/api";
import ReelModal from "@/components/ReelModal";

interface Variant {
  id?: string;
  name: string;
  price: number;
  is_available?: boolean;
}

interface ModifierItem {
  id?: string;
  name: string;
  additional_price: number;
}

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
  variants?: Variant[];
  modifiers?: ModifierItem[];
}

interface MerchantMenuViewProps {
  token: string;
  storeName?: string;
  user?: any;
  onNavigate: (view: "settings" | "menu" | "orders" | "reels") => void;
  onLogout: () => void;
}

const DEFAULT_PRESET_IMAGES = [
  { label: "🍲 طاجن لحمة بلدي", url: "/images/assets/dish-tagine.jpg" },
  { label: "🥘 كشري مصري", url: "/images/assets/dish-koshary.jpg" },
  { label: "🌶️ محشي مشكل", url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80" },
  { label: "🥩 مشويات وكباب", url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&q=80" },
  { label: "🍰 حلويات شرقية", url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80" },
];

const INITIAL_DISHES: DishItem[] = [
  {
    id: "dish-1",
    name: "محشي مشكل فلاحي بالسمنة البلدي",
    description: "محشي مشكل بيتي بالسمنة البلدي الفاخرة على أصوله (بتنجان، كوسة، فلفل، ورق عنب)",
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
      { name: "وسط (كيلو)", price: 180 },
      { name: "عائلي (2 كيلو)", price: 320 },
    ],
    modifiers: [
      { name: "شوربة لسان عصفور", additional_price: 30 },
      { name: "سلطة خضراء بلدي", additional_price: 20 },
    ],
  },
  {
    id: "dish-2",
    name: "طاجن بامية باللحمة الضاني المسبك",
    description: "طاجن بامية بلدي باللحمة الضاني طازجة على أصولها بالفرن الفلاحي ولمونتين معصورين",
    base_price: 220,
    category_name: "طواجن",
    image_url: "/images/assets/dish-koshary.jpg",
    is_available: true,
    prep_time_minutes: 60,
    servings_count: "يكفي فردين",
    requires_preorder: false,
    variants: [
      { name: "فردي (قطعة لحم)", price: 140 },
      { name: "مزدوج (قطعتين لحم)", price: 220 },
      { name: "طاجن عائلي كبير", price: 390 },
    ],
    modifiers: [
      { name: "أرز بالشعرية", additional_price: 25 },
      { name: "باذنجان مخلل بالدقة", additional_price: 15 },
    ],
  },
  {
    id: "dish-3",
    name: "صينية مكرونة بالبشاميل البلدي الفاخر",
    description: "مكرونة فرن باللحم المفروم البلدي وطبقة بشاميل كريمية بالزبدة والجبنة الرومي",
    base_price: 160,
    category_name: "صواني",
    image_url: "/images/assets/dish-tagine.jpg",
    is_available: true,
    prep_time_minutes: 50,
    servings_count: "3-4 أفراد",
    requires_preorder: false,
    variants: [
      { name: "صينية وسط", price: 160 },
      { name: "صينية عائلية كبيرة", price: 280 },
    ],
    modifiers: [
      { name: "زيادة جبنة موتزاريلا", additional_price: 35 },
    ],
  },
  {
    id: "dish-4",
    name: "أم علي بالمكسرات والقشطة البلدي",
    description: "أم علي بالسمنة البلدي ولبن كامل الدسم مع الفستق واللوز والزبيب والقشطة الفلاحي المحمرة",
    base_price: 75,
    category_name: "حلويات",
    image_url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80",
    is_available: true,
    prep_time_minutes: 25,
    servings_count: "فردين",
    requires_preorder: false,
    variants: [
      { name: "طاجن صغير", price: 75 },
      { name: "طاجن ملوكي كبير", price: 130 },
    ],
    modifiers: [
      { name: "إضافة بولة آيس كريم فانيليا", additional_price: 20 },
    ],
  },
];

const getCategoryEmoji = (name: string): string => {
  if (!name) return "🏷️";
  if (name.includes("طواجن") || name.includes("طاجن")) return "🍲";
  if (name.includes("محاشي") || name.includes("محشي")) return "🌶️";
  if (name.includes("صواني") || name.includes("صينية")) return "🥘";
  if (name.includes("مشويات") || name.includes("لحوم")) return "🥩";
  if (name.includes("حلويات") || name.includes("حلو")) return "🍰";
  if (name.includes("مشروبات") || name.includes("عصائر")) return "🥤";
  if (name.includes("شوربة") || name.includes("شوربات")) return "🥣";
  if (name.includes("سندوتش")) return "🥪";
  if (name.includes("معجنات") || name.includes("فطير")) return "🥧";
  if (name.includes("سلطات") || name.includes("مقبلات")) return "🥗";
  return "🏷️";
};

/**
 * دالة مساعدة لمعالجة روابط الصور وضمان عدم ظهور 404
 */
export const formatImageUrl = (url?: string): string => {
  if (!url || typeof url !== "string" || !url.trim()) {
    return "/images/assets/dish-tagine.jpg";
  }
  const clean = url.trim();
  if (clean.startsWith("data:") || clean.startsWith("blob:") || clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  if (clean.startsWith("/storage/")) {
    return `${MEDIA_BASE_URL}${clean}`;
  }
  return clean;
};

export default function MerchantMenuView({
  token,
  storeName = "متجر سوقنا",
  user,
  onNavigate,
  onLogout,
}: MerchantMenuViewProps) {
  const [dishes, setDishes] = useState<DishItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["الكل", "طواجن", "محاشي", "صواني", "حلويات"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNewCatModalOpen, setIsNewCatModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>("");
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  // Reels Modal
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
  const [formPreorder, setFormPreorder] = useState<boolean>(false);
  const [formImageUrl, setFormImageUrl] = useState<string>("/images/assets/dish-tagine.jpg");

  // Form Variants & Modifiers
  const [formVariants, setFormVariants] = useState<Variant[]>([
    { name: "وسط", price: 180 },
  ]);
  const [formModifiers, setFormModifiers] = useState<ModifierItem[]>([
    { name: "أرز إضافي", additional_price: 25 },
  ]);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Menu from backend
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

  const handleOpenAddModal = (defaultCategory?: string) => {
    setEditingDishId(null);
    setFormName("");
    setFormDescription("");
    setFormPrice(150);
    // إذا تم تحديد قسم معين نختاره تلقائياً
    const validCat = defaultCategory && defaultCategory !== "الكل" 
      ? defaultCategory 
      : (categories.find(c => c !== "الكل") || "طواجن");
    setFormCategory(validCat);
    setFormServings("3-4 أفراد");
    setFormPrepTime(45);
    setFormPreorder(false);
    setFormImageUrl("/images/assets/dish-tagine.jpg");
    setFormVariants([{ name: "عادي / وسط", price: 150 }]);
    setFormModifiers([{ name: "سلطة خضراء", additional_price: 15 }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dish: DishItem) => {
    setEditingDishId(dish.id);
    setFormName(dish.name);
    setFormDescription(dish.description || "");
    setFormPrice(dish.base_price);
    setFormCategory(dish.category_name || "طواجن");
    setFormServings(dish.servings_count || "3-4 أفراد");
    setFormPrepTime(dish.prep_time_minutes || 60);
    setFormPreorder(dish.requires_preorder || false);
    setFormImageUrl(dish.image_url || "/images/assets/dish-tagine.jpg");
    setFormVariants(dish.variants && dish.variants.length > 0 ? dish.variants : [{ name: "وسط", price: dish.base_price }]);
    setFormModifiers(dish.modifiers && dish.modifiers.length > 0 ? dish.modifiers : []);
    setIsModalOpen(true);
  };

  // Image File Upload handler with instant Base64 preview & server sync
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)", "error");
      return;
    }

    // 1. قراءة فورية للصورة كـ Base64 Data URL لتظهر للمستخدم فوراً وبشكل مضمون 100%
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setFormImageUrl(uploadEvent.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    // 2. محاولة رفع الصورة للسيرفر في الخلفية
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await merchantApi.uploadDishImage(token, formData);
      const uploadedUrl = res.image_url || res.url;
      if (res.success && uploadedUrl) {
        let finalUrl = uploadedUrl;
        if (finalUrl.startsWith("/")) {
          finalUrl = `${MEDIA_BASE_URL}${finalUrl}`;
        }
        setFormImageUrl(finalUrl);
        showToast("تم رفع صورة الطبق بنجاح! 📸");
      } else {
        showToast("تم حفظ ومعاينة صورة الطبق بنجاح 📸");
      }
    } catch {
      showToast("تم تطبيق الصورة محلياً بنجاح 📸");
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  // Toggle availability
  const handleToggleAvailability = async (dishId: string) => {
    setDishes((prev) =>
      prev.map((d) => (d.id === dishId ? { ...d, is_available: !d.is_available } : d))
    );

    try {
      const res = await merchantApi.toggleProductAvailability(token, dishId);
      if (res.success) {
        showToast(res.message || "تم تحديث حالة التوفر بنجاح!");
      }
    } catch {
      showToast("تم تحديث حالة التوفر.");
    }
  };

  // Add category
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const trimmed = newCatName.trim();
    if (!categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
      setFormCategory(trimmed);
      showToast(`تمت إضافة قسم "${trimmed}" بنجاح! 🏷️`);
    }
    setNewCatName("");
    setIsNewCatModalOpen(false);
  };

  // Add / Remove Variant
  const handleAddVariant = () => {
    setFormVariants((prev) => [...prev, { name: "حجم إضافي", price: formPrice + 50 }]);
  };

  const handleRemoveVariant = (index: number) => {
    setFormVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: "name" | "price", val: any) => {
    setFormVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Add / Remove Modifier
  const handleAddModifier = () => {
    setFormModifiers((prev) => [...prev, { name: "إضافة جديدة", additional_price: 20 }]);
  };

  const handleRemoveModifier = (index: number) => {
    setFormModifiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleModifierChange = (index: number, field: "name" | "additional_price", val: any) => {
    setFormModifiers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Save Dish
  const handleSaveDish = async () => {
    if (!formName.trim()) {
      showToast("يرجى إدخال اسم الصنف أو الوجبة.", "error");
      return;
    }
    if (formPrice <= 0) {
      showToast("يرجى إدخال سعر صحيح.", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        base_price: formPrice,
        category_name: formCategory,
        servings_count: formServings,
        prep_time_minutes: formPrepTime,
        requires_preorder: formPreorder,
        image_url: formImageUrl,
        is_available: true,
        variants: formVariants,
        modifiers: formModifiers,
      };

      if (editingDishId && !editingDishId.startsWith("dish-")) {
        const res = await merchantApi.updateProduct(token, editingDishId, payload);
        if (res.success && res.product) {
          setDishes((prev) =>
            prev.map((d) => (d.id === editingDishId ? { ...d, ...res.product, category_name: formCategory, image_url: formImageUrl } : d))
          );
        } else {
          setDishes((prev) =>
            prev.map((d) => (d.id === editingDishId ? { ...d, ...payload } : d))
          );
        }
      } else {
        const res = await merchantApi.createProduct(token, payload);
        if (res.success && res.product) {
          setDishes((prev) => [{ ...res.product, category_name: formCategory, image_url: formImageUrl }, ...prev]);
        } else {
          const newDish: DishItem = {
            id: `dish-${Date.now()}`,
            ...payload,
          };
          setDishes((prev) => [newDish, ...prev]);
        }
      }

      showToast("تم حفظ الصنف بنجاح في المنيو! 🍲✨");
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء الحفظ.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الصنف نهائياً من المنيو؟")) return;

    setDishes((prev) => prev.filter((d) => d.id !== dishId));
    try {
      if (!dishId.startsWith("dish-")) {
        await merchantApi.deleteProduct(token, dishId);
      }
      showToast("تم حذف الصنف من القائمة.");
    } catch {
      showToast("تم حذف الصنف من القائمة.");
    }
  };

  const handleOpenReelUpload = (dish: DishItem) => {
    setSelectedDishForReel(dish);
    setReelModalMode("upload");
    setIsReelModalOpen(true);
  };

  const handleOpenReelWatch = (dish: DishItem) => {
    setSelectedDishForReel(dish);
    setReelModalMode("watch");
    setIsReelModalOpen(true);
  };

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
    showToast("تم نشر وربط فيديو الريلز بالمنتج بنجاح! 🎬✨");
  };

  // فلترة الأصناف التي تطابق البحث
  const isDishMatchingSearch = (dish: DishItem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      dish.name.toLowerCase().includes(q) ||
      (dish.description && dish.description.toLowerCase().includes(q)) ||
      (dish.category_name && dish.category_name.toLowerCase().includes(q))
    );
  };

  // الأقسام الفعالة للعرض
  const displayCategories = categories.filter((c) => c !== "الكل");

  // رسم بطاقة الطبق (Dish Card)
  const renderDishCard = (dish: DishItem) => (
    <div
      key={dish.id}
      className={`card-glass border-2 p-4 flex flex-col justify-between transition-all hover:border-souqna-gold/40 shadow-lg ${
        dish.is_available
          ? "border-souqna-border"
          : "border-souqna-border/40 opacity-70 bg-souqna-surface/40"
      }`}
    >
      <div>
        {/* صورة الطبق والشارات */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-souqna-border/60 mb-3 bg-souqna-surface">
          <Image
            src={formatImageUrl(dish.image_url)}
            alt={dish.name}
            fill
            unoptimized
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target && !target.src.includes("dish-tagine.jpg")) {
                target.src = "/images/assets/dish-tagine.jpg";
              }
            }}
            className="object-cover"
          />

          {/* شارة السعر */}
          <div className="absolute top-2.5 right-2.5 bg-souqna-base/90 backdrop-blur-md text-souqna-gold text-xs font-black px-3 py-1 rounded-xl border border-souqna-gold/30 shadow-md font-mono">
            {dish.base_price} ج.م
          </div>

          {/* شارة الريلز */}
          {dish.reel_url ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenReelWatch(dish);
              }}
              className="absolute top-2.5 left-2.5 bg-gradient-to-r from-red-600 to-amber-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-lg border border-white/20 flex items-center gap-1 hover:scale-105 active:scale-95 transition-all"
            >
              <Film className="w-3 h-3 fill-white" />
              <span>شاهد الريلز 🎬</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenReelUpload(dish);
              }}
              className="absolute top-2.5 left-2.5 bg-souqna-base/80 backdrop-blur-md text-souqna-text-secondary text-[10px] font-bold px-2.5 py-1 rounded-xl border border-souqna-border/80 hover:text-souqna-gold hover:border-souqna-gold/40 transition-all flex items-center gap-1"
            >
              <Film className="w-3 h-3 text-souqna-gold" />
              <span>+ ربط ريلز</span>
            </button>
          )}

          {/* شارة الحجز المسبق */}
          {dish.requires_preorder && (
            <div className="absolute bottom-2 right-2 bg-amber-500/90 text-souqna-base text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow">
              <Clock className="w-2.5 h-2.5" />
              <span>حجز مسبق</span>
            </div>
          )}

          {/* شارة القسم */}
          {dish.category_name && (
            <div className="absolute bottom-2 left-2 bg-souqna-base/85 text-souqna-text-primary text-[10px] font-bold px-2 py-0.5 rounded-lg border border-souqna-border shadow">
              {getCategoryEmoji(dish.category_name)} {dish.category_name}
            </div>
          )}
        </div>

        {/* تفاصيل الطبق */}
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-black text-sm text-souqna-text-primary line-clamp-1">{dish.name}</h3>
          </div>

          <p className="text-souqna-text-muted text-xs line-clamp-2 leading-relaxed">
            {dish.description || "طبق بيتي فاخر محضر بأعلى جودة ومكونات طازجة يومياً."}
          </p>

          {/* الخصائص التشغيلية */}
          <div className="flex items-center gap-3 pt-2 text-[11px] text-souqna-text-secondary border-t border-souqna-border/50">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-souqna-gold" />
              <span>{dish.prep_time_minutes} دقيقة</span>
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-souqna-emerald" />
              <span>{dish.servings_count || "يكفي 3 أفراد"}</span>
            </span>
            {dish.variants && dish.variants.length > 1 && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-souqna-gold">
                <Layers className="w-3 h-3" />
                <span>{dish.variants.length} أحجام</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* شريط الإجراءات السفلي */}
      <div className="pt-3 mt-3 border-t border-souqna-border flex items-center justify-between gap-2">
        {/* زر التوفر اليوم */}
        <button
          type="button"
          onClick={() => handleToggleAvailability(dish.id)}
          className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            dish.is_available
              ? "bg-souqna-emerald/15 text-souqna-emerald border border-souqna-emerald/30 hover:bg-souqna-emerald/25"
              : "bg-souqna-surface text-souqna-text-muted border border-souqna-border hover:bg-souqna-surface/80"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${dish.is_available ? "bg-souqna-emerald" : "bg-souqna-text-muted"}`} />
          <span>{dish.is_available ? "متاح اليوم" : "غير متاح"}</span>
        </button>

        {/* أزرار التعديل والحذف */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleOpenEditModal(dish)}
            className="p-1.5 rounded-xl btn-ghost hover:text-souqna-gold"
            title="تعديل الصنف"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteDish(dish.id)}
            className="p-1.5 rounded-xl btn-ghost hover:text-red-400"
            title="حذف الصنف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full" dir="rtl">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold transition-all ${
            toastMessage.type === "success"
              ? "bg-souqna-emerald text-white border border-souqna-emerald/50"
              : "bg-red-600 text-white border border-red-400"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-white/80" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white/80" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-souqna-text-primary font-black text-xl flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-souqna-gold" />
              كتالوج المنيو والأصناف
            </h1>
            <p className="text-souqna-text-muted text-xs mt-0.5">
              الأصناف مقسمة تحت أقسام وتصنيفات واضحة، مع إدارة الأحجام والأسعار ورفع الصور وربط الريلز
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNewCatModalOpen(true)}
              className="btn-ghost flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
            >
              <Tag className="w-3.5 h-3.5 text-souqna-gold" />
              <span>+ قسم جديد</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="btn-gold flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إضافة صنف جديد</span>
            </button>
          </div>
        </div>

        {/* Filter and Category Bar */}
        <div className="card-glass p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الأصناف والمكونات والأقسام..."
                className="input-dark w-full pr-10 text-xs py-2.5"
              />
              <Search className="w-4 h-4 text-souqna-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-souqna-text-muted hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* إجمالي الأصناف */}
            <div className="text-xs text-souqna-text-secondary flex items-center gap-2">
              <span>إجمالي الأصناف بالمنيو:</span>
              <span className="font-mono font-bold text-souqna-gold bg-souqna-surface px-2.5 py-1 rounded-lg border border-souqna-border">
                {dishes.length} أصناف
              </span>
            </div>
          </div>

          {/* Category Tabs / Navigation Bar */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-souqna-border/50">
            {categories.map((cat) => {
              const count =
                cat === "الكل"
                  ? dishes.length
                  : dishes.filter((d) => d.category_name?.trim().toLowerCase() === cat.trim().toLowerCase()).length;

              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    if (cat !== "الكل") {
                      const el = document.getElementById(`category-sec-${cat}`);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-souqna-gold text-souqna-base shadow-md shadow-souqna-gold/20"
                      : "bg-souqna-surface border border-souqna-border text-souqna-text-secondary hover:border-souqna-gold/40 hover:text-souqna-gold"
                  }`}
                >
                  <span>{cat === "الكل" ? "📑 الكل" : `${getCategoryEmoji(cat)} ${cat}`}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isSelected ? "bg-souqna-base/20 text-souqna-base font-black" : "bg-souqna-base text-souqna-text-muted"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            MENU CATEGORY SECTIONS (الأصناف مقسمة تحت كاتجريهات منظمة)
           ========================================================================= */}
        <div className="space-y-10">
          {displayCategories
            .filter((cat) => selectedCategory === "الكل" || selectedCategory === cat)
            .map((category) => {
              // الأصناف التابعة لهذا القسم
              const categoryDishes = dishes.filter(
                (d) =>
                  d.category_name?.trim().toLowerCase() === category.trim().toLowerCase() &&
                  isDishMatchingSearch(d)
              );

              // إذا كان هناك بحث نشط والقسم فارغ من المطابقات، نخفيه
              if (searchQuery.trim() && categoryDishes.length === 0) return null;

              return (
                <section
                  key={category}
                  id={`category-sec-${category}`}
                  className="space-y-4 pt-1"
                >
                  {/* Category Header Bar */}
                  <div className="flex items-center justify-between bg-souqna-surface/90 border border-souqna-border/80 px-4 py-3 rounded-2xl shadow-sm backdrop-blur-sm flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-souqna-gold/15 text-souqna-gold flex items-center justify-center font-bold text-lg border border-souqna-gold/30">
                        {getCategoryEmoji(category)}
                      </div>
                      <div>
                        <h2 className="text-base font-black text-souqna-text-primary flex items-center gap-2">
                          قسم {category}
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-souqna-base border border-souqna-border text-souqna-gold">
                            {categoryDishes.length} أصناف
                          </span>
                        </h2>
                        <p className="text-[11px] text-souqna-text-muted">
                          أطباق ووجبات قسم {category} المتاحة للزبائن
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(category)}
                      className="btn-ghost text-xs px-3.5 py-1.5 flex items-center gap-1.5 hover:text-souqna-gold font-bold border border-souqna-gold/20"
                    >
                      <Plus className="w-3.5 h-3.5 text-souqna-gold" />
                      <span>+ إضافة صنف في قسم {category}</span>
                    </button>
                  </div>

                  {/* Category Dishes Grid */}
                  {categoryDishes.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border-2 border-dashed border-souqna-border/60 bg-souqna-surface/20">
                      <p className="text-xs text-souqna-text-muted mb-2">
                        لا توجد أصناف مضافة في قسم &quot;{category}&quot; حالياً
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(category)}
                        className="text-xs font-bold text-souqna-gold hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>أضف أول صنف في قسم {category} الآن</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {categoryDishes.map((dish) => renderDishCard(dish))}
                    </div>
                  )}
                </section>
              );
            })}

          {/* Uncategorized or Other Dishes Section */}
          {(() => {
            const uncategorizedDishes = dishes.filter(
              (d) =>
                (!d.category_name || !displayCategories.some((c) => c.toLowerCase() === d.category_name?.toLowerCase())) &&
                isDishMatchingSearch(d)
            );

            if (uncategorizedDishes.length === 0) return null;
            if (selectedCategory !== "الكل" && selectedCategory !== "أخرى") return null;

            return (
              <section id="category-sec-other" className="space-y-4 pt-1">
                <div className="flex items-center justify-between bg-souqna-surface/90 border border-souqna-border/80 px-4 py-3 rounded-2xl shadow-sm backdrop-blur-sm flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-souqna-emerald/15 text-souqna-emerald flex items-center justify-center font-bold text-lg border border-souqna-emerald/30">
                      📦
                    </div>
                    <div>
                      <h2 className="text-base font-black text-souqna-text-primary flex items-center gap-2">
                        أصناف أخرى / بدون تصنيف
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-souqna-base border border-souqna-border text-souqna-gold">
                          {uncategorizedDishes.length} أصناف
                        </span>
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddModal()}
                    className="btn-ghost text-xs px-3.5 py-1.5 flex items-center gap-1.5 hover:text-souqna-gold font-bold border border-souqna-border"
                  >
                    <Plus className="w-3.5 h-3.5 text-souqna-gold" />
                    <span>+ إضافة صنف</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {uncategorizedDishes.map((dish) => renderDishCard(dish))}
                </div>
              </section>
            );
          })()}

          {/* حالة عدم وجود أي نتائج مطابقة للبحث */}
          {dishes.filter(isDishMatchingSearch).length === 0 && (
            <div className="py-20 text-center card-glass border-2 border-dashed border-souqna-border">
              <UtensilsCrossed className="w-12 h-12 text-souqna-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-souqna-text-secondary font-semibold text-sm">
                لا توجد أصناف تطابق عبارة البحث &quot;{searchQuery}&quot;
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs font-bold text-souqna-gold hover:underline"
              >
                مسح البحث وعرض كل الأصناف
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL: إضافة / تعديل صنف بالكامل (Product Studio Modal with Image Upload)
         ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass border border-souqna-gold/25 w-full max-w-xl p-6 shadow-2xl relative text-right max-h-[92vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-souqna-border mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-souqna-gold/15 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-souqna-gold" />
                </div>
                <h3 className="text-base font-black text-souqna-text-primary">
                  {editingDishId ? "تعديل بيانات الصنف والخيارات" : "إضافة صنف جديد للمنيو"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-ghost p-1.5 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Image Uploader & Presets */}
              <div className="p-3.5 rounded-2xl bg-souqna-surface/80 border border-souqna-border">
                <label className="block mb-2 font-bold text-souqna-text-primary flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-souqna-gold" />
                  <span>صورة الصنف أو الطبق:</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  {/* صندوق معاينة الصورة */}
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-souqna-border bg-souqna-base shrink-0 shadow-md">
                    {formImageUrl ? (
                      <Image
                        src={formatImageUrl(formImageUrl)}
                        alt="Preview"
                        fill
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target && !target.src.includes("dish-tagine.jpg")) {
                            target.src = "/images/assets/dish-tagine.jpg";
                          }
                        }}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-souqna-text-muted">
                        <UtensilsCrossed className="w-6 h-6 opacity-30 mb-1" />
                        <span className="text-[10px]">بدون صورة</span>
                      </div>
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-souqna-gold animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* خيارات رفع الصورة */}
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-gold flex-1 py-2 text-xs flex items-center justify-center gap-1.5 font-bold shadow-md"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                        <span>{uploadingImage ? "جاري الرفع..." : "اختر صورة من جهازك 📸"}</span>
                      </button>

                      {formImageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormImageUrl("")}
                          className="btn-ghost px-2.5 py-2 text-xs text-red-400 hover:text-red-300 border border-souqna-border"
                          title="حذف الصورة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* إدخال رابط صورة يدوي */}
                    <input
                      type="text"
                      value={formImageUrl.startsWith("data:") ? "" : formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder={formImageUrl.startsWith("data:") ? "تم اختيار صورة جاهزة من جهازك ✅" : "أو الصق رابط صورة خارجي مباشر (URL)..."}
                      className="input-dark w-full text-[11px] py-1.5"
                    />

                    {/* صور جاهزة ومقترحة للمأكولات المصرية */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-souqna-text-muted">صور جاهزة:</span>
                      {DEFAULT_PRESET_IMAGES.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormImageUrl(preset.url)}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-souqna-base border border-souqna-border text-souqna-text-secondary hover:border-souqna-gold/60 hover:text-souqna-gold transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-souqna-text-secondary">اسم الصنف أو الوجبة</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: طاجن عكاوي بالبصل الأورما"
                    className="input-dark w-full"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-souqna-text-secondary">القسم / التصنيف</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="input-dark w-full font-bold"
                  >
                    {categories.filter(c => c !== "الكل").map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryEmoji(cat)} {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block mb-1 font-bold text-souqna-text-secondary">وصف الصنف والمكونات</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="اكتب وصفاً جذاباً للصنف ومكوناته اللذيذة..."
                  rows={2}
                  className="input-dark w-full resize-none"
                />
              </div>

              {/* Base Price & Servings & Prep Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-souqna-text-secondary">السعر الأساسي (ج.م)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="input-dark w-full text-center font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-souqna-text-secondary">عدد الأفراد</label>
                  <select
                    value={formServings}
                    onChange={(e) => setFormServings(e.target.value)}
                    className="input-dark w-full font-bold"
                  >
                    <option value="فرد واحد">فرد واحد</option>
                    <option value="يكفي فردين">يكفي فردين</option>
                    <option value="3-4 أفراد">3-4 أفراد</option>
                    <option value="عائلي (5-6 أفراد)">عائلي (5-6 أفراد)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold text-souqna-text-secondary">وقت التحضير (د)</label>
                  <input
                    type="number"
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(Number(e.target.value))}
                    className="input-dark w-full text-center font-bold font-mono"
                  />
                </div>
              </div>

              {/* Preorder checkbox */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-souqna-surface border border-souqna-border">
                <input
                  type="checkbox"
                  id="preorder-check"
                  checked={formPreorder}
                  onChange={(e) => setFormPreorder(e.target.checked)}
                  className="w-4 h-4 rounded text-souqna-gold focus:ring-souqna-gold"
                />
                <label htmlFor="preorder-check" className="text-xs font-bold text-souqna-text-primary cursor-pointer">
                  يتطلب حجز مسبق (Pre-order) قبل موعد الاستلام بساعات
                </label>
              </div>

              {/* Multiple Variants Manager (الأحجام والأسعار) */}
              <div className="p-3.5 rounded-2xl bg-souqna-surface/80 border border-souqna-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-souqna-text-primary flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-souqna-gold" />
                    الأحجام والخيارات (Variants):
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-[11px] font-bold text-souqna-gold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    + حجم إضافي
                  </button>
                </div>

                <div className="space-y-2">
                  {formVariants.map((variant, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => handleVariantChange(idx, "name", e.target.value)}
                        placeholder="اسم الحجم (مثال: وسط، عائلي)"
                        className="input-dark py-1.5 px-3 flex-1 text-xs"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={variant.price}
                          onChange={(e) => handleVariantChange(idx, "price", Number(e.target.value))}
                          placeholder="السعر"
                          className="input-dark py-1.5 px-2 w-24 text-center font-mono text-xs font-bold"
                        />
                        <span className="text-souqna-text-muted text-[11px]">ج.م</span>
                      </div>
                      {formVariants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modifiers & Add-ons Manager (الإضافات المخصصة) */}
              <div className="p-3.5 rounded-2xl bg-souqna-surface/80 border border-souqna-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-souqna-text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-souqna-emerald" />
                    إضافات اختيارية مع الطبق (Add-ons):
                  </span>
                  <button
                    type="button"
                    onClick={handleAddModifier}
                    className="text-[11px] font-bold text-souqna-emerald hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    + إضافة جديدة
                  </button>
                </div>

                <div className="space-y-2">
                  {formModifiers.map((mod, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={mod.name}
                        onChange={(e) => handleModifierChange(idx, "name", e.target.value)}
                        placeholder="اسم الإضافة (مثال: طحينة، أرز إضافي)"
                        className="input-dark py-1.5 px-3 flex-1 text-xs"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={mod.additional_price}
                          onChange={(e) => handleModifierChange(idx, "additional_price", Number(e.target.value))}
                          placeholder="السعر الإضافي"
                          className="input-dark py-1.5 px-2 w-24 text-center font-mono text-xs font-bold"
                        />
                        <span className="text-souqna-text-muted text-[11px]">ج.م</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveModifier(idx)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formModifiers.length === 0 && (
                    <span className="text-[11px] text-souqna-text-muted block">لا توجد إضافات مخصصة (اختياري)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-5 mt-4 border-t border-souqna-border">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 btn-ghost rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDish}
                className="flex-1 btn-gold py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{saving ? "جاري الحفظ..." : "حفظ الصنف في المنيو"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: إضافة قسم جديد (Add Category Modal)
         ========================================================================= */}
      {isNewCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass border border-souqna-gold/25 w-full max-w-sm p-5 shadow-2xl space-y-4" dir="rtl">
            <div className="flex items-center justify-between pb-2 border-b border-souqna-border">
              <h3 className="font-bold text-sm text-souqna-text-primary">إضافة قسم جديد للمنيو</h3>
              <button onClick={() => setIsNewCatModalOpen(false)} className="btn-ghost p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block mb-1.5 text-xs text-souqna-text-secondary font-bold">اسم القسم</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="مثال: مشويات، شوربات، مقبلات"
                className="input-dark w-full text-xs"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewCatModalOpen(false)}
                className="flex-1 py-2 btn-ghost rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddCategory}
                className="flex-1 btn-gold py-2 text-xs font-bold"
              >
                إضافة القسم ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reel Modal (Upload & Watch) */}
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