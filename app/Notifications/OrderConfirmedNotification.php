<?php

namespace App\Notifications;

use App\Models\Sale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderConfirmedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private Sale $sale) {}

    public function via(object $notifiable): array
    {
        return $notifiable instanceof \App\Models\Customer
            ? ['database', 'mail', 'fcm']
            : ['mail'];
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
            ->view('emails.notifications.order-confirmed', ['sale' => $this->sale, 'customer' => $notifiable]);
    }
}
