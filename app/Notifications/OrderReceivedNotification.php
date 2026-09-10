<?php

namespace App\Notifications;

use App\Models\Sale;
use App\Notifications\Concerns\DeterminesSmsChannels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderReceivedNotification extends Notification implements ShouldQueue
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
            'title' => 'Order Received',
            'body'  => "We received your order {$this->sale->sale_number}. We will confirm delivery soon.",
            'data'  => [
                'type'        => 'order_received',
                'sale_id'     => $this->sale->id,
                'sale_number' => $this->sale->sale_number,
                'url'         => "/store/orders/{$this->sale->id}",
            ],
        ];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'        => 'order_received',
            'sale_id'     => $this->sale->id,
            'sale_number' => $this->sale->sale_number,
            'message'     => "We received your order {$this->sale->sale_number}",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $name = $notifiable instanceof \App\Models\Customer
            ? $notifiable->name
            : ($this->sale->guest_name ?? 'Customer');

        return (new MailMessage)
            ->subject("We received your order {$this->sale->sale_number}")
            ->greeting("Hello {$name},")
            ->line("Thank you for your order {$this->sale->sale_number}. We will contact you to confirm delivery.");
    }

    public function toSms(object $notifiable): string
    {
        return "Dear customer, we received your order {$this->sale->sale_number}. We will confirm delivery soon.";
    }
}
