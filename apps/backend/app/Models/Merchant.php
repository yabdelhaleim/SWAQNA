<?php

namespace App\Models;

use App\Enums\DeliveryFulfillmentType;
use App\Enums\MerchantStatus;
use App\Enums\MerchantType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Merchant extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'merchant_type',
        'logo_url',
        'cover_image_url',
        'phone_number',
        'status',
        'fulfillment_type',
        'preparation_time_minutes',
        'min_order_amount',
        'address_text',
        'location',
        'delivery_radius_km',
        'avg_rating',
        'total_reviews',
    ];

    protected function casts(): array
    {
        return [
            'merchant_type' => MerchantType::class,
            'status' => MerchantStatus::class,
            'fulfillment_type' => DeliveryFulfillmentType::class,
            'min_order_amount' => 'decimal:2',
            'delivery_radius_km' => 'decimal:2',
            'avg_rating' => 'decimal:2',
            'total_reviews' => 'integer',
            'preparation_time_minutes' => 'integer',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function businessHours(): HasMany
    {
        return $this->hasMany(MerchantBusinessHour::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function modifierGroups(): HasMany
    {
        return $this->hasMany(ModifierGroup::class);
    }

    public function reels(): HasMany
    {
        return $this->hasMany(Reel::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
