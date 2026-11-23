<?php

namespace App\Models;

use App\Enums\DeliveryFulfillmentType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'order_code',
        'customer_id',
        'merchant_id',
        'delivery_captain_id',
        'delivery_address_id',
        'customer_name',
        'customer_phone',
        'delivery_address',
        'fulfillment_type',
        'subtotal_amount',
        'delivery_fee',
        'discount_amount',
        'coupon_code',
        'coupon_id',
        'total_amount',
        'payment_method',
        'paid_from_wallet_amount',
        'remaining_cash_amount',
        'is_paid',
        'status',
        'delivery_pin',
        'prep_time_minutes',
        'order_notes',
        'rejection_reason',
        'accepted_at',
        'ready_at',
        'delivered_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'fulfillment_type' => DeliveryFulfillmentType::class,
            'payment_method' => PaymentMethod::class,
            'status' => OrderStatus::class,
            'subtotal_amount' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'paid_from_wallet_amount' => 'decimal:2',
            'remaining_cash_amount' => 'decimal:2',
            'is_paid' => 'boolean',
            'prep_time_minutes' => 'integer',
            'accepted_at' => 'datetime',
            'ready_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function deliveryCaptain(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivery_captain_id');
    }

    public function address(): BelongsTo
    {
        return $this->belongsTo(CustomerAddress::class, 'delivery_address_id');
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class);
    }
}
