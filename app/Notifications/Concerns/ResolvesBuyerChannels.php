<?php

namespace App\Notifications\Concerns;

use App\Models\Customer;
use Illuminate\Notifications\AnonymousNotifiable;

trait ResolvesBuyerChannels
{
    private function buyerChannels(object $notifiable): array
    {
        if ($notifiable instanceof Customer) {
            $channels = ['database', 'fcm'];

            return match ($notifiable->order_notification_channel ?? 'email') {
                'sms' => [...$channels, 'sms'],
                'both' => [...$channels, 'mail', 'sms'],
                default => [...$channels, 'mail'],
            };
        }

        if ($notifiable instanceof AnonymousNotifiable) {
            $channels = [];

            if ($notifiable->routeNotificationFor('mail')) {
                $channels[] = 'mail';
            }

            if ($notifiable->routeNotificationFor('sms')) {
                $channels[] = 'sms';
            }

            return $channels;
        }

        return ['mail'];
    }
}
