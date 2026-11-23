<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerAddress extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'customer_addresses';

    protected $fillable = [
        'user_id',
        'label',
        'title',
        'city',
        'area',
        'street',
        'building',
        'floor',
        'apartment',
        'landmark',
        'phone',
        'latitude',
        'longitude',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    protected $appends = [
        'formatted_address',
        'label_icon',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getFormattedAddressAttribute(): string
    {
        $parts = [];
        if (!empty($this->street)) $parts[] = $this->street;
        if (!empty($this->building)) $parts[] = "عمارة {$this->building}";
        if (!empty($this->floor)) $parts[] = "الدور {$this->floor}";
        if (!empty($this->apartment)) $parts[] = "شقة {$this->apartment}";
        if (!empty($this->area)) $parts[] = $this->area;
        if (!empty($this->city)) $parts[] = $this->city;
        if (!empty($this->landmark)) $parts[] = "(علامة مميزة: {$this->landmark})";

        return implode('، ', $parts);
    }

    public function getLabelIconAttribute(): string
    {
        return match ($this->label) {
            'home' => '🏠',
            'work' => '🏢',
            default => '📍',
        };
    }
}
