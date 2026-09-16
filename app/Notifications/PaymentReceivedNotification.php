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
        $orderPrice = number_format($this->orderPrice());

        return [
            'title' => 'Payment Received',
            'body'  => "Payment received for {$this->sale->sale_number}. Order amount: TZS {$orderPrice}",
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
        $orderPrice = number_format($this->orderPrice());

        return [
            'type'        => 'payment_received',
            'sale_id'     => $this->sale->id,
            'sale_number' => $this->sale->sale_number,
            'payment_id'  => $this->payment->id,
            'message'     => "Payment received for {$this->sale->sale_number}. Order amount: TZS {$orderPrice}",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $customerName = $notifiable instanceof \App\Models\Customer
            ? $notifiable->name
            : ($this->sale->guest_name ?? 'Customer');

        return (new MailMessage)
            ->subject("Payment received for {$this->sale->sale_number}")
            ->view('emails.notifications.payment-received', [
                'sale'          => $this->sale,
                'payment'       => $this->payment,
                'customer_name' => $customerName,
                'order_price'   => $this->orderPrice(),
                'outstanding'   => $this->orderOutstanding(),
            ]);
    }

    public function toSms(object $notifiable): string
    {
        $orderPrice = number_format($this->orderPrice());
        $message = "Dear customer, Payment received for {$this->sale->sale_number}. Order amount: TZS {$orderPrice}.";

        $outstanding = $this->orderOutstanding();
        if ($outstanding > 0) {
            $message .= ' Outstanding: TZS ' . number_format($outstanding) . '.';
        }

        return $message;
    }

    /**
     * Merchandise total only — delivery cost is excluded from customer payment messaging.
     */
    private function orderPrice(): int
    {
        return (int) $this->sale->subtotal;
    }

    /**
     * Remaining balance on the order price (excludes delivery cost).
     */
    private function orderOutstanding(): int
    {
        return max(0, $this->orderPrice() - (int) $this->sale->paid_amount);
    }
}
