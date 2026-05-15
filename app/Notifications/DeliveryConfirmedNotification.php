<?php

namespace App\Notifications;

use App\Models\Sale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DeliveryConfirmedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private Sale $sale) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail', 'fcm'];
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
}
