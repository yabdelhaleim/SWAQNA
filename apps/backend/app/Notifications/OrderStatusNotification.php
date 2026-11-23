<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrderStatusNotification extends Notification
{
    use Queueable;

    public Order $order;
    public string $status;
    public ?string $reason;

    public function __construct(Order $order, string $status, ?string $reason = null)
    {
        $this->order = $order;
        $this->status = strtoupper($status);
        $this->reason = $reason;
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        $storeName = $this->order->merchant?->store_name ?? 'المطعم';
        $code = $this->order->order_code;

        [$title, $body, $icon] = match ($this->status) {
            'CONFIRMED', 'ACCEPTED' => [
                "تم قبول طلبك من {$storeName} 👨‍🍳",
                "المطعم استلم طلبك (#{$code}) وسيبدأ في تحضيره حالاً!",
                '👨‍🍳',
            ],
            'PREPARING' => [
                "طلبك قيد التحضير في {$storeName} 🔥",
                "الشيف بيجهز طلبك (#{$code}) بعناية وأصالة!",
                '🍲',
            ],
            'READY' => [
                "طلبك جاهز للتسليم 📦",
                "طلبك (#{$code}) جاهز وفي انتظار مندوب التوصيل لاستلامه.",
                '📦',
            ],
            'OUT_FOR_DELIVERY' => [
                "الكابتن في الطريق إليك 🛵",
                "مندوب التوصيل استلم طلبك (#{$code}) ومتجه لعنوانك الآن!",
                '🛵',
            ],
            'DELIVERED' => [
                "وصل طلبك! بألف هنا وشفا 🎉",
                "تم تسليم طلبك (#{$code}) بنجاح، ما تنساش تقيّم تجربتك والشيف!",
                '😋',
            ],
            'CANCELLED' => [
                "تم إلغاء الطلب (#{$code}) ❌",
                $this->reason ? "سبب الإلغاء: {$this->reason}" : "تم إلغاء طلبك بنجاح.",
                '❌',
            ],
            'REJECTED' => [
                "عذراً، تعذر قبول طلبك (#{$code}) ⚠️",
                $this->reason ? "رسالة المطعم: {$this->reason}" : "المطعم غير قادر على تلبية الطلب حالياً.",
                '⚠️',
            ],
            default => [
                "تحديث على طلبك (#{$code})",
                "حالة الطلب الحالية: {$this->status}",
                '🔔',
            ],
        };

        return [
            'order_id'   => $this->order->id,
            'order_code' => $code,
            'title'      => $title,
            'body'       => $body,
            'icon'       => $icon,
            'status'     => $this->status,
            'type'       => 'ORDER_STATUS',
        ];
    }
}
