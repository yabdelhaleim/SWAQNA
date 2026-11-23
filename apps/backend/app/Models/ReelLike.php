<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReelLike extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'reel_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reel(): BelongsTo
    {
        return $this->belongsTo(Reel::class);
    }
}
