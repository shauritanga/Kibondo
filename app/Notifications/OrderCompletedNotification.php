<?php

namespace App\Notifications;

use App\Models\Sale;
use App\Notifications\Concerns\DeterminesSmsChannels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderCompletedNotification extends Notification implements ShouldQueue
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
            'title' => 'Order Completed',
            'body'  => "Your order {$this->sale->sale_number} is complete. Thank you!",
            'data'  => [
                'type'        => 'order_completed',
                'sale_id'     => $this->sale->id,
                'sale_number' => $this->sale->sale_number,
                'url'         => "/store/orders/{$this->sale->id}",
            ],
        ];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'        => 'order_completed',
            'sale_id'     => $this->sale->id,
            'sale_number' => $this->sale->sale_number,
            'message'     => "Your order {$this->sale->sale_number} is complete",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $name = $notifiable instanceof \App\Models\Customer
            ? $notifiable->name
            : ($this->sale->guest_name ?? 'Customer');

        return (new MailMessage)
            ->subject("Order {$this->sale->sale_number} completed")
            ->greeting("Hello {$name},")
            ->line("Your order {$this->sale->sale_number} has been marked complete. Asante!");
    }

    public function toSms(object $notifiable): string
    {
        return "Kibondo: Order {$this->sale->sale_number} is complete. Asante!";
    }
}
