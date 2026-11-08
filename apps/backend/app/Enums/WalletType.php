<?php

namespace App\Enums;

enum WalletType: string
{
    case CUSTOMER = 'CUSTOMER';
    case MERCHANT = 'MERCHANT';
    case DELIVERY_CAPTAIN = 'DELIVERY_CAPTAIN';
    case PLATFORM_REVENUE = 'PLATFORM_REVENUE';
}
