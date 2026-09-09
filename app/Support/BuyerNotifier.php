<?php

namespace App\Support;

use App\Models\Sale;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

class BuyerNotifier
{
    public static function notify(Sale $sale, Notification $notification): void
    {
        if ($sale->customer_id) {
            $sale->loadMissing('customer');
            $sale->customer?->notify($notification);

            return;
        }

        $pending = null;

        if ($sale->guest_email) {
            $pending = NotificationFacade::route('mail', [$sale->guest_email => $sale->guest_name ?? 'Customer']);
        }

        $phone = PhoneNumber::normalize($sale->guest_phone);
        if ($phone) {
            $pending = $pending
                ? $pending->route('sms', $phone)
                : NotificationFacade::route('sms', $phone);
        }

        $pending?->notify($notification);
    }
}
