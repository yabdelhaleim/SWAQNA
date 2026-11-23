<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReelComment extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'reel_comments';

    protected $fillable = [
        'reel_id',
        'user_id',
        'parent_id',
        'comment',
        'likes_count',
        'is_pinned',
    ];

    protected $casts = [
        'likes_count' => 'integer',
        'is_pinned' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reel(): BelongsTo
    {
        return $this->belongsTo(Reel::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ReelComment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(ReelComment::class, 'parent_id')->orderBy('created_at', 'asc');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(ReelCommentLike::class, 'comment_id');
    }

    public function isLikedBy(?User $user): bool
    {
        if (!$user) return false;
        return $this->likes()->where('user_id', $user->id)->exists();
    }

    protected static function booted()
    {
        static::created(function (ReelComment $comment) {
            $comment->reel()->increment('comments_count');
        });

        static::deleted(function (ReelComment $comment) {
            $comment->reel()->decrement('comments_count');
        });
    }
}
