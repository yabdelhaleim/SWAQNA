<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderCancelled implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Order $order;
    public string $reason;
    public string $cancelledBy;

    public function __construct(Order $order, string $reason = 'تم إلغاء الطلب', string $cancelledBy = 'CUSTOMER')
    {
        $this->order = $order;
        $this->reason = $reason;
        $this->cancelledBy = $cancelledBy;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('merchant.' . $this->order->merchant_id),
            new PrivateChannel('order.' . $this->order->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'OrderCancelled';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id'       => $this->order->id,
            'order_code'     => $this->order->order_code ?? ('ORD-' . substr($this->order->id, 0, 6)),
            'status'         => 'CANCELLED',
            'reason'         => $this->reason,
            'cancelled_by'   => $this->cancelledBy,
            'updated_at'     => now()->toISOString(),
            'message'        => '⚠️ تنبيه: تم إلغاء الطلب #' . ($this->order->order_code ?? substr($this->order->id, 0, 6)),
        ];
    }
}
