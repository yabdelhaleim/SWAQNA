<?php

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// قناة المستخدم الشخصية
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (string) $user->id === (string) $id;
});

// قناة المطعم الخاصة - فقط صاحب المطعم أو مديره يقدر يستمع إليها
Broadcast::channel('merchant.{merchantId}', function ($user, $merchantId) {
    if (!$user) {
        return false;
    }

    // تحقق من علاقة التاجر مع المستخدم
    if ($user->merchant && (string) $user->merchant->id === (string) $merchantId) {
        return true;
    }

    // أو إذا كان المستخدم مرتبط بالمتجر مباشرة
    if (isset($user->merchant_id) && (string) $user->merchant_id === (string) $merchantId) {
        return true;
    }

    return false;
});

// قناة الطلب الخاصة - يستمع إليها العميل صاحب الطلب، أو التاجر الذي ينفذ الطلب
Broadcast::channel('order.{orderId}', function ($user, $orderId) {
    if (!$user) {
        return false;
    }

    $order = Order::find($orderId);
    if (!$order) {
        return false;
    }

    // هل المستخدم هو العميل صاحب الطلب؟
    if ((string) $order->customer_id === (string) $user->id) {
        return true;
    }

    // هل المستخدم هو التاجر صاحب المطعم المنفذ؟
    if ($user->merchant && (string) $order->merchant_id === (string) $user->merchant->id) {
        return true;
    }

    return false;
});
