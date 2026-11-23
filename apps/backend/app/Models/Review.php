<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'reviews';

    protected $fillable = [
        'order_id',
        'customer_id',
        'merchant_id',
        'rating',
        'comment',
        'tags',
    ];

    protected $casts = [
        'rating' => 'integer',
        'tags' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    protected static function booted()
    {
        static::saved(function (Review $review) {
            $merchant = $review->merchant;
            if ($merchant) {
                $avg = Review::where('merchant_id', $merchant->id)->avg('rating') ?: 0;
                $count = Review::where('merchant_id', $merchant->id)->count();
                $merchant->update([
                    'avg_rating' => round($avg, 2),
                    'total_reviews' => $count,
                ]);
            }
        });
    }
}
