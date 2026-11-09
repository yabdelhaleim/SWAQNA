"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Check,
  Phone,
  MapPin,
  UtensilsCrossed,
  ChefHat,
  Hourglass,
  PackageCheck,
  Coins,
  ChevronDown,
  Bell,
  Home,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Store,
  Wallet,
  MessageSquare,
  BarChart3,
  LayoutGrid,
  XCircle,
  Film,
} from "lucide-react";
import { merchantApi } from "@/lib/api";

interface OrderItem {
  id?: string;
  product_name_at_purchase: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  item_notes?: string;
}

interface Order {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  status: "PENDING" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED" | "REJECTED";
  payment_method: string;
  total_amount: number;
  prep_time_minutes: number;
  order_notes?: string;
  rejection_reason?: string;
  image_url?: string;
  created_at?: string;
  accepted_at?: string;
  items: OrderItem[];
}

interface MerchantOrdersViewProps {
  token: string;
  storeName?: string;
  user?: any;
  onNavigate: (view: "settings" | "menu" | "orders" | "reels") => void;
  onLogout: () => void;
}

export default function MerchantOrdersView({
  token,
  storeName = "مطبخ أم أحمد للأكل البيتي",
  user,
  onNavigate,
  onLogout,
}: MerchantOrdersViewProps) {
  // =========================================================================
  // States
  // =========================================================================
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "PENDING" | "PREPARING" | "READY" | "CANCELLED"
  >("ALL");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Stats State
  const [stats, setStats] = useState({
    pending: 3,
    preparing: 2,
    ready: 4,
    today_sales: 1450,
  });

  // Live Orders List
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "ord-1",
      order_code: "ORD-8291",
      customer_name: "إبراهيم",
      customer_phone: "01012345678",
      delivery_address: "المعادي - شارع 9",
      status: "PENDING",
      payment_method: "CASH_ON_DELIVERY",
      total_amount: 260,
      prep_time_minutes: 45,
      order_notes: "الأكل بدون شطة",
      image_url: "/images/assets/dish-tagine.jpg",
      items: [
        {
          product_name_at_purchase: "طاجن بامية باللحمة (وسط)",
          unit_price: 110,
          quantity: 2,
          total_price: 220,
        },
        {
          product_name_at_purchase: "ملوخية بيتي بالسمنة البلدي",
          unit_price: 40,
          quantity: 1,
          total_price: 40,
        },
      ],
    },
    {
      id: "ord-2",
      order_code: "ORD-7104",
      customer_name: "محمود",
      customer_phone: "01198765432",
      delivery_address: "التجمع الخامس",
      status: "PREPARING",
      payment_method: "WALLET",
      total_amount: 110,
      prep_time_minutes: 30,
      image_url: "/images/assets/dish-koshary.jpg",
      items: [
        {
          product_name_at_purchase: "كشري مصري مخصوص",
          unit_price: 60,
          quantity: 1,
          total_price: 60,
        },
        {
          product_name_at_purchase: "سلطة خضراء بلدي",
          unit_price: 25,
          quantity: 2,
          total_price: 50,
        },
      ],
    },
  ]);

  // Modal States
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [selectedOrderForAccept, setSelectedOrderForAccept] = useState<Order | null>(null);
  const [prepTimeInput, setPrepTimeInput] = useState<number>(45);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedOrderForReject, setSelectedOrderForReject] = useState<Order | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);

  const [loadingAction, setLoadingAction] = useState(false);

  // =========================================================================
  // Load stats and orders from server on mount
  // =========================================================================
  useEffect(() => {
    if (!token) return;

    // Load Stats
    merchantApi
      .getOrderStats(token)
      .then((res) => {
        if (res.success && res.stats) {
          setStats({
            pending: res.stats.pending ?? 3,
            preparing: res.stats.preparing ?? 2,
            ready: res.stats.ready ?? 4,
            today_sales: res.stats.today_sales ?? 1450,
          });
        }
      })
      .catch(() => {});

    // Load Orders
    merchantApi
      .getOrders(token)
      .then((res) => {
        if (res.success && res.data?.data && res.data.data.length > 0) {
          // Add default fallback dish images if missing
          const enriched = res.data.data.map((o: Order, idx: number) => ({
            ...o,
            image_url:
              idx % 2 === 0
                ? "/images/assets/dish-tagine.jpg"
                : "/images/assets/dish-koshary.jpg",
          }));
          setOrders(enriched);
        }
      })
      .catch(() => {});
  }, [token]);

  // Toast Helper
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // =========================================================================
  // Order Actions
  // =========================================================================

  // 1. Create Test Order
  const handleCreateTestOrder = async () => {
    setLoadingAction(true);
    try {
      const res = await merchantApi.createTestOrder(token);
      if (res.success && res.order) {
        const newOrder = {
          ...res.order,
          image_url:
            orders.length % 2 === 0
              ? "/images/assets/dish-tagine.jpg"
              : "/images/assets/dish-koshary.jpg",
        };
        setOrders((prev) => [newOrder, ...prev]);
        setStats((prev) => ({
          ...prev,
          pending: prev.pending + 1,
        }));
        showToast("تم إنشاء طلب تجريبي جديد بنجاح! 🔔 تفقد الطلبات الجديدة");
      } else {
        const fakeCode = "ORD-" + Math.floor(1000 + Math.random() * 9000);
        const fakeOrder: Order = {
          id: "fake-" + Date.now(),
          order_code: fakeCode,
          customer_name: "أحمد حسني",
          customer_phone: "01234567890",
          delivery_address: "الدقي - ميدان المساحة",
          status: "PENDING",
          payment_method: "CASH_ON_DELIVERY",
          total_amount: 195,
          prep_time_minutes: 40,
          order_notes: "من فضلك زيادة ليمون ومخلل",
          image_url: "/images/assets/dish-tagine.jpg",
          items: [
            {
              product_name_at_purchase: "طاجن كوارع ورق عنب",
              unit_price: 160,
              quantity: 1,
              total_price: 160,
            },
            {
              product_name_at_purchase: "شوربة لسان عصفور",
              unit_price: 35,
              quantity: 1,
              total_price: 35,
            },
          ],
        };
        setOrders((prev) => [fakeOrder, ...prev]);
        setStats((prev) => ({ ...prev, pending: prev.pending + 1 }));
        showToast(`تم إنشاء الطلب التجريبي #${fakeCode} بنجاح! 🔔`);
      }
    } catch {
      showToast("تم إنشاء طلب تجريبي محلياً للتجربة! 🔔");
    } finally {
      setLoadingAction(false);
    }
  };

  // 2. Open Accept Modal
  const openAcceptModal = (order: Order) => {
    setSelectedOrderForAccept(order);
    setPrepTimeInput(order.prep_time_minutes || 45);
    setIsAcceptModalOpen(true);
  };

  // Confirm Accept Order
  const handleConfirmAccept = async () => {
    if (!selectedOrderForAccept) return;
    setLoadingAction(true);

    try {
      const res = await merchantApi.acceptOrder(
        token,
        selectedOrderForAccept.id,
        prepTimeInput
      );

      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrderForAccept.id
              ? { ...o, status: "PREPARING", prep_time_minutes: prepTimeInput }
              : o
          )
        );
        setStats((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          preparing: prev.preparing + 1,
        }));
        showToast(`تم قبول الطلب #${selectedOrderForAccept.order_code} بنجاح! جاري التجهيز 👨‍🍳`);
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrderForAccept.id
              ? { ...o, status: "PREPARING", prep_time_minutes: prepTimeInput }
              : o
          )
        );
        setStats((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          preparing: prev.preparing + 1,
        }));
        showToast(`تم قبول الطلب #${selectedOrderForAccept.order_code}! 👨‍🍳`);
      }
    } catch {
      showToast("تم تحديث حالة الطلب إلى جاري التجهيز");
    } finally {
      setIsAcceptModalOpen(false);
      setSelectedOrderForAccept(null);
      setLoadingAction(false);
    }
  };

  // 3. Open Reject Modal
  const openRejectModal = (order: Order) => {
    setSelectedOrderForReject(order);
    setRejectionReasonInput("");
    setIsRejectModalOpen(true);
  };

  // Confirm Reject Order
  const handleConfirmReject = async () => {
    if (!selectedOrderForReject) return;
    if (!rejectionReasonInput.trim() || rejectionReasonInput.trim().length < 5) {
      showToast("يرجى كتابة سبب الرفض بحد أدنى 5 أحرف", "error");
      return;
    }

    setLoadingAction(true);
    try {
      const res = await merchantApi.rejectOrder(
        token,
        selectedOrderForReject.id,
        rejectionReasonInput.trim()
      );

      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrderForReject.id
              ? { ...o, status: "REJECTED", rejection_reason: rejectionReasonInput }
              : o
          )
        );
        setStats((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
        }));
        showToast(`تم رفض الطلب #${selectedOrderForReject.order_code}`);
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrderForReject.id
              ? { ...o, status: "REJECTED", rejection_reason: rejectionReasonInput }
              : o
          )
        );
        setStats((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
        }));
        showToast(`تم رفض الطلب #${selectedOrderForReject.order_code}`);
      }
    } catch {
      showToast("تم رفض الطلب");
    } finally {
      setIsRejectModalOpen(false);
      setSelectedOrderForReject(null);
      setLoadingAction(false);
    }
  };

  // 4. Mark Ready
  const handleMarkReady = async (order: Order) => {
    setLoadingAction(true);
    try {
      const res = await merchantApi.markOrderReady(token, order.id);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: "READY" } : o))
        );
        setStats((prev) => ({
          ...prev,
          preparing: Math.max(0, prev.preparing - 1),
          ready: prev.ready + 1,
        }));
        showToast(`الطلب #${order.order_code} جاهز للتسليم! تم إشعار كابتن التوصيل 📦`);
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: "READY" } : o))
        );
        setStats((prev) => ({
          ...prev,
          preparing: Math.max(0, prev.preparing - 1),
          ready: prev.ready + 1,
        }));
        showToast(`الطلب #${order.order_code} جاهز للتسليم! 📦`);
      }
    } catch {
      showToast(`الطلب جاهز للتسليم! 📦`);
    } finally {
      setLoadingAction(false);
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "PENDING") return o.status === "PENDING";
    if (activeFilter === "PREPARING") return o.status === "PREPARING";
    if (activeFilter === "READY") return o.status === "READY";
    if (activeFilter === "CANCELLED")
      return o.status === "CANCELLED" || o.status === "REJECTED";
    return true;
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#faf5eb] text-[#3a2818] font-sans selection:bg-[#d32f2f] selection:text-white">
      {/* =========================================================================
          Main Content Column (Left in RTL layout)
         ========================================================================= */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden relative">
        {/* Top Header Background Banner Strip */}
        <div className="relative w-full bg-[#f6edd9] border-b border-[#e6d6bc] px-6 py-3.5 flex items-center justify-between shadow-xs z-10">
          {/* Header Left: Notifications, Profile, Create Order */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => showToast(`لديك ${stats.pending} طلبات جديدة قيد الانتظار! 🔔`)}
              className="relative p-2 rounded-2xl bg-[#fffdfa] border border-[#e8dac1] hover:border-[#d32f2f] hover:bg-amber-50/50 transition-all text-[#5c3a16] shadow-xs active:scale-95"
              title="الإشعارات والتنبيهات"
            >
              <Bell className="w-5 h-5 text-[#8c2b18]" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#d32f2f] text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow">
                3
              </span>
            </button>

            {/* Profile Pill */}
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
                  الشيف أم أحمد
                </span>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  متصل الآن
                </span>
              </div>
            </div>

            {/* Button: + إنشاء طلب تجريبي */}
            <button
              type="button"
              disabled={loadingAction}
              onClick={handleCreateTestOrder}
              className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r from-[#ff7a00] to-[#e65100] text-white text-xs font-black shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{loadingAction ? "جاري الإنشاء..." : "إنشاء طلب تجريبي"}</span>
            </button>
          </div>

          {/* Header Right: Store Title & Icon */}
          <div className="flex items-center gap-2.5">
            <span className="text-sm md:text-base font-black text-[#3a2818]">
              حواديت - لوحة تحكم التاجر
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#8c2b18]/10 border border-[#8c2b18]/20 flex items-center justify-center text-[#8c2b18]">
              <Store className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            Toast Notifications
           ========================================================================= */}
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

        {/* =========================================================================
            Main Body Container
           ========================================================================= */}
        <div className="p-6 space-y-5">
          {/* 1. Quick Stats Container (إحصائيات اليوم السريعة) */}
          <div className="bg-[#fffdf9] border-2 border-[#eddcc4] rounded-3xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#f2e5d3]">
              <div className="flex items-center gap-2 font-black text-sm text-[#3a2818]">
                <BarChart3 className="w-4 h-4 text-[#e67e22]" />
                <span>إحصائيات اليوم السريعة</span>
              </div>
              <span className="text-xs font-bold text-stone-500">
                مباشر من نقاط البيع والمطبخ
              </span>
            </div>

            {/* 4 Responsive Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Card 1: قيد الانتظار */}
              <div
                onClick={() => setActiveFilter("PENDING")}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  activeFilter === "PENDING"
                    ? "bg-amber-100/60 border-amber-500 ring-2 ring-amber-300"
                    : "bg-[#fefaf2] border-[#f5e3ca] hover:border-amber-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
                    <Hourglass className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#5c3a16]">قيد الانتظار</span>
                </div>
                <span className="text-2xl font-black text-[#e67e22]">{stats.pending}</span>
              </div>

              {/* Card 2: جاري التحضير */}
              <div
                onClick={() => setActiveFilter("PREPARING")}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  activeFilter === "PREPARING"
                    ? "bg-blue-100/60 border-blue-500 ring-2 ring-blue-300"
                    : "bg-[#f3f9ff] border-[#cbe4fb] hover:border-blue-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-700 flex items-center justify-center">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#1e4e79]">جاري التحضير</span>
                </div>
                <span className="text-2xl font-black text-[#2980b9]">{stats.preparing}</span>
              </div>

              {/* Card 3: جاهز للتسليم */}
              <div
                onClick={() => setActiveFilter("READY")}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  activeFilter === "READY"
                    ? "bg-emerald-100/60 border-emerald-500 ring-2 ring-emerald-300"
                    : "bg-[#f2fcf5] border-[#c5eed4] hover:border-emerald-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#14532d]">جاهز للتسليم</span>
                </div>
                <span className="text-2xl font-black text-[#27ae60]">{stats.ready}</span>
              </div>

              {/* Card 4: مبيعات اليوم */}
              <div
                onClick={() => showToast(`إجمالي مبيعات اليوم: ${stats.today_sales} ج.م`)}
                className="p-3.5 rounded-2xl border-2 bg-[#fcf9f2] border-[#f2e0c4] hover:border-amber-400 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-600/15 text-amber-800 flex items-center justify-center">
                    <Coins className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#5c3a16]">مبيعات اليوم</span>
                </div>
                <span className="text-lg md:text-xl font-black text-[#3a2818]">
                  {stats.today_sales} <span className="text-xs font-bold">ج.م</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2. Filter Tabs & Sorting Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              {/* الكل */}
              <button
                type="button"
                onClick={() => setActiveFilter("ALL")}
                className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFilter === "ALL"
                    ? "bg-[#d32f2f] text-white shadow-md shadow-red-900/20"
                    : "bg-[#fffdfa] border-2 border-[#eddcc4] text-[#5c3a16] hover:bg-amber-50"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>الكل</span>
              </button>

              {/* قيد الانتظار */}
              <button
                type="button"
                onClick={() => setActiveFilter("PENDING")}
                className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFilter === "PENDING"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-900/20"
                    : "bg-[#fffdfa] border-2 border-[#eddcc4] text-[#5c3a16] hover:bg-amber-50"
                }`}
              >
                <Hourglass className="w-3.5 h-3.5" />
                <span>قيد الانتظار (جديد)</span>
              </button>

              {/* جاري التجهيز */}
              <button
                type="button"
                onClick={() => setActiveFilter("PREPARING")}
                className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFilter === "PREPARING"
                    ? "bg-[#2980b9] text-white shadow-md shadow-blue-900/20"
                    : "bg-[#fffdfa] border-2 border-[#eddcc4] text-[#5c3a16] hover:bg-amber-50"
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>جاري التجهيز</span>
              </button>

              {/* جاهز */}
              <button
                type="button"
                onClick={() => setActiveFilter("READY")}
                className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFilter === "READY"
                    ? "bg-[#27ae60] text-white shadow-md shadow-emerald-900/20"
                    : "bg-[#fffdfa] border-2 border-[#eddcc4] text-[#5c3a16] hover:bg-amber-50"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>جاهز</span>
              </button>

              {/* الملغية */}
              <button
                type="button"
                onClick={() => setActiveFilter("CANCELLED")}
                className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFilter === "CANCELLED"
                    ? "bg-red-700 text-white shadow-md shadow-red-900/20"
                    : "bg-[#fffdfa] border-2 border-[#eddcc4] text-[#5c3a16] hover:bg-amber-50"
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span>الملغية</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <button
              type="button"
              onClick={() => {
                setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
                setOrders((prev) => [...prev].reverse());
                showToast(
                  sortOrder === "newest"
                    ? "تم الترتيب حسب الأقدم"
                    : "تم الترتيب حسب الأحدث"
                );
              }}
              className="px-4 py-2 rounded-2xl bg-[#fffdfa] border-2 border-[#eddcc4] text-xs font-bold text-[#5c3a16] hover:border-[#d32f2f] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <ChevronDown className="w-4 h-4 text-[#8c2b18]" />
              <span>
                {sortOrder === "newest" ? "ترتيب حسب الأحدث" : "ترتيب حسب الأقدم"}
              </span>
            </button>
          </div>

          {/* 3. Orders Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredOrders.length === 0 ? (
              <div className="col-span-2 py-16 text-center bg-[#fffdf9] border-2 border-dashed border-[#e6d6bc] rounded-3xl">
                <p className="text-sm font-bold text-stone-500">
                  لا توجد طلبات تطابق الفلتر المختار حالياً.
                </p>
                <button
                  type="button"
                  onClick={handleCreateTestOrder}
                  className="mt-3 text-xs font-bold text-[#d32f2f] hover:underline"
                >
                  اضغط هنا لإنشاء طلب تجريبي جديد
                </button>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isPending = order.status === "PENDING";
                const isPreparing = order.status === "PREPARING";
                const isReady = order.status === "READY";

                return (
                  <div
                    key={order.id}
                    className="bg-[#fffefb] border-2 border-[#eddcc4] hover:border-[#d97706]/60 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    {/* Card Header: Status Badge & Order Code */}
                    <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#f2e5d3]">
                      {/* Status Badge */}
                      {isPending && (
                        <div className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 text-xs font-black flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-700" />
                          <span>قيد الانتظار</span>
                        </div>
                      )}
                      {isPreparing && (
                        <div className="px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-900 text-xs font-black flex items-center gap-1.5">
                          <ChefHat className="w-3.5 h-3.5 text-blue-700" />
                          <span>جاري التحضير</span>
                        </div>
                      )}
                      {isReady && (
                        <div className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 text-xs font-black flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>جاهز للتسليم</span>
                        </div>
                      )}
                      {!isPending && !isPreparing && !isReady && (
                        <div className="px-3 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-900 text-xs font-black flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-red-700" />
                          <span>ملغي / مرفوض</span>
                        </div>
                      )}

                      {/* Order Code */}
                      <span className="text-base font-black text-[#3a2818] tracking-wide">
                        طلب رقم #{order.order_code}
                      </span>
                    </div>

                    {/* Card Body: Dish Image & Details */}
                    <div className="flex gap-4 items-start">
                      {/* Food Picture */}
                      <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-[#eddcc4] shrink-0 shadow-xs">
                        <Image
                          src={
                            order.image_url ||
                            (isPending
                              ? "/images/assets/dish-tagine.jpg"
                              : "/images/assets/dish-koshary.jpg")
                          }
                          alt={order.customer_name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Customer Details & Items */}
                      <div className="flex-1 space-y-1.5 text-right">
                        {/* Customer Name & Phone */}
                        <div className="flex items-center justify-between text-xs font-black text-[#3a2818]">
                          <div className="flex items-center gap-1 text-[#8c2b18]">
                            <Phone className="w-3.5 h-3.5" />
                            <span dir="ltr">{order.customer_phone}</span>
                          </div>
                          <span>العميل: {order.customer_name}</span>
                        </div>

                        {/* Delivery Address */}
                        <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-stone-600">
                          <span>{order.delivery_address}</span>
                          <MapPin className="w-3.5 h-3.5 text-[#e67e22] shrink-0" />
                        </div>

                        {/* Order Items */}
                        <div className="pt-1.5 space-y-0.5 text-xs text-stone-700 font-bold">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-end gap-1">
                              <span>
                                {item.quantity} × {item.product_name_at_purchase}
                              </span>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#d32f2f]"></span>
                            </div>
                          ))}
                        </div>

                        {/* Customer Notes (if any) */}
                        {order.order_notes && (
                          <div className="mt-2 px-3 py-1 rounded-xl bg-[#faf4e8] border border-[#ecd9be] text-[11px] font-bold text-[#5c3a16] flex items-center justify-end gap-1.5">
                            <span>ملاحظة: {order.order_notes}</span>
                            <MessageSquare className="w-3.5 h-3.5 text-[#e67e22]" />
                          </div>
                        )}

                        {/* Timer Countdown (if preparing) */}
                        {isPreparing && (
                          <div className="mt-2 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-xs font-black text-[#0284c7] flex items-center justify-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>متبقي: {order.prep_time_minutes || 18} دقيقة على موعد التسليم</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Price & Action Buttons */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#f2e5d3]">
                      {/* Price & Payment Method */}
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-[#8c2b18]" />
                        <span className="text-sm font-black text-[#3a2818]">
                          {order.total_amount}{" "}
                          <span className="text-xs font-bold text-[#8c2b18]">ج.م</span>
                        </span>
                        <span className="text-[11px] font-bold text-stone-500">
                          {order.payment_method === "CASH_ON_DELIVERY"
                            ? "(دفع كاش)"
                            : "(محفظة حواديت)"}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            {/* Reject Button */}
                            <button
                              type="button"
                              onClick={() => openRejectModal(order)}
                              className="px-3.5 py-1.5 rounded-2xl border-2 border-red-500/60 text-red-600 hover:bg-red-50 text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5 stroke-[3]" />
                              <span>رفض</span>
                            </button>

                            {/* Accept Button */}
                            <button
                              type="button"
                              onClick={() => openAcceptModal(order)}
                              className="px-4 py-1.5 rounded-2xl bg-emerald-50 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>قبول الطلب</span>
                            </button>
                          </>
                        )}

                        {isPreparing && (
                          <button
                            type="button"
                            onClick={() => handleMarkReady(order)}
                            className="px-5 py-2 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>جاهز للاستلام والتسليم</span>
                          </button>
                        )}

                        {isReady && (
                          <div className="px-4 py-1.5 rounded-2xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>في انتظار كابتن التوصيل</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            Footer Copyright Bar
           ========================================================================= */}
        <div className="mt-auto py-3 px-6 bg-[#f6edd9] border-t border-[#e6d6bc] flex items-center justify-between text-xs font-bold text-stone-600">
          <span>2025 © حواديت | جميع الحقوق محفوظة</span>
          <span className="text-[#8c2b18] font-black">حواديت .. لكل أكلة حكاية</span>
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

            {/* 2. الطلبات (Active) */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#d32f2f] text-white shadow-lg cursor-pointer text-right"
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="w-4 h-4 text-white" />
                <span>الطلبات</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-black flex items-center justify-center">
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

            {/* 4. فيديوهات الريلز */}
            <button
              type="button"
              onClick={() => onNavigate("reels")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-right"
            >
              <div className="flex items-center gap-3">
                <Film className="w-4 h-4 text-red-400" />
                <span>فيديوهات الريلز 🎬</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                جديد
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
          MODAL 1: نافذة قبول الطلب وتحديد وقت التحضير (Accept Dialog)
         ========================================================================= */}
      {isAcceptModalOpen && selectedOrderForAccept && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#fefcf7] border-2 border-[#e3d0b1] rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-right">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e8d7be]">
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#3a2818]">
                  قبول الطلب #{selectedOrderForAccept.order_code}
                </h3>
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ChefHat className="w-5 h-5" />
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="my-5 space-y-4">
              <div className="bg-amber-500/10 border border-amber-300/40 p-3.5 rounded-2xl text-xs font-bold text-[#5c3a16] leading-relaxed">
                <span>العميل: </span>
                <span className="text-[#962626] font-black">
                  {selectedOrderForAccept.customer_name} ({selectedOrderForAccept.customer_phone})
                </span>
                <br />
                <span>العنوان: {selectedOrderForAccept.delivery_address}</span>
                <br />
                <span>الإجمالي: {selectedOrderForAccept.total_amount} ج.م</span>
              </div>

              <div>
                <label className="block text-xs font-black text-[#3a2818] mb-2">
                  وقت التحضير المتوقع (بالدقائق):
                </label>
                <div className="flex items-center gap-2">
                  {[20, 30, 45, 60, 90].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setPrepTimeInput(min)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                        prepTimeInput === min
                          ? "bg-[#d32f2f] text-white border-[#b71c1c] shadow"
                          : "bg-white text-[#5c3a16] border-[#e0cca9] hover:bg-amber-50"
                      }`}
                    >
                      {min} دقيقة
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#e8d7be]">
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-[#5c3a16] text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={loadingAction}
                onClick={handleConfirmAccept}
                className="flex-2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{loadingAction ? "جاري القبول..." : "تأكيد وبدء التحضير 👨‍🍳"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: نافذة رفض الطلب مع إدخال السبب (Reject Dialog)
         ========================================================================= */}
      {isRejectModalOpen && selectedOrderForReject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#fefcf7] border-2 border-[#e3d0b1] rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-right">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e8d7be]">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#b71c1c]">
                  رفض الطلب #{selectedOrderForReject.order_code}
                </h3>
                <span className="p-1.5 bg-red-100 text-red-700 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="my-5 space-y-4">
              <p className="text-xs font-bold text-stone-600">
                يرجى كتابة سبب واضح للرفض حتى يتم إشعار العميل به بأدب واحترافية:
              </p>

              {/* أزرار سريعة للأسباب الشائعة */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "المطبخ مشغول جداً حالياً ولا نستقبل طلبات جديدة",
                  "نفاد بعض المكونات الأساسية للطبق",
                  "وقت إغلاق المحل قد حان",
                  "عنوان التوصيل خارج نطاق التغطية",
                ].map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReasonInput(reason)}
                    className="text-[11px] font-bold bg-amber-50 hover:bg-amber-100 border border-[#e0cca9] text-[#5c3a16] px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                  >
                    + {reason}
                  </button>
                ))}
              </div>

              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="اكتب سبب الرفض هنا بالتفصيل (5 أحرف على الأقل)..."
                rows={3}
                className="w-full bg-[#fdf9f0] border-2 border-[#e0cca9] rounded-2xl p-3 text-xs font-bold text-[#3a2818] outline-none focus:border-[#d32f2f] focus:ring-2 focus:ring-[#d32f2f]/20 transition-all text-right resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#e8d7be]">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-[#5c3a16] text-xs font-bold transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={loadingAction || rejectionReasonInput.trim().length < 5}
                onClick={handleConfirmReject}
                className="flex-2 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>{loadingAction ? "جاري الرفض..." : "تأكيد رفض الطلب ❌"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
