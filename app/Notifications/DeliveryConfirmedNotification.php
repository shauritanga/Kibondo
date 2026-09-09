<?php

namespace App\Notifications;

use App\Models\Sale;
use App\Notifications\Concerns\DeterminesSmsChannels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DeliveryConfirmedNotification extends Notification implements ShouldQueue
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
            'title' => 'Delivery Confirmed',
            'body'  => "Customer confirmed receipt of {$this->sale->sale_number}",
            'data'  => [
                'type'        => 'delivery_confirmed',
                'sale_id'     => $this->sale->id,
                'sale_number' => $this->sale->sale_number,
                'url'         => '/pos',
            ],
        ];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'        => 'delivery_confirmed',
            'sale_id'     => $this->sale->id,
            'sale_number' => $this->sale->sale_number,
            'message'     => "Customer confirmed receipt of {$this->sale->sale_number}",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Delivery confirmed: {$this->sale->sale_number}")
            ->view('emails.notifications.delivery-confirmed', ['sale' => $this->sale]);
    }

    public function toSms(object $notifiable): string
    {
        return "Kibondo: Customer confirmed receipt of {$this->sale->sale_number}.";
    }
}
