<?php

namespace App\Models;

use App\Enums\ActorType;
use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderStatusHistory extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $table = 'order_status_history';

    protected $fillable = [
        'order_id',
        'previous_status',
        'new_status',
        'actor_id',
        'actor_type',
        'reason',
    ];

    protected $casts = [
        'previous_status' => OrderStatus::class,
        'new_status' => OrderStatus::class,
        'actor_type' => ActorType::class,
        'created_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
