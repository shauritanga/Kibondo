<?php

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Clear stale FCM tokens older than 60 days
Schedule::call(function () {
    $cutoff = now()->subDays(60);
    User::whereNotNull('fcm_token')->where('fcm_token_updated_at', '<', $cutoff)
        ->update(['fcm_token' => null, 'fcm_token_updated_at' => null]);
    Customer::whereNotNull('fcm_token')->where('fcm_token_updated_at', '<', $cutoff)
        ->update(['fcm_token' => null, 'fcm_token_updated_at' => null]);
})->weekly();

// Daily database backup at 02:00 — production only
Schedule::command('db:backup')
    ->dailyAt('02:00')
    ->environments(['production'])
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/backup.log'));
