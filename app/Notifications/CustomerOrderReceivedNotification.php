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
        return "Dear Customer, Thank you for your order {$this->sale->sale_number}. We have received it and it is now being processed. We will confirm your delivery date and tracking details shortly. Thank you for choosing us. Best regards";
    }
}
