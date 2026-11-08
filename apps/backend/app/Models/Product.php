<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'merchant_id',
        'category_id',
        'name',
        'description',
        'base_price',
        'image_url',
        'is_available',
        'track_inventory',
        'stock_quantity',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'is_available' => 'boolean',
            'track_inventory' => 'boolean',
            'stock_quantity' => 'integer',
        ];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function modifierGroups(): BelongsToMany
    {
        return $this->belongsToMany(
            ModifierGroup::class,
            'product_modifier_groups',
            'product_id',
            'modifier_group_id'
        );
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function reels(): HasMany
    {
        return $this->hasMany(Reel::class);
    }
}
