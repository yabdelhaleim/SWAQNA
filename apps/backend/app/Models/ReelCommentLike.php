<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReelCommentLike extends Model
{
    use HasUuids;

    // جدول الإعجابات على التعليقات — بدون timestamps تلقائية (created_at فقط)
    public $timestamps = false;

    protected $table = 'reel_comment_likes';

    protected $fillable = [
        'comment_id',
        'user_id',
        'created_at',
    ];

    public function comment(): BelongsTo
    {
        return $this->belongsTo(ReelComment::class, 'comment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
