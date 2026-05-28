<?php

use Illuminate\Support\Facades\Route;

// Client storefront — must be declared before the staff catch-all
Route::get('/store/{any?}', fn () => view('client'))->where('any', '.*');

// Staff dashboard SPA — exclude Sanctum, API, and public assets (see /sanctum/csrf-cookie)
Route::get('/{any?}', fn () => view('staff'))
    ->where('any', '^(?!(?:sanctum|api|storage|build|up)(?:/|$)).*');
