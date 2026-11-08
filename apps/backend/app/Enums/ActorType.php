<?php

namespace App\Enums;

enum ActorType: string
{
    case CUSTOMER = 'CUSTOMER';
    case MERCHANT = 'MERCHANT';
    case DELIVERY_CAPTAIN = 'DELIVERY_CAPTAIN';
    case ADMIN = 'ADMIN';
    case SYSTEM = 'SYSTEM';
}
