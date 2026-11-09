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
  RefreshCw,
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
  created_at?: string;
  accepted_at?: string;
  items: OrderItem[];
}

interface MerchantOrdersViewProps {
  token: string;
  storeName?: string;
  user?: any;
  onNavigate: (view: "settings" | "menu" | "orders") => void;
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
          setOrders(res.data.data);
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
        setOrders((prev) => [res.order, ...prev]);
        setStats((prev) => ({
          ...prev,
          pending: prev.pending + 1,
        }));
        showToast("تم إنشاء طلب تجريبي جديد بنجاح! 🔔 تفقد الطلبات الجديدة");
      } else {
        // Fallback local simulation if backend is offline
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
        // Fallback local update
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
        // Fallback local
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

  const card1 = filteredOrders[0] || orders[0];
  const card2 = filteredOrders[1] || orders[1];

  return (
    <div className="relative w-full h-full select-none overflow-hidden font-sans">
      {/* =========================================================================
          الخلفية الرسمية المصممة (Base Canvas Visual Asset) - ملء الشاشة بالكامل
         ========================================================================= */}
      <Image
        src="/images/orders-design.jpg"
        alt="Hawadeet Order Management Dashboard"
        fill
        priority
        className="object-fill pointer-events-none"
      />

      {/* =========================================================================
          Toast Notifications Banner
         ========================================================================= */}
      {toastMessage && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold animate-bounce ${
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
          1. شريط الهيدر العلوي (Top Header Bar)
         ========================================================================= */}
      {/* زر الإشعارات */}
      <button
        type="button"
        onClick={() => showToast(`لديك ${stats.pending} طلبات جديدة قيد الانتظار! 🔔`)}
        className="absolute z-20 cursor-pointer rounded-full hover:scale-105 active:scale-95 transition-all"
        style={{ top: "2.8%", left: "2.6%", width: "3.4%", height: "5.1%" }}
        title="الإشعارات"
      />

      {/* بروفايل التاجر */}
      <div
        className="absolute z-20 flex items-center cursor-pointer rounded-xl hover:bg-black/5"
        style={{ top: "2.4%", left: "7.2%", width: "14.5%", height: "5.8%" }}
        title="الشيف أم أحمد - متصل الآن"
      />

      {/* زر إنشاء طلب تجريبي الحقيقي في الهيدر */}
      <button
        type="button"
        disabled={loadingAction}
        onClick={handleCreateTestOrder}
        className="absolute z-20 cursor-pointer rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 hover:brightness-105 transition-all disabled:opacity-60"
        style={{ top: "2.4%", left: "27.2%", width: "17.0%", height: "5.8%" }}
        title="إنشاء طلب تجريبي جديد لاختبار دورة حياة الطلبات"
      >
        <span className="sr-only">إنشاء طلب تجريبي</span>
      </button>

      {/* عنوان المتجر الحالي */}
      <div
        className="absolute z-20 flex items-center justify-end pr-2 text-xs font-bold text-[#3a2818] cursor-pointer hover:bg-black/5 rounded-xl transition-all"
        style={{ top: "2.4%", left: "60.5%", width: "21.0%", height: "5.8%" }}
        title="لوحة تحكم التاجر"
      />

      {/* =========================================================================
          2. شريط الإحصائيات السريعة (Quick Stats Overlays)
         ========================================================================= */}
      {/* كارت 1: قيد الانتظار */}
      <div
        onClick={() => setActiveFilter("PENDING")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-amber-500/10 transition-all flex items-center justify-center"
        style={{ top: "14.8%", left: "61.5%", width: "19.0%", height: "12.2%" }}
        title="تصفية الطلبات: قيد الانتظار"
      >
        <span className="absolute bottom-2 left-6 text-xl md:text-2xl font-black text-[#e67e22]">
          {stats.pending}
        </span>
      </div>

      {/* كارت 2: جاري التحضير */}
      <div
        onClick={() => setActiveFilter("PREPARING")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-blue-500/10 transition-all flex items-center justify-center"
        style={{ top: "14.8%", left: "42.8%", width: "18.0%", height: "12.2%" }}
        title="تصفية الطلبات: جاري التحضير"
      >
        <span className="absolute bottom-2 left-6 text-xl md:text-2xl font-black text-[#2980b9]">
          {stats.preparing}
        </span>
      </div>

      {/* كارت 3: جاهز للتسليم */}
      <div
        onClick={() => setActiveFilter("READY")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-emerald-500/10 transition-all flex items-center justify-center"
        style={{ top: "14.8%", left: "23.0%", width: "19.0%", height: "12.2%" }}
        title="تصفية الطلبات: جاهز للتسليم"
      >
        <span className="absolute bottom-2 left-6 text-xl md:text-2xl font-black text-[#27ae60]">
          {stats.ready}
        </span>
      </div>

      {/* كارت 4: مبيعات اليوم */}
      <div
        onClick={() => showToast(`إجمالي مبيعات اليوم: ${stats.today_sales} ج.م`)}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-amber-600/10 transition-all flex items-center justify-center"
        style={{ top: "14.8%", left: "1.5%", width: "21.0%", height: "12.2%" }}
        title="مبيعات اليوم الإجمالية"
      >
        <span className="absolute bottom-2 left-4 text-lg md:text-xl font-black text-[#3a2818]">
          {stats.today_sales} ج.م
        </span>
      </div>

      {/* =========================================================================
          3. شريط الفلاتر والتبويبات (Filter Tabs Bar)
         ========================================================================= */}
      {/* تبويب: الكل */}
      <button
        type="button"
        onClick={() => setActiveFilter("ALL")}
        className={`absolute z-20 cursor-pointer rounded-2xl transition-all ${
          activeFilter === "ALL" ? "ring-2 ring-[#d32f2f]/30" : "hover:brightness-95"
        }`}
        style={{ top: "29.8%", left: "69.0%", width: "12.0%", height: "6.8%" }}
        title="عرض جميع الطلبات"
      />

      {/* تبويب: قيد الانتظار (جديد) */}
      <button
        type="button"
        onClick={() => setActiveFilter("PENDING")}
        className={`absolute z-20 cursor-pointer rounded-2xl transition-all ${
          activeFilter === "PENDING"
            ? "border-2 border-[#d32f2f] bg-amber-500/10"
            : "hover:brightness-95"
        }`}
        style={{ top: "29.8%", left: "53.5%", width: "15.0%", height: "6.8%" }}
        title="عرض الطلبات قيد الانتظار"
      />

      {/* تبويب: جاري التجهيز */}
      <button
        type="button"
        onClick={() => setActiveFilter("PREPARING")}
        className={`absolute z-20 cursor-pointer rounded-2xl transition-all ${
          activeFilter === "PREPARING"
            ? "border-2 border-[#d32f2f] bg-blue-500/10"
            : "hover:brightness-95"
        }`}
        style={{ top: "29.8%", left: "39.8%", width: "13.2%", height: "6.8%" }}
        title="عرض الطلبات قيد التجهيز"
      />

      {/* تبويب: جاهز */}
      <button
        type="button"
        onClick={() => setActiveFilter("READY")}
        className={`absolute z-20 cursor-pointer rounded-2xl transition-all ${
          activeFilter === "READY"
            ? "border-2 border-[#d32f2f] bg-emerald-500/10"
            : "hover:brightness-95"
        }`}
        style={{ top: "29.8%", left: "29.5%", width: "9.8%", height: "6.8%" }}
        title="عرض الطلبات الجاهزة"
      />

      {/* تبويب: الملغية */}
      <button
        type="button"
        onClick={() => setActiveFilter("CANCELLED")}
        className={`absolute z-20 cursor-pointer rounded-2xl transition-all ${
          activeFilter === "CANCELLED"
            ? "border-2 border-[#d32f2f] bg-red-500/10"
            : "hover:brightness-95"
        }`}
        style={{ top: "29.8%", left: "18.2%", width: "10.8%", height: "6.8%" }}
        title="عرض الطلبات الملغية أو المرفوضة"
      />

      {/* قائمة ترتيب حسب الأحدث */}
      <div
        onClick={() => {
          setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
          setOrders((prev) => [...prev].reverse());
          showToast(
            sortOrder === "newest" ? "تم الترتيب حسب الأقدم" : "تم الترتيب حسب الأحدث"
          );
        }}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-black/5"
        style={{ top: "29.8%", left: "1.5%", width: "15.8%", height: "6.8%" }}
        title="تغيير الترتيب الزمني للطلبات"
      />

      {/* =========================================================================
          4. كروت الطلبات التفاعلية (Order Cards Overlays)
         ========================================================================= */}
      {/* 🌟 الكارت الأيسر (Card 1): طلب قيد الانتظار */}
      {card1 && (
        <>
          {/* تفاصيل الطلب بالكامل عند الضغط على الكارت */}
          <div
            onClick={() => {
              setSelectedOrderForDetail(card1);
              setIsDetailModalOpen(true);
            }}
            className="absolute z-10 cursor-pointer hover:bg-amber-500/5 rounded-3xl transition-all"
            style={{ top: "38.5%", left: "1.5%", width: "41.5%", height: "38.0%" }}
            title="عرض تفاصيل الطلب كاملة"
          />

          {/* زر: قبول الطلب */}
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => openAcceptModal(card1)}
            className="absolute z-20 cursor-pointer rounded-2xl hover:brightness-105 active:scale-95 transition-all"
            style={{ top: "78.0%", left: "28.0%", width: "13.0%", height: "6.5%" }}
            title="قبول الطلب وتحديد وقت التحضير"
          >
            <span className="sr-only">قبول الطلب</span>
          </button>

          {/* زر: رفض الطلب */}
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => openRejectModal(card1)}
            className="absolute z-20 cursor-pointer rounded-2xl hover:brightness-95 active:scale-95 transition-all"
            style={{ top: "78.0%", left: "18.5%", width: "9.0%", height: "6.5%" }}
            title="رفض الطلب مع ذكر السبب"
          >
            <span className="sr-only">رفض الطلب</span>
          </button>
        </>
      )}

      {/* 🌟 الكارت الأيمن (Card 2): طلب جاري التحضير */}
      {card2 && (
        <>
          {/* تفاصيل الطلب بالكامل عند الضغط على الكارت */}
          <div
            onClick={() => {
              setSelectedOrderForDetail(card2);
              setIsDetailModalOpen(true);
            }}
            className="absolute z-10 cursor-pointer hover:bg-blue-500/5 rounded-3xl transition-all"
            style={{ top: "38.5%", left: "43.8%", width: "38.5%", height: "38.0%" }}
            title="عرض تفاصيل الطلب كاملة"
          />

          {/* زر: جاهز للاستلام والتسليم */}
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => handleMarkReady(card2)}
            className="absolute z-20 cursor-pointer rounded-2xl hover:brightness-105 active:scale-95 transition-all"
            style={{ top: "77.5%", left: "61.5%", width: "19.0%", height: "6.8%" }}
            title="تحويل حالة الطلب إلى جاهز للتسليم للكابتن"
          >
            <span className="sr-only">جاهز للاستلام والتسليم</span>
          </button>
        </>
      )}

      {/* =========================================================================
          5. القائمة الجانبية (Right Sidebar Navigation)
         ========================================================================= */}
      {/* 1. الرئيسية */}
      <button
        type="button"
        onClick={() => onNavigate("settings")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-black/10 transition-colors"
        style={{ top: "31.0%", right: "0%", width: "16.5%", height: "5.5%" }}
        title="الانتقال إلى الرئيسية وإعدادات المتجر"
      />

      {/* 2. الطلبات (الحالي نشط) */}
      <button
        type="button"
        onClick={() => {
          setActiveFilter("ALL");
          showToast("أنت بالفعل في شاشة إدارة الطلبات");
        }}
        className="absolute z-20 cursor-pointer rounded-2xl transition-colors"
        style={{ top: "36.8%", right: "0%", width: "16.5%", height: "5.8%" }}
        title="إدارة الطلبات (نشط حالياً)"
      />

      {/* 3. قائمة الطعام */}
      <button
        type="button"
        onClick={() => onNavigate("menu")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-black/10 transition-colors"
        style={{ top: "44.5%", right: "0%", width: "16.5%", height: "5.5%" }}
        title="الانتقال إلى قائمة الطعام والأطباق"
      />

      {/* 4. العملاء */}
      <button
        type="button"
        onClick={() => showToast("شاشة سجل العملاء وقاعدة البيانات قيد التطوير")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-black/10 transition-colors"
        style={{ top: "51.5%", right: "0%", width: "16.5%", height: "5.5%" }}
        title="سجل العملاء"
      />

      {/* 5. الإعدادات */}
      <button
        type="button"
        onClick={() => onNavigate("settings")}
        className="absolute z-20 cursor-pointer rounded-2xl hover:bg-black/10 transition-colors"
        style={{ top: "58.5%", right: "0%", width: "16.5%", height: "5.5%" }}
        title="إعدادات المتجر وساعات العمل"
      />

      {/* =========================================================================
          MODAL 1: نافذة قبول الطلب وتحديد وقت التحضير (Accept Order Dialog)
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
                className="flex-1 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-[#5c3a16] text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={loadingAction}
                onClick={handleConfirmAccept}
                className="flex-2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{loadingAction ? "جاري القبول..." : "تأكيد وبدء التحضير 👨‍🍳"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: نافذة رفض الطلب مع إدخال السبب (Reject Order Dialog)
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
                    className="text-[11px] font-bold bg-amber-50 hover:bg-amber-100 border border-[#e0cca9] text-[#5c3a16] px-2.5 py-1 rounded-xl transition-all"
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
                className="flex-1 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-[#5c3a16] text-xs font-bold transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={loadingAction || rejectionReasonInput.trim().length < 5}
                onClick={handleConfirmReject}
                className="flex-2 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>{loadingAction ? "جاري الرفض..." : "تأكيد رفض الطلب ❌"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: نافذة تفاصيل الطلب الكاملة (Order Details Modal)
         ========================================================================= */}
      {isDetailModalOpen && selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#fefcf7] border-2 border-[#e3d0b1] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-right">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e8d7be]">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#3a2818]">
                  تفاصيل الطلب #{selectedOrderForDetail.order_code}
                </h3>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                    selectedOrderForDetail.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : selectedOrderForDetail.status === "PREPARING"
                      ? "bg-blue-100 text-blue-800"
                      : selectedOrderForDetail.status === "READY"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {selectedOrderForDetail.status === "PENDING"
                    ? "قيد الانتظار"
                    : selectedOrderForDetail.status === "PREPARING"
                    ? "جاري التحضير"
                    : selectedOrderForDetail.status === "READY"
                    ? "جاهز للتسليم"
                    : "ملغي / مرفوض"}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="my-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {/* بيانات العميل */}
              <div className="bg-white border border-[#e8d7be] p-3 rounded-2xl space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-[#3a2818]">
                  <span>{selectedOrderForDetail.customer_name}</span>
                  <span className="text-[#962626]">العميل:</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span dir="ltr">{selectedOrderForDetail.customer_phone}</span>
                  <span>الهاتف:</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>{selectedOrderForDetail.delivery_address}</span>
                  <span>عنوان التوصيل:</span>
                </div>
                {selectedOrderForDetail.order_notes && (
                  <div className="pt-1.5 border-t border-stone-100 text-amber-800 font-bold">
                    <span>ملاحظة العميل: {selectedOrderForDetail.order_notes}</span>
                  </div>
                )}
              </div>

              {/* قائمة الأصناف في الطلب */}
              <div className="bg-white border border-[#e8d7be] p-3 rounded-2xl text-xs space-y-2">
                <div className="font-black text-[#3a2818] pb-1 border-b border-stone-100">
                  الأصناف المطلوبة:
                </div>
                {selectedOrderForDetail.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-stone-700">
                    <span className="font-bold text-[#3a2818]">
                      {item.total_price || item.unit_price * item.quantity} ج.م
                    </span>
                    <span>
                      {item.quantity} × {item.product_name_at_purchase}
                    </span>
                  </div>
                ))}
              </div>

              {/* الإجمالي والدفع */}
              <div className="bg-amber-500/10 border border-amber-300/40 p-3 rounded-2xl flex items-center justify-between font-black text-sm text-[#3a2818]">
                <span className="text-[#962626] text-base">
                  {selectedOrderForDetail.total_amount} ج.م
                </span>
                <span>
                  طريقة الدفع:{" "}
                  {selectedOrderForDetail.payment_method === "CASH_ON_DELIVERY"
                    ? "كاش عند الاستلام"
                    : "محفظة حواديت"}
                </span>
              </div>
            </div>

            {/* Actions in detail modal */}
            <div className="flex items-center gap-2 pt-3 border-t border-[#e8d7be]">
              {selectedOrderForDetail.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      openRejectModal(selectedOrderForDetail);
                    }}
                    className="flex-1 py-2.5 rounded-2xl bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold transition-colors"
                  >
                    رفض الطلب ❌
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      openAcceptModal(selectedOrderForDetail);
                    }}
                    className="flex-2 py-2.5 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black shadow transition-colors"
                  >
                    قبول الطلب وتجهيزه 👨‍🍳
                  </button>
                </>
              )}
              {selectedOrderForDetail.status === "PREPARING" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleMarkReady(selectedOrderForDetail);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-black shadow transition-colors flex items-center justify-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>تحويل إلى جاهز للتسليم 📦</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
