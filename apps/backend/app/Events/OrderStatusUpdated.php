<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Order $order;
    public string $reason;

    public function __construct(Order $order, string $reason = '')
    {
        $this->order = $order;
        $this->reason = $reason;
    }

    /**
     * يتبعت للعميل على قناة طلبه، وللمطعم على قناته لتحديث الشاشات المتصلة
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('order.' . $this->order->id),
            new PrivateChannel('merchant.' . $this->order->merchant_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'OrderStatusUpdated';
    }

    public function broadcastWith(): array
    {
        $statusValue = $this->order->status->value ?? (string) $this->order->status;
        
        $statusArabic = match ($statusValue) {
            'PENDING'    => 'في انتظار موافقة المطعم',
            'PREPARING'  => 'جاري تحضير الوجبة',
            'READY'      => 'جاهز للاستلام والتوصيل',
            'PICKED_UP'  => 'تم استلامه من قِبل المندوب',
            'ON_THE_WAY' => 'الطلب في الطريق إليك 🛵',
            'DELIVERED'  => 'تم التوصيل بنجاح 🍽️',
            'CANCELLED'  => 'تم إلغاء الطلب',
            'REJECTED'   => 'تم رفض الطلب',
            default      => $statusValue,
        };

        return [
            'order_id'       => $this->order->id,
            'order_code'     => $this->order->order_code ?? ('ORD-' . substr($this->order->id, 0, 6)),
            'status'         => $statusValue,
            'status_arabic'  => $statusArabic,
            'reason'         => $this->reason,
            'prep_time_minutes' => $this->order->prep_time_minutes,
            'updated_at'     => now()->toISOString(),
            'message'        => 'تحديث لحالة الطلب: ' . $statusArabic,
        ];
    }
}
