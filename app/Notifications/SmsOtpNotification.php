<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Generic SMS OTP — used for phone verify, password reset, change-phone.
 */
class SmsOtpNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private string $otp,
        private string $purposeLabel = 'verification',
    ) {}

    public function via(object $notifiable): array
    {
        return ['sms'];
    }

    public function toSms(object $notifiable): string
    {
        return "Kibondo {$this->purposeLabel} code: {$this->otp}. Valid 10 min.";
    }
}
