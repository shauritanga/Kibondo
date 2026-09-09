<?php

namespace App\Notifications;

use App\Models\Sale;
use App\Notifications\Concerns\DeterminesSmsChannels;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderPlacedNotification extends Notification
{
    use DeterminesSmsChannels, Queueable;

    public function __construct(private Sale $sale) {}

    public function via(object $notifiable): array
    {
        return $this->staffChannels($notifiable);
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'New Order',
            'body'  => "Order {$this->sale->sale_number} has been placed",
            'data'  => [
                'type'        => 'order_placed',
                'sale_id'     => $this->sale->id,
                'sale_number' => $this->sale->sale_number,
                'url'         => '/pos',
            ],
        ];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'        => 'order_placed',
            'sale_id'     => $this->sale->id,
            'sale_number' => $this->sale->sale_number,
            'message'     => "New order {$this->sale->sale_number} placed",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("New order: {$this->sale->sale_number}")
            ->view('emails.notifications.order-placed', ['sale' => $this->sale]);
    }

    public function toSms(object $notifiable): string
    {
        return "Kibondo: New order {$this->sale->sale_number} placed. Open POS to review.";
    }
}
