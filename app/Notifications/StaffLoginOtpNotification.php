<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StaffLoginOtpNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private string $otp, private string $channel = 'email') {}

    public function via(object $notifiable): array
    {
        if ($this->channel === 'sms') {
            return ['sms'];
        }

        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Kibondo login code')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('Use the code below to complete your sign-in. It expires in 10 minutes.')
            ->line('**' . $this->otp . '**')
            ->line('If you did not request this code, someone may be trying to access your account. You can safely ignore this email.');
    }

    public function toSms(object $notifiable): string
    {
        return "Kibondo login code: {$this->otp}. Valid 10 min. Do not share.";
    }
}
