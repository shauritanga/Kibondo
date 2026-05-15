<?php

namespace App\Notifications;

use App\Models\Sale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private Sale $sale, private string $recipientType) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        if ($this->recipientType === 'delivery') {
            return [
                'type'        => 'delivery_assigned',
                'sale_id'     => $this->sale->id,
                'sale_number' => $this->sale->sale_number,
                'message'     => "You have been assigned delivery {$this->sale->sale_number}",
            ];
        }

        return [
            'type'        => 'order_out_for_delivery',
            'sale_id'     => $this->sale->id,
            'sale_number' => $this->sale->sale_number,
            'message'     => "Your order {$this->sale->sale_number} is on the way",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        if ($this->recipientType === 'delivery') {
            return (new MailMessage)
                ->subject("New delivery assignment: {$this->sale->sale_number}")
                ->view('emails.notifications.order-assigned-delivery', ['sale' => $this->sale, 'user' => $notifiable]);
        }

        return (new MailMessage)
            ->subject("Your order {$this->sale->sale_number} is on its way")
            ->view('emails.notifications.order-assigned-customer', ['sale' => $this->sale, 'customer' => $notifiable]);
    }
}
