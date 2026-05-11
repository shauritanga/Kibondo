<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily database backup at 02:00 — production only
Schedule::command('db:backup')
    ->dailyAt('02:00')
    ->environments(['production'])
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/backup.log'));
