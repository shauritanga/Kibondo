<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StaffLoginOtpNotification extends Notification
{
    public function __construct(private string $otp) {}

    public function via(object $notifiable): array
    {
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
}
