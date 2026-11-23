<?php

namespace App\Listeners;

use App\Events\ReelLiked;
use App\Events\ReelSaved;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class SendReelInteractionNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * اسم طابور المهام لمعالجة التفاعلات
     */
    public string $queue = 'interactions';

    /**
     * معالجة حدث تسجيل الإعجاب بالفيديو
     */
    public function handleReelLiked(ReelLiked $event): void
    {
        $reel = $event->reel;
        $user = $event->user;
        $merchant = $reel->merchant;

        Log::info("🚀 [Queued Job] ReelLiked processed: User '{$user->full_name}' liked reel '{$reel->title}' for merchant '{$merchant?->store_name}'");

        // 1. إرسال Push Notification لصاحب المتجر (FCM / APNs)
        // Notification::send($merchant->owner, new NewLikeNotification($user, $reel));

        // 2. تحديث خوارزمية الترند والظهور للفيديو (Boost Reel Score)
        // ReelRecommendationService::boostScore($reel->id, weight: 2);
    }

    /**
     * معالجة حدث حفظ الفيديو في المفضلة
     */
    public function handleReelSaved(ReelSaved $event): void
    {
        $reel = $event->reel;
        $user = $event->user;
        $merchant = $reel->merchant;

        Log::info("🔖 [Queued Job] ReelSaved processed: User '{$user->full_name}' saved reel '{$reel->title}' to favorites");

        // إشعار أو تحديث نقاط الرغبة الشرائية للمنتج (High Purchase Intent)
    }
}
