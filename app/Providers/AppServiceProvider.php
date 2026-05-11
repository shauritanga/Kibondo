<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    private function configureRateLimiting(): void
    {
        // Auth attempts: 10 per minute per IP
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Store API: 120 requests per minute per IP
        RateLimiter::for('store-api', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });

        // Order placement: 10 orders per minute per customer
        RateLimiter::for('orders', function (Request $request) {
            return Limit::perMinute(10)->by(
                optional($request->user('customer'))->id ?? $request->ip()
            );
        });
    }
}
