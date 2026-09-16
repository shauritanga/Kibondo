<?php

namespace App\Channels;

use App\Services\SmsService;
use App\Support\PhoneNumber;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class SmsChannel
{
    public function __construct(private SmsService $sms) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toSms')) {
            return;
        }

        $phone = $this->resolvePhone($notifiable);
        if (! $phone) {
            return;
        }

        $body = $notification->toSms($notifiable);
        if (! is_string($body) || trim($body) === '') {
            return;
        }

        $meta = [
            'type'              => class_basename($notification),
            'notifiable_type'   => is_object($notifiable) ? $notifiable::class : null,
            'notifiable_id'     => is_object($notifiable) ? ($notifiable->id ?? null) : null,
        ];

        try {
            $this->sms->send($phone, $body, $meta);
        } catch (\Throwable $e) {
            Log::error('SMS channel send failed', ['error' => $e->getMessage()]);
        }
    }

    private function resolvePhone(mixed $notifiable): ?string
    {
        if (is_object($notifiable) && method_exists($notifiable, 'routeNotificationFor')) {
            $routed = $notifiable->routeNotificationFor('sms', null);
            if (is_string($routed) && $routed !== '') {
                return PhoneNumber::normalize($routed) ?? $routed;
            }
        }

        // On-demand notification: Notification::route('sms', $phone)
        if (is_object($notifiable) && isset($notifiable->routes['sms'])) {
            $routed = $notifiable->routes['sms'];
            if (is_string($routed)) {
                return PhoneNumber::normalize($routed) ?? $routed;
            }
        }

        $phone = is_object($notifiable) ? ($notifiable->phone ?? null) : null;

        return PhoneNumber::normalize($phone);
    }
}
