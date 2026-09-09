<?php

namespace App\Notifications\Concerns;

use App\Models\Customer;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Notifications\AnonymousNotifiable;

trait DeterminesSmsChannels
{
    /**
     * Channels for a registered customer (with SMS).
     */
    protected function customerChannels(): array
    {
        return ['database', 'mail', 'fcm', 'sms'];
    }

    /**
     * Channels for staff users (SMS only when phone is present).
     */
    protected function staffChannels(object $notifiable): array
    {
        $channels = ['database', 'mail', 'fcm'];

        if ($notifiable instanceof User && PhoneNumber::isValid($notifiable->phone)) {
            $channels[] = 'sms';
        }

        return $channels;
    }

    /**
     * Channels for guests / on-demand routes (mail and/or sms).
     */
    protected function guestOrRoutedChannels(object $notifiable): array
    {
        if ($notifiable instanceof AnonymousNotifiable) {
            $channels = [];
            if (isset($notifiable->routes['mail'])) {
                $channels[] = 'mail';
            }
            if (isset($notifiable->routes['sms'])) {
                $channels[] = 'sms';
            }

            return $channels ?: ['mail'];
        }

        if ($notifiable instanceof Customer) {
            return $this->customerChannels();
        }

        return ['mail'];
    }
}
