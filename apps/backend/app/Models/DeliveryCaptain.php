<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryCaptain extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'phone',
        'vehicle_type',
        'status',
        'current_zone',
        'rating',
        'completed_today',
        'total_earnings_today',
    ];

    protected function casts(): array
    {
        return [
            'rating'               => 'decimal:2',
            'completed_today'      => 'integer',
            'total_earnings_today' => 'decimal:2',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'captain_id');
    }
}
