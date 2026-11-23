<?php

namespace App\Http\Controllers\Api\v1\Customer;

use App\Events\ReelCommentPosted;
use App\Http\Controllers\Controller;
use App\Models\Reel;
use App\Models\ReelComment;
use App\Models\ReelCommentLike;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReelCommentController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // GET /reels/{id}/comments — جلب التعليقات بـ cursor pagination
    // ─────────────────────────────────────────────────────────────────────────
    public function index(Request $request, string $reelId): JsonResponse
    {
        $reel = Reel::findOrFail($reelId);
        $user = $request->user(); // ممكن يكون null (زائر)

        $perPage = 20;
        $cursor  = $request->input('cursor'); // آخر comment_id لجلب ما بعده

        $query = ReelComment::with([
                'user:id,full_name,avatar_url',
                'replies.user:id,full_name,avatar_url',
            ])
            ->where('reel_id', $reelId)
            ->whereNull('parent_id') // فقط التعليقات الأب (مش الردود)
            ->orderByDesc('is_pinned') // المثبّتة أولاً
            ->orderByDesc('created_at');

        // Cursor pagination
        if ($cursor) {
            $pivot = ReelComment::find($cursor);
            if ($pivot) {
                $query->where(function ($q) use ($pivot) {
                    $q->where('created_at', '<', $pivot->created_at)
                      ->orWhere(function ($q2) use ($pivot) {
                          $q2->where('created_at', '=', $pivot->created_at)
                             ->where('id', '<', $pivot->id);
                      });
                });
            }
        }

        $comments = $query->limit($perPage + 1)->get();
        $hasMore  = $comments->count() > $perPage;
        if ($hasMore) $comments->pop();

        $nextCursor = $hasMore ? $comments->last()?->id : null;

        // جمع كل الـ comment_ids (تعليقات + ردود) لاستعلام إعجابات واحد
        $allIds = $comments->flatMap(fn($c) => [$c->id, ...$c->replies->pluck('id')->toArray()])->unique()->filter()->values()->toArray();

        $likedIds = $user
            ? ReelCommentLike::where('user_id', $user->id)->whereIn('comment_id', $allIds)->pluck('comment_id')->flip()->toArray()
            : [];

        $formatted = $comments->map(fn($c) => $this->formatComment($c, $likedIds));

        return response()->json([
            'success'     => true,
            'data'        => $formatted,
            'next_cursor' => $nextCursor,
            'has_more'    => $hasMore,
            'reel' => [
                'id'             => $reel->id,
                'comments_count' => $reel->comments_count,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /reels/{id}/comments — نشر تعليق جديد (requires auth)
    // ─────────────────────────────────────────────────────────────────────────
    public function store(Request $request, string $reelId): JsonResponse
    {
        $reel = Reel::findOrFail($reelId);

        $validated = $request->validate([
            'comment'   => 'required|string|max:500',
            'parent_id' => 'nullable|exists:reel_comments,id',
        ]);

        // إذا كان رد، تأكد إن الأب ينتمي لنفس الريل
        if (!empty($validated['parent_id'])) {
            $parentExists = ReelComment::where('id', $validated['parent_id'])
                ->where('reel_id', $reelId)
                ->whereNull('parent_id') // ممنوع رد على رد (1 مستوى فقط)
                ->exists();

            if (!$parentExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'التعليق الأصلي غير موجود أو لا يمكن الرد عليه',
                ], 422);
            }
        }

        $comment = ReelComment::create([
            'reel_id'   => $reelId,
            'user_id'   => $request->user()->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'comment'   => $validated['comment'],
        ]);

        $comment->load('user:id,full_name,avatar_url');

        // بث الحدث عبر WebSocket (فقط التعليقات الجديدة — مش الردود)
        if (empty($validated['parent_id'])) {
            broadcast(new ReelCommentPosted($comment));
        }

        return response()->json([
            'success' => true,
            'message' => 'تم نشر تعليقك بنجاح 🎉',
            'data'    => $this->formatComment($comment, []),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /comments/{id}/like — تبديل الإعجاب (toggle like)
    // ─────────────────────────────────────────────────────────────────────────
    public function toggleLike(Request $request, string $commentId): JsonResponse
    {
        $comment = ReelComment::findOrFail($commentId);
        $userId  = $request->user()->id;

        $existingLike = ReelCommentLike::where('comment_id', $commentId)
            ->where('user_id', $userId)
            ->first();

        DB::transaction(function () use ($comment, $userId, $existingLike, &$isLiked) {
            if ($existingLike) {
                $existingLike->delete();
                $comment->decrement('likes_count');
                $isLiked = false;
            } else {
                ReelCommentLike::create([
                    'comment_id' => $comment->id,
                    'user_id'    => $userId,
                    'created_at' => now(),
                ]);
                $comment->increment('likes_count');
                $isLiked = true;
            }
        });

        $comment->refresh();

        return response()->json([
            'success'     => true,
            'is_liked'    => $isLiked,
            'likes_count' => $comment->likes_count,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /comments/{id} — حذف تعليق (صاحبه فقط)
    // ─────────────────────────────────────────────────────────────────────────
    public function destroy(Request $request, string $commentId): JsonResponse
    {
        $comment = ReelComment::findOrFail($commentId);

        if ($comment->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح لك بحذف هذا التعليق',
            ], 403);
        }

        // حذف الردود أولاً (يُشغّل الـ booted hook لكل واحد)
        $comment->replies()->each(fn($reply) => $reply->delete());
        $comment->delete(); // هيُنقّص comments_count تلقائياً

        return response()->json([
            'success' => true,
            'message' => 'تم حذف التعليق',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper — تنسيق التعليق للـ response
    // ─────────────────────────────────────────────────────────────────────────
    private function formatComment(ReelComment $comment, array $likedIds): array
    {
        return [
            'id'          => $comment->id,
            'reel_id'     => $comment->reel_id,
            'parent_id'   => $comment->parent_id,
            'comment'     => $comment->comment,
            'likes_count' => $comment->likes_count,
            'is_liked'    => array_key_exists($comment->id, $likedIds),
            'is_pinned'   => $comment->is_pinned,
            'created_at'  => $comment->created_at?->toIso8601String(),
            'time_ago'    => $this->timeAgo($comment->created_at),
            'user' => [
                'id'         => $comment->user?->id,
                'name'       => $comment->user?->full_name ?? 'عميل سوقنا',
                'avatar_url' => $comment->user?->avatar_url ?? null,
            ],
            'replies' => ($comment->relationLoaded('replies'))
                ? $comment->replies->map(fn($r) => $this->formatComment($r, $likedIds))->values()->toArray()
                : [],
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper — وقت نسبي بالعربي
    // ─────────────────────────────────────────────────────────────────────────
    private function timeAgo(?\Carbon\Carbon $date): string
    {
        if (!$date) return 'الآن';

        $seconds = now()->diffInSeconds($date);

        if ($seconds < 60)      return 'منذ لحظات';
        if ($seconds < 3600)    return 'منذ ' . floor($seconds / 60) . ' دقيقة';
        if ($seconds < 86400)   return 'منذ ' . floor($seconds / 3600) . ' ساعة';
        if ($seconds < 2592000) return 'منذ ' . floor($seconds / 86400) . ' يوم';

        return 'منذ ' . floor($seconds / 2592000) . ' شهر';
    }
}
