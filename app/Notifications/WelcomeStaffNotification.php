<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeStaffNotification extends Notification implements ShouldQueue
{
    use Queueable;

    private static array $roleLabels = [
        'admin'         => 'Administrator — full access to all features and settings',
        'sales'         => 'Sales — create sales, manage customers and process payments',
        'stock_manager' => 'Stock Manager — manage products, stock levels and movements',
        'accountant'    => 'Accountant — view reports and payment records',
        'delivery'      => 'Delivery — view and update assigned delivery orders',
    ];

    public function __construct(private string $role) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $loginUrl  = rtrim(config('app.url'), '/') . '/login';
        $roleLabel = self::$roleLabels[$this->role] ?? ucfirst($this->role);

        return (new MailMessage)
            ->subject('Welcome to Kibondo Green — Your account is ready')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('Your Kibondo Green account has been activated.')
            ->line('**Role:** ' . $roleLabel)
            ->action('Log in to Kibondo Green', $loginUrl)
            ->line('If you have any questions, contact your administrator.')
            ->salutation('— The Kibondo Green Team');
    }
}
