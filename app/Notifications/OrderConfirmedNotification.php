<?php

namespace App\Notifications;

use App\Models\Sale;
use App\Notifications\Concerns\ResolvesBuyerChannels;
use App\Support\Sms\SmsMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderConfirmedNotification extends Notification
{
    use ResolvesBuyerChannels;

    public function __construct(private Sale $sale) {}

    public function via(object $notifiable): array
    {
        return $this->buyerChannels($notifiable);
    }

    public function toSms(object $notifiable): SmsMessage
    {
        return new SmsMessage("Dear customer, your order {$this->sale->sale_number} has been confirmed. We will notify you when it is out for delivery.");
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'Order Confirmed',
            'body'  => "Your order {$this->sale->sale_number} has been confirmed",
            'data'  => [
                'type'        => 'order_confirmed',
                'sale_id'     => $this->sale->id,
                'sale_number' => $this->sale->sale_number,
                'url'         => "/store/orders/{$this->sale->id}",
            ],
        ];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'        => 'order_confirmed',
            'sale_id'     => $this->sale->id,
            'sale_number' => $this->sale->sale_number,
            'message'     => "Your order {$this->sale->sale_number} has been confirmed",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Your order {$this->sale->sale_number} is confirmed")
            ->view('emails.notifications.order-confirmed', ['sale' => $this->sale, 'customer_name' => $notifiable instanceof \App\Models\Customer ? $notifiable->name : ($this->sale->guest_name ?? 'Customer')]);
    }
}
