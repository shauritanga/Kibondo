<?php

use Illuminate\Support\Facades\Route;

// All routes are handled by the React SPA.
// API routes live in routes/api.php under /api/v1/*.
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
