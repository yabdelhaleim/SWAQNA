<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModifierGroup extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'merchant_id',
        'name',
        'is_required',
        'min_selection',
        'max_selection',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'min_selection' => 'integer',
        'max_selection' => 'integer',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ModifierItem::class, 'group_id')->orderBy('sort_order');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(
            Product::class,
            'product_modifier_groups',
            'modifier_group_id',
            'product_id'
        )->withTimestamps();
    }
}
