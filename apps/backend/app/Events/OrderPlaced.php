<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderPlaced implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Order $order;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * القناة الخاصة بالمطعم - فقط المطعم المعني يسمع الطلب
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('merchant.' . $this->order->merchant_id),
        ];
    }

    /**
     * اسم الحدث في الفرونت إند
     */
    public function broadcastAs(): string
    {
        return 'OrderPlaced';
    }

    /**
     * البيانات المرسلة عبر الـ WebSocket
     */
    public function broadcastWith(): array
    {
        $this->order->loadMissing(['items.product', 'items.variant', 'items.modifiers', 'customer']);

        return [
            'order' => [
                'id'               => $this->order->id,
                'order_code'       => $this->order->order_code ?? ('ORD-' . substr($this->order->id, 0, 6)),
                'status'           => $this->order->status->value ?? (string) $this->order->status,
                'total_amount'     => (float) $this->order->total_amount,
                'delivery_fee'     => (float) $this->order->delivery_fee,
                'subtotal_amount'  => (float) $this->order->subtotal_amount,
                'items_count'      => $this->order->items->count(),
                'customer_name'    => $this->order->customer_name ?? $this->order->customer?->full_name ?? 'عميل سوقنا',
                'customer_phone'   => $this->order->customer_phone ?? $this->order->customer?->phone_number ?? '',
                'delivery_address' => $this->order->delivery_address,
                'order_notes'      => $this->order->order_notes,
                'created_at'       => $this->order->created_at->toISOString(),
                'items'            => $this->order->items->map(fn($item) => [
                    'id'                       => $item->id,
                    'product_name_at_purchase' => $item->product_name_at_purchase ?? $item->product?->name ?? 'وجبة',
                    'variant_name'             => $item->variant?->name,
                    'item_notes'               => $item->item_notes,
                    'quantity'                 => $item->quantity,
                    'unit_price'               => (float) $item->unit_price,
                    'total_price'              => (float) $item->total_price,
                    'modifiers'                => $item->modifiers->map(fn($m) => [
                        'name'  => $m->name,
                        'price' => (float) $m->price,
                    ])->values(),
                ]),
            ],
            'sound'   => 'chime',
            'message' => 'طلب جديد وصل! #' . ($this->order->order_code ?? substr($this->order->id, 0, 6)),
        ];
    }
}
