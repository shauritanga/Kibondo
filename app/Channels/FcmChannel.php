<?php

namespace App\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Exception\Messaging\NotFound;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FcmNotification;

class FcmChannel
{
    public function __construct(private Messaging $messaging) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        $token = $notifiable->fcm_token ?? null;
        if (! $token || ! method_exists($notification, 'toFcm')) {
            return;
        }

        ['title' => $title, 'body' => $body, 'data' => $data] = $notification->toFcm($notifiable);

        $message = CloudMessage::withTarget('token', $token)
            ->withNotification(FcmNotification::create($title, $body))
            ->withData(array_map('strval', $data));

        try {
            $this->messaging->send($message);
        } catch (NotFound) {
            $notifiable->update(['fcm_token' => null, 'fcm_token_updated_at' => null]);
            Log::info('FCM token cleared (stale)', ['id' => $notifiable->id]);
        } catch (\Throwable $e) {
            Log::error('FCM send failed', ['error' => $e->getMessage()]);
        }
    }
}
