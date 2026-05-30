<?php

namespace App\Channels;

use App\Services\Sms\PhoneNumber;
use App\Services\Sms\SmsClient;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Notification;
use RuntimeException;

class SmsChannel
{
    public function __construct(private SmsClient $sms) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toSms')) {
            return;
        }

        $message = $notification->toSms($notifiable);
        $content = is_string($message) ? $message : $message->content;
        $phone = $this->phoneFor($notifiable);

        if (! $phone) {
            return;
        }

        $result = $this->sms->send($phone, $content);

        if (! $result->successful) {
            throw new RuntimeException($result->error ?: 'SMS delivery failed.');
        }
    }

    private function phoneFor(mixed $notifiable): ?string
    {
        if ($notifiable instanceof AnonymousNotifiable) {
            return PhoneNumber::normalize($notifiable->routeNotificationFor('sms'));
        }

        if (method_exists($notifiable, 'routeNotificationForSms')) {
            return PhoneNumber::normalize($notifiable->routeNotificationForSms());
        }

        return PhoneNumber::normalize($notifiable->phone ?? null);
    }
}
