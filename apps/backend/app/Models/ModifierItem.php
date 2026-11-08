<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModifierItem extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'group_id',
        'name',
        'extra_price',
        'is_available',
    ];

    protected $casts = [
        'extra_price' => 'decimal:2',
        'is_available' => 'boolean',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(ModifierGroup::class, 'group_id');
    }
}
