<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PENDING = 'PENDING';
    case PREPARING = 'PREPARING';
    case READY = 'READY';
    case ASSIGNED_TO_DELIVERY = 'ASSIGNED_TO_DELIVERY';
    case PICKED_UP = 'PICKED_UP';
    case DELIVERED = 'DELIVERED';
    case CANCELLED = 'CANCELLED';
    case REJECTED = 'REJECTED';
}
