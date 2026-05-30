<?php

namespace App\Notifications;

use App\Models\Customer;
use App\Models\Sale;
use App\Notifications\Concerns\ResolvesBuyerChannels;
use App\Support\Sms\SmsMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;
    use ResolvesBuyerChannels;

    public function __construct(private Sale $sale, private string $recipientType) {}

    public function via(object $notifiable): array
    {
        if ($this->recipientType === 'customer') {
            return $this->buyerChannels($notifiable);
        }

        return ['database', 'mail', 'fcm', 'sms'];
    }

    public function toSms(object $notifiable): SmsMessage
    {
        if ($this->recipientType === 'delivery') {
            return new SmsMessage("New delivery assignment {$this->sale->sale_number}.");
        }

        return new SmsMessage("Dear customer, your order {$this->sale->sale_number} is out for delivery. Please keep your phone nearby.");
    }

    public function toFcm(object $notifiable): array
    {
        if ($this->recipientType === 'delivery') {
            return [
                'title' => 'New Delivery Assignment',
                'body'  => "You have been assigned delivery {$this->sale->sale_number}",
                'data'  => [
                    'type'        => 'delivery_assigned',
                    'sale_id'     => $this->sale->id,
                    'sale_number' => $this->sale->sale_number,
                    'url'         => '/pos',
                ],
            ];
        }

        return [
            'title' => 'Order On Its Way',
            'body'  => "Your order {$this->sale->sale_number} is out for delivery",
            'data'  => [
                'type'        => 'order_out_for_delivery',
                'sale_id'     => $this->sale->id,
                'sale_number' => $this->sale->sale_number,
                'url'         => "/store/orders/{$this->sale->id}",
            ],
        ];
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
            ->view('emails.notifications.order-assigned-customer', [
                'sale'          => $this->sale,
                'customer'      => $notifiable instanceof Customer ? $notifiable : null,
                'customer_name' => $notifiable instanceof Customer ? $notifiable->name : ($this->sale->guest_name ?? 'Customer'),
            ]);
    }
}
