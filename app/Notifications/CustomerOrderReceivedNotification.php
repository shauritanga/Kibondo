<?php

namespace App\Notifications;

use App\Models\Sale;
use Illuminate\Notifications\Notification;

class CustomerOrderReceivedNotification extends Notification
{
    public function __construct(private Sale $sale) {}

    public function via(object $notifiable): array
    {
        return ['sms'];
    }

    public function toSms(object $notifiable): string
    {
        return "Dear customer, tumepokea order yako {$this->sale->sale_number}. Tutakutaarifu kila hatua ya order yako.";
    }
}
