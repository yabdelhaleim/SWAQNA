<?php

namespace App\Enums;

enum UserRole: string
{
    case CUSTOMER = 'CUSTOMER';
    case DELIVERY_CAPTAIN = 'DELIVERY_CAPTAIN';
    case MERCHANT_OWNER = 'MERCHANT_OWNER';
    case ADMIN = 'ADMIN';
    case SUPER_ADMIN = 'SUPER_ADMIN';
}
