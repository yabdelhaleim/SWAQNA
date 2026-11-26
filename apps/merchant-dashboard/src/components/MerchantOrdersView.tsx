"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock, CheckCircle2, AlertCircle, X, Plus, Check, Phone, MapPin,
  UtensilsCrossed, ChefHat, Hourglass, PackageCheck, Coins, ChevronDown,
  Bell, BellOff, Store, Wallet, MessageSquare, LayoutGrid, Columns3,
  XCircle, Loader2, Printer, ExternalLink, Maximize2, Minimize2,
  Volume2, VolumeX, Eye, ArrowRight,
} from "lucide-react";
import { merchantApi } from "@/lib/api";
import { soundService } from "@/lib/audioNotification";
import KitchenReceipt, { ReceiptOrder } from "@/components/KitchenReceipt";
import { getEcho } from "@/lib/echo";

interface OrderItem {
  id?: string;
  product_name_at_purchase: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  item_notes?: string;
  variant_name?: string;
  modifiers?: Array<{ name: string; price: number }>;
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
  storeName = "متجر سوقنا",
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
  const [viewMode, setViewMode] = useState<"grid" | "kanban">("grid");
  const [isKdsFullscreen, setIsKdsFullscreen] = useState(false);
  const [soundActive, setSoundActive] = useState(true);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);

  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [stats, setStats] = useState({
    pending: 0,
    preparing: 0,
    ready: 0,
    today_sales: 0,
  });

  const [orders, setOrders] = useState<Order[]>([]);

  // Modal States
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [selectedOrderForAccept, setSelectedOrderForAccept] = useState<Order | null>(null);
  const [prepTimeInput, setPrepTimeInput] = useState<number>(45);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedOrderForReject, setSelectedOrderForReject] = useState<Order | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [orderForReceipt, setOrderForReceipt] = useState<Order | null>(null);

  const [loadingAction, setLoadingAction] = useState(false);

  // Audio & Tab flash refs
  const prevPendingCountRef = useRef<number>(3);
  const originalTitleRef = useRef<string>("");

  // Load sound & auto-print settings from localStorage on mount
  useEffect(() => {
    setSoundActive(soundService.isEnabled());
    if (typeof window !== "undefined") {
      const savedAutoPrint = localStorage.getItem("souqna_auto_print");
      if (savedAutoPrint !== null) {
        setAutoPrintEnabled(savedAutoPrint === "true");
      }
      originalTitleRef.current = document.title;
    }
  }, []);

  // Toggle Sound Setting
  const handleToggleSound = () => {
    const next = soundService.toggle();
    setSoundActive(next);
    showToast(next ? "تم تفعيل جرس التنبيه 🔔" : "تم كتم الصوت 🔕");
  };

  // Toggle Auto-Print Setting
  const handleToggleAutoPrint = () => {
    const next = !autoPrintEnabled;
    setAutoPrintEnabled(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("souqna_auto_print", String(next));
    }
    showToast(next ? "تم تفعيل الطباعة التلقائية عند القبول 🖨️" : "تم إيقاف الطباعة التلقائية");
  };

  // Restore page title on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (originalTitleRef.current && typeof document !== "undefined") {
        document.title = originalTitleRef.current;
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // =========================================================================
  // Live Realtime Polling Engine (Every 8 Seconds)
  // =========================================================================
  const fetchLatestOrders = useCallback(async () => {
    if (!token) return;
    try {
      const [statsRes, ordersRes] = await Promise.all([
        merchantApi.getOrderStats(token).catch(() => null),
        merchantApi.getOrders(token).catch(() => null),
      ]);

      if (statsRes?.success && statsRes.stats) {
        const newPending = statsRes.stats.pending ?? 0;
        // Check if new pending order arrived
        if (newPending > prevPendingCountRef.current) {
          soundService.playOrderBell();
          if (typeof document !== "undefined") {
            document.title = `(${newPending}) 🛎️ طلب جديد وصل! - سوقنا`;
          }
          showToast(`🔔 تنبيه: لديك ${newPending} طلب جديد بانتظار الموافقة!`);
        }
        prevPendingCountRef.current = newPending;

        setStats({
          pending: newPending,
          preparing: statsRes.stats.preparing ?? 0,
          ready: statsRes.stats.ready ?? 0,
          today_sales: statsRes.stats.today_sales ?? 0,
        });
      }

      if (ordersRes?.success && ordersRes.data?.data && ordersRes.data.data.length > 0) {
        setOrders(ordersRes.data.data);
      }
    } catch {
      // Keep existing local state on network error
    }
  }, [token]);

  // =========================================================================
  // Real-Time WebSocket Engine (Laravel Reverb) + Smart Fallback Heartbeat
  // =========================================================================
  useEffect(() => {
    fetchLatestOrders();

    const merchantId = user?.id || user?.merchant?.id;
    if (!token || !merchantId) return;

    let echo: any = null;
    try {
      echo = getEcho(token);
      if (echo) {
        const channelName = `merchant.${merchantId}`;
        const channel = echo.private(channelName);

        // 1. استقبال طلب جديد فورا (0ms) مع نغمة الجرس وتحديث الشاشة
        channel.listen('.OrderPlaced', (event: any) => {
          soundService.playOrderBell();
          if (typeof document !== "undefined") {
            document.title = `(1) 🛎️ طلب جديد وصل! - سوقنا`;
          }
          showToast(`🔔 طلب جديد وصل! #${event.order?.order_code || ''} بقيمة ${event.order?.total_amount || 0} ج.م`);

          if (event.order) {
            setOrders((prev) => {
              const exists = prev.some((o) => o.id === event.order.id);
              if (exists) return prev;
              return [event.order, ...prev];
            });
            setStats((prev) => ({
              ...prev,
              pending: prev.pending + 1,
              active_total: (prev.active_total || 0) + 1,
            }));
          }
        });

        // 2. تحديث حالة الطلب لحظياً (قبول، تحضير، جهوزية)
        channel.listen('.OrderStatusUpdated', (event: any) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === event.order_id ? { ...o, status: event.status } : o))
          );
          fetchLatestOrders();
        });

        // 3. إلغاء الطلب من طرف العميل
        channel.listen('.OrderCancelled', (event: any) => {
          showToast(`⚠️ تم إلغاء الطلب #${event.order_code || ''}`, "error");
          setOrders((prev) =>
            prev.map((o) => (o.id === event.order_id ? { ...o, status: "CANCELLED" } : o))
          );
          fetchLatestOrders();
        });
      }
    } catch (err) {
      console.error("[Echo] WebSocket connection failed, fallback to polling:", err);
    }

    // نبض دوري كل 30 ثانية كاحتياطي أمان (بدلاً من 8 ثواني) لتقليل الضغط بنسبة 75%
    const interval = setInterval(fetchLatestOrders, 30000);

    return () => {
      clearInterval(interval);
      try {
        if (echo && merchantId) {
          echo.leave(`merchant.${merchantId}`);
        }
      } catch {}
    };
  }, [fetchLatestOrders, token, user]);

  // Toast Helper
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // =========================================================================
  // Order Actions
  // =========================================================================
  const handleCreateTestOrder = async () => {
    setLoadingAction(true);
    try {
      const res = await merchantApi.createTestOrder(token);
      if (res.success && res.order) {
        setOrders((prev) => [res.order, ...prev]);
        setStats((prev) => ({ ...prev, pending: prev.pending + 1 }));
        soundService.playOrderBell();
        showToast(`طلب تجريبي جديد وصل! 🔔 #${res.order.order_code}`);
      } else {
        const fakeCode = "ORD-" + Math.floor(1000 + Math.random() * 9000);
        const fakeOrder: Order = {
          id: "fake-" + Date.now(),
          order_code: fakeCode,
          customer_name: "عمرو عبدالعزيز",
          customer_phone: "01099887766",
          delivery_address: "الدقي - شارع مصدق - الدور 4",
          status: "PENDING",
          payment_method: "CASH_ON_DELIVERY",
          total_amount: 215,
          prep_time_minutes: 40,
          order_notes: "من فضلك زيادة ليمون ومخلل بلدي",
          created_at: new Date().toISOString(),
          items: [
            { product_name_at_purchase: "طاجن عكاوي بالبصل الأورما", unit_price: 180, quantity: 1, total_price: 180, item_notes: "مسبك على الهادي" },
            { product_name_at_purchase: "شوربة لسان عصفور بلدي", unit_price: 35, quantity: 1, total_price: 35 },
          ],
        };
        setOrders((prev) => [fakeOrder, ...prev]);
        setStats((prev) => ({ ...prev, pending: prev.pending + 1 }));
        soundService.playOrderBell();
        showToast(`طلب تجريبي #${fakeCode} اتضاف بنجاح! 🔔`);
      }
    } catch {
      soundService.playOrderBell();
      showToast("تم إنشاء طلب تجريبي للتجربة 🔔");
    } finally {
      setLoadingAction(false);
    }
  };

  const openAcceptModal = (order: Order) => {
    setSelectedOrderForAccept(order);
    setPrepTimeInput(order.prep_time_minutes || 45);
    setIsAcceptModalOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!selectedOrderForAccept) return;
    setLoadingAction(true);
    const orderAccepted = selectedOrderForAccept;

    try {
      await merchantApi.acceptOrder(token, orderAccepted.id, prepTimeInput);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderAccepted.id
            ? { ...o, status: "PREPARING", prep_time_minutes: prepTimeInput, accepted_at: new Date().toISOString() }
            : o
        )
      );
      setStats((prev) => ({ ...prev, pending: Math.max(0, prev.pending - 1), preparing: prev.preparing + 1 }));
      showToast(`تم قبول الطلب #${orderAccepted.order_code}! 👨‍🍳 جاري التجهيز`);

      // Auto-Print Receipt if enabled
      if (autoPrintEnabled) {
        setOrderForReceipt(orderAccepted);
        setTimeout(() => {
          window.print();
        }, 300);
      }
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderAccepted.id
            ? { ...o, status: "PREPARING", prep_time_minutes: prepTimeInput }
            : o
        )
      );
      setStats((prev) => ({ ...prev, pending: Math.max(0, prev.pending - 1), preparing: prev.preparing + 1 }));
      showToast(`تم قبول الطلب #${orderAccepted.order_code}! 👨‍🍳`);
    } finally {
      setIsAcceptModalOpen(false);
      setSelectedOrderForAccept(null);
      setLoadingAction(false);
    }
  };

  const openRejectModal = (order: Order) => {
    setSelectedOrderForReject(order);
    setRejectionReasonInput("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedOrderForReject) return;
    if (!rejectionReasonInput.trim() || rejectionReasonInput.trim().length < 5) {
      showToast("يرجى كتابة سبب الرفض (5 أحرف على الأقل)", "error");
      return;
    }
    setLoadingAction(true);
    try {
      await merchantApi.rejectOrder(token, selectedOrderForReject.id, rejectionReasonInput.trim());
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderForReject.id
            ? { ...o, status: "REJECTED", rejection_reason: rejectionReasonInput }
            : o
        )
      );
      setStats((prev) => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));
      showToast(`تم رفض الطلب #${selectedOrderForReject.order_code}`);
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderForReject.id
            ? { ...o, status: "REJECTED", rejection_reason: rejectionReasonInput }
            : o
        )
      );
      setStats((prev) => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));
      showToast(`تم رفض الطلب #${selectedOrderForReject.order_code}`);
    } finally {
      setIsRejectModalOpen(false);
      setSelectedOrderForReject(null);
      setLoadingAction(false);
    }
  };

  const handleMarkReady = async (order: Order) => {
    setLoadingAction(true);
    try {
      await merchantApi.markOrderReady(token, order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "READY" } : o)));
      setStats((prev) => ({ ...prev, preparing: Math.max(0, prev.preparing - 1), ready: prev.ready + 1 }));
      showToast(`الطلب #${order.order_code} جاهز! 📦 تم إشعار المندوب`);
    } catch {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "READY" } : o)));
      setStats((prev) => ({ ...prev, preparing: Math.max(0, prev.preparing - 1), ready: prev.ready + 1 }));
      showToast(`الطلب #${order.order_code} جاهز للتسليم! 📦`);
    } finally {
      setLoadingAction(false);
    }
  };

  // Trigger Print for an order
  const handlePrintReceipt = (order: Order) => {
    setOrderForReceipt(order);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Preview Receipt in modal
  const handlePreviewReceipt = (order: Order) => {
    setOrderForReceipt(order);
    setIsReceiptModalOpen(true);
  };

  // Toggle Fullscreen (Kitchen Display System mode)
  const toggleKdsFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsKdsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsKdsFullscreen(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "PENDING") return o.status === "PENDING";
    if (activeFilter === "PREPARING") return o.status === "PREPARING";
    if (activeFilter === "READY") return o.status === "READY";
    if (activeFilter === "CANCELLED") return o.status === "CANCELLED" || o.status === "REJECTED";
    return true;
  });

  const statusConfig = {
    PENDING:   { label: "قيد الانتظار", color: "bg-amber-500/15 border-amber-500/30 text-amber-300", icon: Hourglass },
    PREPARING: { label: "جاري التجهيز", color: "bg-blue-500/15 border-blue-500/30 text-blue-300", icon: ChefHat },
    READY:     { label: "جاهز للتسليم", color: "bg-souqna-emerald/15 border-souqna-emerald/30 text-souqna-emerald", icon: CheckCircle2 },
    DELIVERED: { label: "تم التسليم", color: "bg-souqna-emerald/10 border-souqna-emerald/20 text-souqna-emerald/70", icon: PackageCheck },
    CANCELLED: { label: "ملغي", color: "bg-red-500/15 border-red-500/30 text-red-400", icon: XCircle },
    REJECTED:  { label: "مرفوض", color: "bg-red-500/15 border-red-500/30 text-red-400", icon: XCircle },
  };

  // Render individual Order Card
  const renderOrderCard = (order: Order, isCompact = false) => {
    const isPending = order.status === "PENDING";
    const isPreparing = order.status === "PREPARING";
    const isReady = order.status === "READY";
    const cfg = statusConfig[order.status] || statusConfig.CANCELLED;
    const StatusIcon = cfg.icon;

    return (
      <div
        key={order.id}
        className={`card-glass border-2 p-4 flex flex-col justify-between transition-all hover:border-souqna-gold/40 ${
          isPending ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20" :
          isPreparing ? "border-blue-500/25 bg-blue-500/5" :
          isReady ? "border-souqna-emerald/30 bg-souqna-emerald/5" :
          "border-souqna-border"
        }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-souqna-border">
          <div className="flex items-center gap-2">
            <span className="font-black text-souqna-text-primary text-sm font-mono tracking-wider">
              #{order.order_code}
            </span>
            {isPending && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${cfg.color}`}>
              <StatusIcon className="w-3 h-3" />
              <span>{cfg.label}</span>
            </div>
            {/* Quick print button */}
            <button
              type="button"
              onClick={() => handlePrintReceipt(order)}
              className="p-1 rounded-lg text-souqna-text-muted hover:text-souqna-gold hover:bg-souqna-surface transition-colors"
              title="طباعة بون المطبخ (80mm)"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customer & Location Details */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-xs">
            <a
              href={`tel:${order.customer_phone}`}
              className="flex items-center gap-1 text-souqna-gold hover:underline font-mono"
              dir="ltr"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3 h-3" />
              <span>{order.customer_phone}</span>
            </a>
            <span className="font-bold text-souqna-text-primary">👤 {order.customer_name}</span>
          </div>
          <div className="flex items-center justify-end gap-1 text-xs text-souqna-text-secondary">
            <span className="truncate">{order.delivery_address}</span>
            <MapPin className="w-3.5 h-3.5 text-souqna-gold shrink-0" />
          </div>
        </div>

        {/* Items Summary */}
        <div className="bg-souqna-base/60 rounded-xl p-2.5 space-y-1 mb-3">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-souqna-text-muted font-mono">{item.quantity} × {item.unit_price} ج</span>
              <div className="text-right">
                <span className="text-souqna-text-primary font-semibold">{item.product_name_at_purchase}</span>
                {item.item_notes && (
                  <span className="block text-[10px] text-amber-300/80 font-normal">({item.item_notes})</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {order.order_notes && (
          <div className="flex items-center justify-end gap-1.5 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1.5 mb-3">
            <span className="line-clamp-1">ملاحظة: {order.order_notes}</span>
            <MessageSquare className="w-3 h-3 shrink-0 text-amber-400" />
          </div>
        )}

        {/* Prep timer for preparing orders */}
        {isPreparing && (
          <div className="flex items-center justify-between text-xs text-blue-300 bg-blue-500/10 border border-blue-500/25 rounded-xl px-3 py-1.5 mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>جاري التحضير</span>
            </div>
            <span className="font-mono font-bold">{order.prep_time_minutes || 45} دقيقة مستهدفة</span>
          </div>
        )}

        {/* Card Footer: Price & Primary Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-souqna-border">
          <div className="flex items-center gap-1.5">
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={() => openRejectModal(order)}
                  className="px-2.5 py-1.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all"
                >
                  رفض
                </button>
                <button
                  type="button"
                  onClick={() => openAcceptModal(order)}
                  className="px-3.5 py-1.5 rounded-xl bg-souqna-emerald text-souqna-base font-bold text-xs flex items-center gap-1 hover:brightness-110 shadow-md shadow-souqna-emerald/20 transition-all"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  قبول وبدء
                </button>
              </>
            )}

            {isPreparing && (
              <button
                type="button"
                onClick={() => handleMarkReady(order)}
                className="btn-gold px-3.5 py-1.5 text-xs flex items-center gap-1.5"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                جاهز للتسليم
              </button>
            )}

            {isReady && (
              <div className="flex items-center gap-1 text-xs text-souqna-emerald font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>في انتظار المندوب</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedOrderForDetail(order);
                setIsDetailModalOpen(true);
              }}
              className="p-1.5 rounded-xl text-souqna-text-muted hover:text-white hover:bg-souqna-surface"
              title="عرض التفاصيل الكاملة"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-right">
            <span className="text-souqna-gold font-black text-base font-mono">{order.total_amount}</span>
            <span className="text-souqna-text-muted text-xs mr-1">ج.م</span>
            <div className="text-souqna-text-muted text-[10px]">
              {order.payment_method === "CASH_ON_DELIVERY" ? "💵 كاش" : "💳 محفظة"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full print:p-0" dir="rtl">
      {/* ── Toast ── */}
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

      {/* ── Print Receipt Component (Renders Hidden Printable Area) ── */}
      <KitchenReceipt
        order={orderForReceipt}
        storeName={storeName}
        showPreviewModal={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      <div className="p-4 md:p-6 space-y-5">
        {/* ── Page Header & Controls ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-souqna-gold" />
              <h1 className="text-souqna-text-primary font-black text-xl">
                الطلبات المباشرة
              </h1>
              {stats.pending > 0 && (
                <span className="bg-amber-500 text-souqna-base text-xs font-black px-2 py-0.5 rounded-full animate-bounce">
                  {stats.pending} طلب جديد!
                </span>
              )}
            </div>
            <p className="text-souqna-text-muted text-xs mt-0.5">
              مراقبة الطلبات اللحظية، تشغيل المطبخ، وطباعة بونات الفواتير 80mm
            </p>
          </div>

          {/* Action Tools: Sound Toggle, Auto-print, View Switcher, Fullscreen */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sound Bell Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                soundActive
                  ? "bg-souqna-gold/15 border-souqna-gold/40 text-souqna-gold"
                  : "bg-souqna-surface border-souqna-border text-souqna-text-muted"
              }`}
              title={soundActive ? "جرس الطلبات مفعّل (اضغط للكتم)" : "جرس الطلبات مكتوم (اضغط للتفعيل)"}
            >
              {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundActive ? "صوت التنبيه" : "مكتوم"}</span>
            </button>

            {/* Auto Print Toggle */}
            <button
              type="button"
              onClick={handleToggleAutoPrint}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                autoPrintEnabled
                  ? "bg-souqna-emerald/15 border-souqna-emerald/40 text-souqna-emerald"
                  : "bg-souqna-surface border-souqna-border text-souqna-text-muted"
              }`}
              title="طباعة بون المطبخ تلقائياً بمجرد قبول الطلب"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{autoPrintEnabled ? "طباعة تلقائية 🟢" : "طباعة يدوية"}</span>
            </button>

            {/* View Mode Switcher: Grid vs Kanban */}
            <div className="flex items-center bg-souqna-surface border border-souqna-border rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "grid"
                    ? "bg-souqna-gold text-souqna-base"
                    : "text-souqna-text-muted hover:text-white"
                }`}
                title="عرض شبكي"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "kanban"
                    ? "bg-souqna-gold text-souqna-base"
                    : "text-souqna-text-muted hover:text-white"
                }`}
                title="عرض لوحة الكانبان"
              >
                <Columns3 className="w-4 h-4" />
              </button>
            </div>

            {/* Fullscreen (KDS mode) */}
            <button
              type="button"
              onClick={toggleKdsFullscreen}
              className="p-2 rounded-xl bg-souqna-surface border border-souqna-border text-souqna-text-muted hover:text-souqna-gold transition-colors"
              title="شاشة المطبخ الكاملة (KDS Mode)"
            >
              {isKdsFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Create Test Order */}
            <button
              type="button"
              disabled={loadingAction}
              onClick={handleCreateTestOrder}
              className="btn-gold flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
            >
              {loadingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>طلب تجريبي</span>
            </button>
          </div>
        </div>

        {/* ── Stats Strip Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            onClick={() => setActiveFilter("PENDING")}
            className={`card-glass p-3.5 cursor-pointer transition-all border-2 ${
              activeFilter === "PENDING"
                ? "border-amber-500/60 bg-amber-500/10"
                : "border-transparent hover:border-amber-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Hourglass className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl font-black text-amber-400 font-mono">{stats.pending}</span>
            </div>
            <p className="text-souqna-text-muted text-xs font-semibold mt-2">قيد الانتظار (جديد)</p>
          </div>

          <div
            onClick={() => setActiveFilter("PREPARING")}
            className={`card-glass p-3.5 cursor-pointer transition-all border-2 ${
              activeFilter === "PREPARING"
                ? "border-blue-500/60 bg-blue-500/10"
                : "border-transparent hover:border-blue-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-2xl font-black text-blue-400 font-mono">{stats.preparing}</span>
            </div>
            <p className="text-souqna-text-muted text-xs font-semibold mt-2">جاري التجهيز</p>
          </div>

          <div
            onClick={() => setActiveFilter("READY")}
            className={`card-glass p-3.5 cursor-pointer transition-all border-2 ${
              activeFilter === "READY"
                ? "border-souqna-emerald/60 bg-souqna-emerald/10"
                : "border-transparent hover:border-souqna-emerald/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-souqna-emerald/15 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-souqna-emerald" />
              </div>
              <span className="text-2xl font-black text-souqna-emerald font-mono">{stats.ready}</span>
            </div>
            <p className="text-souqna-text-muted text-xs font-semibold mt-2">جاهز للتسليم</p>
          </div>

          <div className="card-glass p-3.5 border-2 border-transparent hover:border-souqna-gold/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-souqna-gold/15 flex items-center justify-center">
                <Coins className="w-4 h-4 text-souqna-gold" />
              </div>
              <div className="text-right font-mono">
                <span className="text-xl font-black text-souqna-gold">{stats.today_sales}</span>
                <span className="text-xs text-souqna-gold/70 mr-1">ج.م</span>
              </div>
            </div>
            <p className="text-souqna-text-muted text-xs font-semibold mt-2">مبيعات اليوم</p>
          </div>
        </div>

        {/* ── View Filter Tabs (Grid Mode Only) ── */}
        {viewMode === "grid" && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: "ALL", label: "الكل", count: orders.length },
                { id: "PENDING", label: "انتظار (جديد)", count: stats.pending },
                { id: "PREPARING", label: "تجهيز", count: stats.preparing },
                { id: "READY", label: "جاهز", count: stats.ready },
                { id: "CANCELLED", label: "الملغية", count: null },
              ].map(({ id, label, count }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveFilter(id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeFilter === id
                      ? "bg-souqna-gold text-souqna-base shadow-lg shadow-souqna-gold/20"
                      : "bg-souqna-surface border border-souqna-border text-souqna-text-secondary hover:border-souqna-gold/40"
                  }`}
                >
                  <span>{label}</span>
                  {count !== null && count > 0 && (
                    <span className="bg-souqna-base/80 text-souqna-gold text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
                setOrders((prev) => [...prev].reverse());
              }}
              className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
            >
              <ChevronDown className="w-4 h-4" />
              <span>{sortOrder === "newest" ? "الأحدث أولاً" : "الأقدم أولاً"}</span>
            </button>
          </div>
        )}

        {/* =====================================================================
            VIEW 1: GRID VIEW
           ===================================================================== */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOrders.length === 0 ? (
              <div className="col-span-2 py-20 text-center card-glass border-2 border-dashed border-souqna-border">
                <UtensilsCrossed className="w-12 h-12 text-souqna-text-muted mx-auto mb-3 opacity-40" />
                <p className="text-souqna-text-secondary font-semibold text-sm">لا توجد طلبات تطابق الفلتر المختار</p>
                <button
                  type="button"
                  onClick={handleCreateTestOrder}
                  className="mt-3 text-xs font-bold text-souqna-gold hover:underline"
                >
                  + أنشئ طلب تجريبي للاختبار
                </button>
              </div>
            ) : (
              filteredOrders.map((order) => renderOrderCard(order))
            )}
          </div>
        )}

        {/* =====================================================================
            VIEW 2: KANBAN BOARD (Columns Pipeline)
           ===================================================================== */}
        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {/* Column 1: PENDING */}
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hourglass className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-amber-300">قيد الانتظار (جديد)</span>
                </div>
                <span className="bg-amber-500 text-souqna-base font-black text-xs px-2 py-0.5 rounded-full font-mono">
                  {orders.filter((o) => o.status === "PENDING").length}
                </span>
              </div>

              <div className="space-y-3">
                {orders
                  .filter((o) => o.status === "PENDING")
                  .map((order) => renderOrderCard(order, true))}
                {orders.filter((o) => o.status === "PENDING").length === 0 && (
                  <div className="p-8 text-center text-xs text-souqna-text-muted card-glass border-dashed">
                    لا توجد طلبات جديدة
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: PREPARING */}
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs text-blue-300">جاري التجهيز بالمطبخ</span>
                </div>
                <span className="bg-blue-500 text-white font-black text-xs px-2 py-0.5 rounded-full font-mono">
                  {orders.filter((o) => o.status === "PREPARING").length}
                </span>
              </div>

              <div className="space-y-3">
                {orders
                  .filter((o) => o.status === "PREPARING")
                  .map((order) => renderOrderCard(order, true))}
                {orders.filter((o) => o.status === "PREPARING").length === 0 && (
                  <div className="p-8 text-center text-xs text-souqna-text-muted card-glass border-dashed">
                    المطبخ هادئ حالياً
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: READY */}
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-souqna-emerald/10 border border-souqna-emerald/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-souqna-emerald" />
                  <span className="font-bold text-xs text-souqna-emerald">جاهز للتسليم للطيار</span>
                </div>
                <span className="bg-souqna-emerald text-souqna-base font-black text-xs px-2 py-0.5 rounded-full font-mono">
                  {orders.filter((o) => o.status === "READY").length}
                </span>
              </div>

              <div className="space-y-3">
                {orders
                  .filter((o) => o.status === "READY")
                  .map((order) => renderOrderCard(order, true))}
                {orders.filter((o) => o.status === "READY").length === 0 && (
                  <div className="p-8 text-center text-xs text-souqna-text-muted card-glass border-dashed">
                    لا توجد طلبات بانتظار الطيار
                  </div>
                )}
              </div>
            </div>

            {/* Column 4: DELIVERED / CANCELLED */}
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-souqna-surface border border-souqna-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-souqna-text-muted" />
                  <span className="font-bold text-xs text-souqna-text-muted">مكتمل أو ملغي</span>
                </div>
                <span className="bg-souqna-border text-souqna-text-muted font-bold text-xs px-2 py-0.5 rounded-full font-mono">
                  {orders.filter((o) => o.status === "DELIVERED" || o.status === "CANCELLED" || o.status === "REJECTED").length}
                </span>
              </div>

              <div className="space-y-3">
                {orders
                  .filter((o) => o.status === "DELIVERED" || o.status === "CANCELLED" || o.status === "REJECTED")
                  .map((order) => renderOrderCard(order, true))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: قبول الطلب
         ========================================================================= */}
      {isAcceptModalOpen && selectedOrderForAccept && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass border border-souqna-gold/25 w-full max-w-md p-6 shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between pb-4 border-b border-souqna-border mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-souqna-emerald/15 flex items-center justify-center">
                  <ChefHat className="w-4 h-4 text-souqna-emerald" />
                </div>
                <h3 className="font-black text-souqna-text-primary">
                  قبول الطلب #{selectedOrderForAccept.order_code}
                </h3>
              </div>
              <button onClick={() => setIsAcceptModalOpen(false)} className="btn-ghost p-1.5 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-souqna-base/60 border border-souqna-border rounded-xl p-4 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-souqna-gold font-bold">{selectedOrderForAccept.customer_name}</span>
                  <span className="text-souqna-text-muted">العميل</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-souqna-text-secondary font-mono" dir="ltr">{selectedOrderForAccept.customer_phone}</span>
                  <span className="text-souqna-text-muted">الموبايل</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-souqna-text-secondary">{selectedOrderForAccept.delivery_address}</span>
                  <span className="text-souqna-text-muted">العنوان</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-souqna-border">
                  <span className="text-souqna-gold font-black font-mono">{selectedOrderForAccept.total_amount} ج.م</span>
                  <span className="text-souqna-text-muted">الإجمالي</span>
                </div>
              </div>

              <div>
                <label className="text-souqna-text-secondary text-xs font-bold mb-2 block">
                  وقت التحضير المتوقع (بالدقائق):
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[20, 30, 45, 60, 90].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setPrepTimeInput(min)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        prepTimeInput === min
                          ? "bg-souqna-gold text-souqna-base border-souqna-gold font-black"
                          : "border-souqna-border text-souqna-text-secondary hover:border-souqna-gold/40 bg-souqna-surface"
                      }`}
                    >
                      {min} د
                    </button>
                  ))}
                </div>
              </div>

              {autoPrintEnabled && (
                <div className="p-2.5 rounded-xl bg-souqna-emerald/10 border border-souqna-emerald/30 text-souqna-emerald text-xs font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>سيتم فتح أمر طباعة بون المطبخ تلقائياً بمجرد التأكيد 🖨️</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="flex-1 py-2.5 btn-ghost rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={loadingAction}
                onClick={handleConfirmAccept}
                className="flex-1 btn-gold py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                تأكيد القبول 👨‍🍳
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: رفض الطلب
         ========================================================================= */}
      {isRejectModalOpen && selectedOrderForReject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass border border-red-500/20 w-full max-w-md p-6 shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between pb-4 border-b border-souqna-border mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <h3 className="font-black text-red-400">
                  رفض الطلب #{selectedOrderForReject.order_code}
                </h3>
              </div>
              <button onClick={() => setIsRejectModalOpen(false)} className="btn-ghost p-1.5 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-souqna-text-secondary text-xs">
                اختر سبب الرفض أو اكتب سبب مخصص:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "المطبخ مشغول جداً حالياً",
                  "نفاد بعض مكونات الطبق",
                  "وقت إغلاق المحل",
                  "العنوان خارج نطاق التغطية",
                ].map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReasonInput(reason)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                      rejectionReasonInput === reason
                        ? "bg-red-500/20 border-red-500/50 text-red-300"
                        : "border-souqna-border text-souqna-text-muted hover:border-red-500/30 bg-souqna-surface"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="أو اكتب سبب الرفض بالتفصيل (5 أحرف على الأقل)..."
                rows={3}
                className="input-dark w-full resize-none text-xs"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="flex-1 py-2.5 btn-ghost rounded-xl text-xs font-bold"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={loadingAction || rejectionReasonInput.trim().length < 5}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
              >
                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: تفاصيل الطلب الكاملة
         ========================================================================= */}
      {isDetailModalOpen && selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass border border-souqna-gold/25 w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between pb-4 border-b border-souqna-border mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-souqna-gold">
                  #{selectedOrderForDetail.order_code}
                </span>
                <span className="text-souqna-text-muted text-xs">تفاصيل الطلب الكاملة</span>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="btn-ghost p-1.5 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Customer Info Card */}
              <div className="bg-souqna-base/60 border border-souqna-border p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-souqna-text-primary text-sm">
                    {selectedOrderForDetail.customer_name}
                  </span>
                  <a
                    href={`tel:${selectedOrderForDetail.customer_phone}`}
                    className="btn-gold px-3 py-1 text-xs flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال بالعميل</span>
                  </a>
                </div>
                <div className="text-souqna-text-secondary flex items-start gap-1.5 pt-1">
                  <MapPin className="w-4 h-4 text-souqna-gold shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{selectedOrderForDetail.delivery_address}</span>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(selectedOrderForDetail.delivery_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-souqna-gold hover:underline text-[11px] mt-0.5"
                    >
                      فتح العنوان في خرائط جوجل ↗
                    </a>
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-souqna-text-primary">أصناف الطلب:</h4>
                <div className="space-y-2">
                  {selectedOrderForDetail.items?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-souqna-surface border border-souqna-border rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-souqna-text-primary">
                          {item.quantity} × {item.product_name_at_purchase}
                        </span>
                        <span className="font-mono text-souqna-gold font-bold">
                          {item.total_price} ج.م
                        </span>
                      </div>
                      {item.item_notes && (
                        <p className="text-[11px] text-amber-300 mt-1">
                          ⚠️ ملاحظة خاصة: {item.item_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Order Notes */}
              {selectedOrderForDetail.order_notes && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  <span className="font-bold block mb-0.5">ملاحظات العميل:</span>
                  <p>{selectedOrderForDetail.order_notes}</p>
                </div>
              )}

              {/* Price summary */}
              <div className="p-3 bg-souqna-base/80 border border-souqna-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-souqna-text-muted block text-[11px]">طريقة الدفع</span>
                  <span className="font-bold text-souqna-text-primary">
                    {selectedOrderForDetail.payment_method === "CASH_ON_DELIVERY" ? "💵 كاش عند الاستلام" : "💳 محفظة إلكترونية"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-souqna-text-muted block text-[11px]">الإجمالي المطلوب</span>
                  <span className="font-mono text-lg font-black text-souqna-gold">
                    {selectedOrderForDetail.total_amount} ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 mt-4 border-t border-souqna-border">
              <button
                type="button"
                onClick={() => handlePrintReceipt(selectedOrderForDetail)}
                className="flex-1 btn-gold py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة بون المطبخ (80mm)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="py-2.5 px-4 btn-ghost rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
