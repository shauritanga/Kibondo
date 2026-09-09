<?php

namespace App\Notifications;

use App\Models\Payment;
use App\Models\Sale;
use App\Notifications\Concerns\DeterminesSmsChannels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentReceivedNotification extends Notification implements ShouldQueue
{
    use DeterminesSmsChannels, Queueable;

    public function __construct(private Payment $payment, private Sale $sale) {}

    public function via(object $notifiable): array
    {
        return $this->guestOrRoutedChannels($notifiable);
    }

    public function toFcm(object $notifiable): array
    {
        $amount = number_format($this->payment->amount);

        return [
            'title' => 'Payment Received',
            'body'  => "Payment of TZS {$amount} received for {$this->sale->sale_number}",
            'data'  => [
                'type'        => 'payment_received',
                'sale_id'     => $this->sale->id,
                'sale_number' => $this->sale->sale_number,
                'payment_id'  => $this->payment->id,
                'url'         => "/store/orders/{$this->sale->id}",
            ],
        ];
    }

    public function toDatabase(object $notifiable): array
    {
        $amount = number_format($this->payment->amount);

        return [
            'type'        => 'payment_received',
            'sale_id'     => $this->sale->id,
            'sale_number' => $this->sale->sale_number,
            'payment_id'  => $this->payment->id,
            'message'     => "Payment of TZS {$amount} received for {$this->sale->sale_number}",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $amount = number_format($this->payment->amount);
        $name = $notifiable instanceof \App\Models\Customer
            ? $notifiable->name
            : ($this->sale->guest_name ?? 'Customer');

        return (new MailMessage)
            ->subject("Payment received for {$this->sale->sale_number}")
            ->greeting("Hello {$name},")
            ->line("We received your payment of TZS {$amount} for order {$this->sale->sale_number}.")
            ->line('Outstanding balance: TZS ' . number_format($this->sale->outstanding));
    }

    public function toSms(object $notifiable): string
    {
        $amount = number_format($this->payment->amount);

        return "Kibondo: Payment TZS {$amount} received for {$this->sale->sale_number}. Outstanding: TZS " . number_format($this->sale->outstanding);
    }
}
