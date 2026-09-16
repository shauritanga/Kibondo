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
            'body'  => "Thank you for your order {$this->sale->sale_number}. We have received it and it is now being processed.",
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
            'message'     => "Thank you for your order {$this->sale->sale_number}. We have received it and it is now being processed.",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $customerName = $notifiable instanceof \App\Models\Customer
            ? $notifiable->name
            : ($this->sale->guest_name ?? 'Customer');

        return (new MailMessage)
            ->subject("Thank you for your order {$this->sale->sale_number}")
            ->view('emails.notifications.order-received', [
                'sale'          => $this->sale,
                'customer_name' => $customerName,
            ]);
    }

    public function toSms(object $notifiable): string
    {
        return "Dear Customer, Thank you for your order {$this->sale->sale_number}. We have received it and it is now being processed. We will confirm your delivery date and tracking details shortly. Thank you for choosing us. Best regards";
    }
}
