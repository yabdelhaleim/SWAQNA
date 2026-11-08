<?php

namespace App\Enums;

enum MerchantType: string
{
    case RESTAURANT = 'RESTAURANT';
    case RETAIL_SHOP = 'RETAIL_SHOP';
    case HOME_KITCHEN = 'HOME_KITCHEN';
}
