<?php

namespace App\Jobs;

use App\Enums\ActorType;
use App\Enums\OrderStatus;
use App\Events\OrderCancelled;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AutoCancelUnacceptedOrder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $orderId;

    /**
     * Create a new job instance.
     */
    public function __construct(string $orderId)
    {
        $this->orderId = $orderId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $order = Order::find($this->orderId);

        if (!$order) {
            return;
        }

        // إذا كان الطلب ما زال معلقاً بعد انقضاء المدة المحددة (SLA)
        $currentStatus = $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status;

        if ($currentStatus === 'PENDING') {
            Log::info("Auto-cancelling unaccepted order {$order->id} after timeout.");

            $reason = 'تم إلغاء الطلب تلقائياً لعدم استجابة المطعم في الوقت المحدد';

            $order->update([
                'status'       => OrderStatus::CANCELLED,
                'cancelled_at' => now(),
            ]);

            $order->statusHistory()->create([
                'previous_status' => OrderStatus::PENDING,
                'new_status'      => OrderStatus::CANCELLED,
                'actor_id'        => null,
                'actor_type'      => ActorType::SYSTEM,
                'reason'          => $reason,
            ]);

            // بث الإلغاء عبر الـ WebSocket لكلا الطرفين
            event(new OrderCancelled($order, $reason, 'SYSTEM'));
        }
    }
}
