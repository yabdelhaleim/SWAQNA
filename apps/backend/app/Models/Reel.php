<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'views_count'      => 'integer',
            'likes_count'      => 'integer',
            'shares_count'     => 'integer',
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
}
