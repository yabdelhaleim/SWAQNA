<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reel extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'merchant_id',
        'product_id',
        'title',
        'caption',
        'video_url',
        'video_hls_url',
        'thumbnail_url',
        'duration_seconds',
        'views_count',
        'likes_count',
        'shares_count',
        'saves_count',
        'comments_count',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'views_count'      => 'integer',
            'likes_count'      => 'integer',
            'shares_count'     => 'integer',
            'saves_count'      => 'integer',
            'comments_count'   => 'integer',
            'is_active'        => 'boolean',
        ];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function likes(): HasMany
    {
        return $this->hasMany(ReelLike::class);
    }

    public function saves(): HasMany
    {
        return $this->hasMany(ReelSave::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(ReelComment::class)->whereNull('parent_id');
    }

    public function isLikedBy(?User $user): bool
    {
        if (!$user) return false;
        return $this->likes()->where('user_id', $user->id)->exists();
    }

    public function isSavedBy(?User $user): bool
    {
        if (!$user) return false;
        return $this->saves()->where('user_id', $user->id)->exists();
    }
}
