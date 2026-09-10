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
    | SMS Drivers
    |--------------------------------------------------------------------------
    */

    'drivers' => [

        'log' => [
            'driver' => 'log',
        ],

        'nextsms' => [
            'driver'   => 'nextsms',
            'username' => env('NEXTSMS_USERNAME'),
            'password' => env('NEXTSMS_PASSWORD'),
            'api_key'  => env('NEXTSMS_API_KEY', env('NEXTSMS_API_KEY_B64')),
            'base_url' => env('NEXTSMS_BASE_URL', 'https://messaging-service.co.tz'),
            'sender_id'=> env('NEXTSMS_SENDER_ID', env('SMS_FROM', 'KIBONDO')),
            'sandbox'  => (bool) env('NEXTSMS_SANDBOX', false),
        ],

    ],

];
