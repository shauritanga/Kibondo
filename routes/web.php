<?php

use Illuminate\Support\Facades\Route;

// Client storefront — must be declared before the staff catch-all
Route::get('/store/{any?}', fn () => view('client'))->where('any', '.*');

// Staff dashboard — catch-all for all other URLs
Route::get('/{any}', fn () => view('staff'))->where('any', '.*');
