<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CampaignController;
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
use App\Http\Controllers\Store\CustomerAuthController;
use App\Http\Controllers\Store\OrderController;
use App\Http\Controllers\Store\StoreController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// ─── Staff Auth ───────────────────────────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:auth');

// ─── Storefront – public ──────────────────────────────────────────────────────
Route::prefix('store')->middleware('throttle:store-api')->group(function () {
    Route::get('/products', [StoreController::class, 'products']);
    Route::get('/categories', [StoreController::class, 'categories']);
    Route::post('/auth/register', [CustomerAuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/auth/login', [CustomerAuthController::class, 'login'])->middleware('throttle:auth');
});

// ─── Storefront – customer authenticated ─────────────────────────────────────
Route::prefix('store')->middleware(['auth:customer', 'throttle:store-api'])->group(function () {
    Route::post('/auth/logout', [CustomerAuthController::class, 'logout']);
    Route::get('/auth/me', [CustomerAuthController::class, 'me']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:orders');
    Route::get('/orders/{sale}', [OrderController::class, 'show']);
    Route::post('/orders/{sale}/confirm', [OrderController::class, 'confirm']);
});

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

    // Campaigns (admin send, all can read)
    Route::get('/campaigns/recipient-preview', [CampaignController::class, 'recipientPreview']);
    Route::post('/campaigns/{campaign}/send', [CampaignController::class, 'send']);
    Route::apiResource('campaigns', CampaignController::class)->only(['index', 'store', 'show', 'destroy']);

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
