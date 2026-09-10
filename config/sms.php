<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default SMS Driver
    |--------------------------------------------------------------------------
    |
    | Supported: "log", "nextsms"
    |
    */

    'default' => env('SMS_DRIVER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Default Sender ID
    |--------------------------------------------------------------------------
    */

    'from' => env('SMS_FROM', 'KIBONDO'),

    /*
    |--------------------------------------------------------------------------
    | Bulk send chunk size
    |--------------------------------------------------------------------------
    |
    | Max recipients per NextSMS /api/sms/v2/text/single request when to is an array.
    |
    */

    'bulk_chunk_size' => (int) env('SMS_BULK_CHUNK_SIZE', 100),

    /*
    |--------------------------------------------------------------------------
    | SMS Drivers
    |--------------------------------------------------------------------------
    */

    'drivers' => [

        'log' => [
            'driver' => 'log',
        ],

        'nextsms' => [
            'driver'       => 'nextsms',
            'username'     => env('NEXTSMS_USERNAME'),
            'password'     => env('NEXTSMS_PASSWORD'),
            // Basic auth: base64(username:password) — also accepts NEXTSMS_API_KEY_B64
            'api_key'      => env('NEXTSMS_API_KEY', env('NEXTSMS_API_KEY_B64')),
            // Bearer token from dashboard (Customer Info → API Keys) — preferred by API V2
            'bearer_token' => env('NEXTSMS_BEARER_TOKEN', env('NEXTSMS_TOKEN')),
            'base_url'     => env('NEXTSMS_BASE_URL', 'https://messaging-service.co.tz'),
            'sender_id'    => env('NEXTSMS_SENDER_ID', env('SMS_FROM', 'KIBONDO')),
            // true → /api/sms/v2/test/text/single (no charge)
            'sandbox'      => (bool) env('NEXTSMS_SANDBOX', false),
        ],

    ],

];
