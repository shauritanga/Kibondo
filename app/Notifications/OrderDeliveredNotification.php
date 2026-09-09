<?php

namespace App\Notifications;

use App\Models\Sale;
use App\Notifications\Concerns\DeterminesSmsChannels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderDeliveredNotification extends Notification implements ShouldQueue
{
    use DeterminesSmsChannels, Queueable;

    public function __construct(private Sale $sale) {}

    public function via(object $notifiable): array
    {
        return $this->guestOrRoutedChannels($notifiable);
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'Order Delivered',
            'body'  => "Your order {$this->sale->sale_number} has been delivered — please confirm receipt",
            'data'  => [
                'type'        => 'order_delivered',
                'sale_id'     => $this->sale->id,
                'sale_number' => $this->sale->sale_number,
                'url'         => "/store/orders/{$this->sale->id}",
            ],
        ];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'        => 'order_delivered',
            'sale_id'     => $this->sale->id,
            'sale_number' => $this->sale->sale_number,
            'message'     => "Your order {$this->sale->sale_number} has been delivered — please confirm receipt",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Your order {$this->sale->sale_number} has arrived")
            ->view('emails.notifications.order-delivered', ['sale' => $this->sale, 'customer_name' => $notifiable instanceof \App\Models\Customer ? $notifiable->name : ($this->sale->guest_name ?? 'Customer')]);
    }

    public function toSms(object $notifiable): string
    {
        if ($this->sale->customer_id) {
            return "Kibondo: Order {$this->sale->sale_number} delivered. Please confirm receipt in the app.";
        }

        return "Kibondo: Order {$this->sale->sale_number} delivered. Asante!";
    }
}
