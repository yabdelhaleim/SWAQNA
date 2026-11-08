<?php

namespace App\Enums;

enum MerchantStatus: string
{
    case PENDING_APPROVAL = 'PENDING_APPROVAL';
    case ACTIVE = 'ACTIVE';
    case SUSPENDED = 'SUSPENDED';
}
