<?php

namespace App\Enums;

enum DeliveryFulfillmentType: string
{
    case PLATFORM_DELIVERY = 'PLATFORM_DELIVERY';
    case MERCHANT_DELIVERY = 'MERCHANT_DELIVERY';
}
