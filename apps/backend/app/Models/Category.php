<?php

namespace App\Models;

use App\Enums\MerchantType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'merchant_id',
        'name',
        'icon_url',
        'target_merchant_type',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'target_merchant_type' => MerchantType::class,
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
