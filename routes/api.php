<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerNoteController;
use App\Http\Controllers\CustomerTaskController;
use App\Http\Controllers\OfflineQueueController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/auth/login', [AuthController::class, 'login']);

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/me/password', [AuthController::class, 'updatePassword']);

    // Users (admin only)
    Route::apiResource('users', UserController::class)->middleware('role:admin');

    // Categories
    Route::apiResource('categories', CategoryController::class);

    // Products
    Route::get('/products/{product}/movements', [ProductController::class, 'movements']);
    Route::apiResource('products', ProductController::class);

    // Stock movements
    Route::get('/stock-movements', [StockMovementController::class, 'index']);
    Route::post('/stock-movements', [StockMovementController::class, 'store'])->middleware('role:admin,stock_manager');

    // Customers + nested notes & tasks
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('customers.notes', CustomerNoteController::class)->shallow();
    Route::apiResource('customers.tasks', CustomerTaskController::class)->shallow();

    // Sales
    Route::put('/sales/{sale}/status', [SaleController::class, 'updateStatus']);
    Route::apiResource('sales', SaleController::class);

    // Payments
    Route::apiResource('payments', PaymentController::class)->only(['index', 'store', 'show']);

    // Offline queue sync
    Route::post('/offline-queue/sync', [OfflineQueueController::class, 'sync']);

    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('/dashboard', [ReportController::class, 'dashboard']);
        Route::get('/sales', [ReportController::class, 'sales']);
        Route::get('/sales-by-product', [ReportController::class, 'salesByProduct']);
        Route::get('/best-sellers', [ReportController::class, 'bestSellers']);
        Route::get('/stock-movement-summary', [ReportController::class, 'stockMovementSummary']);
        Route::get('/stock-value', [ReportController::class, 'stockValue']);
        Route::get('/customer-balances', [ReportController::class, 'customerBalances']);
        Route::get('/payment-summary', [ReportController::class, 'paymentSummary']);
    });
});
