<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case CASH_ON_DELIVERY = 'CASH_ON_DELIVERY';
    case ONLINE_CARD = 'ONLINE_CARD';
    case WALLET = 'WALLET';
    case HYBRID_WALLET_CASH = 'HYBRID_WALLET_CASH';
}
