<?php

namespace App\Events;

use App\Models\ReelComment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReelCommentPosted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $payload;

    public function __construct(ReelComment $comment)
    {
        // بناء الـ payload اللي هيتبعت عبر WebSocket للعملاء
        $this->payload = [
            'id'         => $comment->id,
            'reel_id'    => $comment->reel_id,
            'parent_id'  => $comment->parent_id,
            'comment'    => $comment->comment,
            'likes_count' => $comment->likes_count,
            'is_pinned'  => $comment->is_pinned,
            'is_liked'   => false, // عند الاستلام يُحدّد كل عميل بنفسه
            'created_at' => $comment->created_at?->toIso8601String(),
            'user' => [
                'id'         => $comment->user?->id,
                'name'       => $comment->user?->full_name ?? 'عميل سوقنا',
                'avatar_url' => $comment->user?->avatar_url ?? null,
            ],
            'replies' => [],
        ];
    }

    /**
     * قناة البث — عامة (public) لأن الريلز عامة للجميع
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('reels.' . $this->payload['reel_id']),
        ];
    }

    /**
     * اسم الحدث اللي هيتبعت — Flutter هيستمع عليه
     */
    public function broadcastAs(): string
    {
        return 'ReelCommentPosted';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
