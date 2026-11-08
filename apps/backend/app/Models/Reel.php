<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reel extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'merchant_id',
        'product_id',
        'title',
        'caption',
        'video_hls_url',
        'thumbnail_url',
        'duration_seconds',
        'views_count',
        'likes_count',
        'is_active',
    ];

    protected $casts = [
        'duration_seconds' => 'integer',
        'views_count' => 'integer',
        'likes_count' => 'integer',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
