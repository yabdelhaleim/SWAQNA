<?php

namespace App\Models;

use App\Enums\DeliveryFulfillmentType;
use App\Enums\FulfillmentRequestStatus;
use App\Enums\MerchantStatus;
use App\Enums\MerchantType;
use Carbon\Carbon;
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
        'fulfillment_request_status',
        'requested_fulfillment_type',
        'fulfillment_request_notes',
        'preparation_time_minutes',
        'min_order_amount',
        'address_text',
        'location',
        'delivery_radius_km',
        'avg_rating',
        'total_reviews',
        'commission_rate',
    ];

    protected function casts(): array
    {
        return [
            'merchant_type' => MerchantType::class,
            'status' => MerchantStatus::class,
            'fulfillment_type' => DeliveryFulfillmentType::class,
            'fulfillment_request_status' => FulfillmentRequestStatus::class,
            'min_order_amount' => 'decimal:2',
            'delivery_radius_km' => 'decimal:2',
            'avg_rating' => 'decimal:2',
            'total_reviews' => 'integer',
            'preparation_time_minutes' => 'integer',
            'commission_rate' => 'decimal:2',
        ];
    }

    public function getStoreNameAttribute(): string
    {
        return $this->name ?? 'متجر سوقنا';
    }

    /**
     * هل المتجر مفتوح ومستعد لاستقبال الطلبات الآن بناءً على توقيت مصر؟
     */
    public function isOpenNow(): bool
    {
        $now = Carbon::now('Africa/Cairo');
        $dayOfWeek = (int) $now->dayOfWeek; // 0 (Sunday) to 6 (Saturday)
        $currentTime = $now->format('H:i:s');

        // استخدام الـ loaded relationship لتجنب أي N+1 query
        $hours = $this->relationLoaded('businessHours')
            ? $this->businessHours->firstWhere('day_of_week', $dayOfWeek)
            : $this->businessHours()->where('day_of_week', $dayOfWeek)->first();

        if (!$hours) {
            return true; // إذا لم يحدد أوقات العمل بعد، يعتبر مفتوحاً افتراضياً
        }

        if ($hours->is_closed) {
            return false;
        }

        return $currentTime >= $hours->open_time && $currentTime <= $hours->close_time;
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
