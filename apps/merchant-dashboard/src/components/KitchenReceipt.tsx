"use client";

import React from "react";
import { Printer, X } from "lucide-react";

export interface ReceiptOrder {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  status: string;
  payment_method: string;
  total_amount: number;
  prep_time_minutes?: number;
  order_notes?: string;
  created_at?: string;
  items: Array<{
    product_name_at_purchase: string;
    unit_price: number;
    quantity: number;
    total_price: number;
    item_notes?: string;
    variant_name?: string;
    modifiers?: Array<{ name: string; price: number }>;
  }>;
}

interface KitchenReceiptProps {
  order: ReceiptOrder | null;
  storeName?: string;
  onClose?: () => void;
  showPreviewModal?: boolean;
}

export default function KitchenReceipt({
  order,
  storeName = "متجر سوقنا",
  onClose,
  showPreviewModal = false,
}: KitchenReceiptProps) {
  if (!order) return null;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const formattedDate = new Date().toLocaleString("ar-EG", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const ReceiptContent = () => (
    <div
      className="text-black font-mono text-right p-4 leading-relaxed"
      style={{
        direction: "rtl",
        fontFamily: "'Cairo', 'Courier New', monospace",
        width: "100%",
        maxWidth: "80mm",
        margin: "0 auto",
      }}
    >
      {/* ── Header ── */}
      <div className="text-center pb-2 mb-2 border-b-2 border-black border-dashed">
        <h1 className="text-xl font-black tracking-tight">سـوقـنا</h1>
        <h2 className="text-sm font-bold mt-0.5">{storeName}</h2>
        <div className="inline-block mt-1 px-2 py-0.5 border border-black font-bold text-xs">
          بون تشغيل المطبخ (KITCHEN TICKET)
        </div>
      </div>

      {/* ── Order Code & Date ── */}
      <div className="text-center py-2 mb-2 border-b-2 border-black border-dashed">
        <div className="text-2xl font-black tracking-wider">#{order.order_code}</div>
        <div className="text-[11px] font-bold text-stone-700 mt-1">
          التاريخ: {formattedDate}
        </div>
        {order.prep_time_minutes && (
          <div className="text-xs font-black mt-1 bg-black text-white px-2 py-0.5 inline-block">
            وقت التحضير المستهدف: {order.prep_time_minutes} دقيقة
          </div>
        )}
      </div>

      {/* ── Customer Info ── */}
      <div className="text-xs pb-2 mb-2 border-b-2 border-black border-dashed space-y-1">
        <div className="flex justify-between">
          <span className="font-black">{order.customer_name}</span>
          <span className="font-bold">:العميل</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold" dir="ltr">{order.customer_phone}</span>
          <span className="font-bold">:الموبايل</span>
        </div>
        <div className="text-right">
          <span className="font-bold block">:العنوان</span>
          <span className="font-bold text-[11px] block pr-2">{order.delivery_address}</span>
        </div>
      </div>

      {/* ── Items List ── */}
      <div className="pb-2 mb-2 border-b-2 border-black border-dashed">
        <div className="flex justify-between text-xs font-black pb-1 mb-1 border-b border-black">
          <span>الإجمالي</span>
          <span>الصنف</span>
          <span>العدد</span>
        </div>

        <div className="space-y-2 text-xs">
          {order.items.map((item, idx) => (
            <div key={idx} className="pb-1 border-b border-stone-300">
              <div className="flex justify-between items-start font-bold">
                <span className="font-mono">{item.total_price} ج</span>
                <span className="flex-1 px-2 font-black text-sm">{item.product_name_at_purchase}</span>
                <span className="font-mono font-black text-base px-1">×{item.quantity}</span>
              </div>
              {item.variant_name && (
                <div className="text-[11px] font-bold text-stone-700 pr-2">
                  الحجم: {item.variant_name}
                </div>
              )}
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="text-[11px] font-bold text-stone-700 pr-2">
                  + {item.modifiers.map((m) => m.name).join("، ")}
                </div>
              )}
              {item.item_notes && (
                <div className="text-[11px] font-black pr-2 text-stone-900 bg-amber-100 p-0.5 mt-0.5 border-r-2 border-amber-500">
                  ⚠️ تعليمات الشيف: {item.item_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Overall Order Notes ── */}
      {order.order_notes && (
        <div className="pb-2 mb-2 border-b-2 border-black border-dashed text-xs">
          <span className="font-black block">ملاحظات الطلب الخاصة:</span>
          <div className="bg-stone-100 p-1.5 border border-black font-bold text-[11px] mt-1">
            {order.order_notes}
          </div>
        </div>
      )}

      {/* ── Totals & Payment ── */}
      <div className="pb-2 mb-2 border-b-2 border-black border-dashed space-y-1 text-xs">
        <div className="flex justify-between text-sm font-black pt-1">
          <span className="font-mono text-base">{order.total_amount} ج.م</span>
          <span>إجمالي الحساب:</span>
        </div>
        <div className="flex justify-between text-xs font-bold pt-1">
          <span>
            {order.payment_method === "CASH_ON_DELIVERY"
              ? "💵 كاش عند الاستلام"
              : "💳 مدفوع مسبقاً بالمحفظة"}
          </span>
          <span>طريقة الدفع:</span>
        </div>
      </div>

      {/* ── Cut line footer ── */}
      <div className="text-center pt-1 text-[11px] font-bold">
        <div>*** شكراً لاختياركم منصة سوقنا ***</div>
        <div className="mt-1 tracking-widest">---------------------------------</div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Hidden Print Area (used exclusively by @media print) ── */}
      <div id="kitchen-receipt-print-area" className="hidden">
        <ReceiptContent />
      </div>

      {/* ── Optional On-Screen Preview Modal ── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 print:hidden animate-in fade-in" dir="rtl">
          <div className="card-glass border border-souqna-gold/30 max-w-sm w-full p-4 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-souqna-border mb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-souqna-gold" />
                <span className="font-bold text-sm text-souqna-text-primary">
                  معاينة بون المطبخ (80mm)
                </span>
              </div>
              {onClose && (
                <button onClick={onClose} className="btn-ghost p-1 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Receipt Preview Container (white paper mockup) */}
            <div className="bg-white rounded-xl overflow-y-auto flex-1 shadow-inner border border-stone-300">
              <ReceiptContent />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-3 mt-3 border-t border-souqna-border">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 btn-ghost rounded-xl text-xs font-bold"
                >
                  إغلاق
                </button>
              )}
              <button
                type="button"
                onClick={handlePrint}
                className="flex-2 btn-gold py-2 text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة البون الآن (Print) 🖨️</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
