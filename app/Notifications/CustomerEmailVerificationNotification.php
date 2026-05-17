<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CustomerEmailVerificationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $expires = now()->addHours(24)->timestamp;
        $hash    = hash_hmac(
            'sha256',
            $notifiable->getKey() . '|' . $notifiable->getEmailForVerification() . '|' . $expires,
            config('app.key')
        );

        $url = route('store.verification.verify', [
            'id'   => $notifiable->getKey(),
            'hash' => $hash,
        ]) . '?expires=' . $expires;

        return (new MailMessage)
            ->subject('Verify your Kibondo account')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('Please click the button below to verify your email address. The link expires in 24 hours.')
            ->action('Verify Email', $url)
            ->line('If you did not create an account, no action is required.');
    }
}
