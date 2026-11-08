<?php

namespace App\Enums;

enum FulfillmentRequestStatus: string
{
    case NONE = 'NONE';
    case PENDING_APPROVAL = 'PENDING_APPROVAL';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';
}
