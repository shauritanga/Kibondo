<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ContactInquiryNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $firstName,
        public string $lastName,
        public string $phone,
        public string $email,
        public string $message,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $fullName = trim($this->firstName.' '.$this->lastName);

        return (new MailMessage)
            ->subject('New consultation inquiry from '.$fullName)
            ->replyTo($this->email, $fullName)
            ->view('emails.notifications.contact-inquiry', [
                'firstName'      => $this->firstName,
                'lastName'       => $this->lastName,
                'fullName'       => $fullName,
                'phone'          => $this->phone,
                'email'          => $this->email,
                'inquiryMessage' => $this->message,
                'receivedAt'     => now()->timezone(config('app.timezone'))->format('d M Y · H:i'),
            ]);
    }
}
