<?php

use App\Http\Controllers\AuditController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerNoteController;
use App\Http\Controllers\CustomerTaskController;
use App\Http\Controllers\DeliveryZoneController;
use App\Http\Controllers\OfflineQueueController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\FcmTokenController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Store\CustomerAuthController;
use App\Http\Controllers\Store\CustomerFcmTokenController;
use App\Http\Controllers\Store\CustomerNotificationController;
use App\Http\Controllers\Store\OrderController;
use App\Http\Controllers\Store\StoreController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// ─── Staff Auth ───────────────────────────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:auth');

// ─── Storefront – public ──────────────────────────────────────────────────────
Route::prefix('store')->middleware('throttle:store-api')->group(function () {
    Route::get('/products', [StoreController::class, 'products']);
    Route::get('/categories', [StoreController::class, 'categories']);
    Route::get('/delivery-zones', [DeliveryZoneController::class, 'publicIndex']);
    Route::get('/settings/social-links', [SettingController::class, 'socialLinks']);
    Route::post('/auth/register', [CustomerAuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/auth/login', [CustomerAuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:orders');
});

// ─── Storefront – customer authenticated ─────────────────────────────────────
Route::prefix('store')->middleware(['auth.customer', 'throttle:store-api'])->group(function () {
    Route::post('/auth/logout', [CustomerAuthController::class, 'logout']);
    Route::get('/auth/me', [CustomerAuthController::class, 'me']);
    Route::put('/auth/me', [CustomerAuthController::class, 'updateProfile']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{sale}', [OrderController::class, 'show']);
    Route::post('/orders/{sale}/confirm', [OrderController::class, 'confirm']);
    Route::get('/notifications', [CustomerNotificationController::class, 'index']);
    Route::post('/notifications/read-all', [CustomerNotificationController::class, 'markAllRead']);
    Route::delete('/notifications/read', [CustomerNotificationController::class, 'clearRead']);
    Route::patch('/notifications/{id}/read', [CustomerNotificationController::class, 'markRead']);
    Route::post('/auth/fcm-token', [CustomerFcmTokenController::class, 'store']);
    Route::delete('/auth/fcm-token', [CustomerFcmTokenController::class, 'destroy']);
});

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/me', [AuthController::class, 'updateProfile']);
    Route::post('/auth/me/avatar', [AuthController::class, 'updateAvatar']);
    Route::put('/auth/me/password', [AuthController::class, 'updatePassword']);

    // Users (admin only)
    Route::apiResource('users', UserController::class)->middleware('role:admin');

    // Delivery zones — list for all staff, mutations for admin only
    Route::get('delivery-zones', [DeliveryZoneController::class, 'index']);
    Route::middleware('role:admin')->group(function () {
        Route::post('delivery-zones', [DeliveryZoneController::class, 'store']);
        Route::put('delivery-zones/{deliveryZone}', [DeliveryZoneController::class, 'update']);
        Route::delete('delivery-zones/{deliveryZone}', [DeliveryZoneController::class, 'destroy']);

        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings/social-links', [SettingController::class, 'updateSocialLinks']);
    });

    // Categories
    Route::apiResource('categories', CategoryController::class)->except(['show']);

    // Products
    Route::get('/products/{product}/movements', [ProductController::class, 'movements']);
    Route::apiResource('products', ProductController::class);

    // Stock movements
    Route::get('/stock-movements', [StockMovementController::class, 'index']);
    Route::post('/stock-movements', [StockMovementController::class, 'store'])->middleware('role:admin,stock_manager');

    // Customers + nested notes & tasks
    Route::get('customers/stats', [CustomerController::class, 'stats']);
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('customers.notes', CustomerNoteController::class)->shallow()->except(['show']);
    Route::apiResource('customers.tasks', CustomerTaskController::class)->shallow()->except(['show']);

    // Sales + order lifecycle
    Route::post('/sales/{sale}/confirm',  [SaleController::class, 'confirm'])->middleware('role:admin');
    Route::post('/sales/{sale}/assign',   [SaleController::class, 'assign'])->middleware('role:admin');
    Route::post('/sales/{sale}/deliver',  [SaleController::class, 'deliver'])->middleware('role:admin,delivery');
    Route::put('/sales/{sale}/status', [SaleController::class, 'updateStatus']);
    Route::apiResource('sales', SaleController::class)->except(['update']);

    // FCM token management
    Route::post('/auth/fcm-token', [FcmTokenController::class, 'store']);
    Route::delete('/auth/fcm-token', [FcmTokenController::class, 'destroy']);

    // Staff notifications (read-all must precede {id} route)
    Route::post('/notifications/read-all',        [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/read',          [NotificationController::class, 'clearRead']);
    Route::get('/notifications',                  [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read',      [NotificationController::class, 'markRead']);

    // Payments
    Route::apiResource('payments', PaymentController::class)->only(['index', 'store', 'show']);

    // Offline queue sync
    Route::post('/offline-queue/sync', [OfflineQueueController::class, 'sync']);

    // Campaigns (admin send, all can read)
    Route::get('/campaigns/recipient-preview', [CampaignController::class, 'recipientPreview']);
    Route::post('/campaigns/{campaign}/send', [CampaignController::class, 'send']);
    Route::apiResource('campaigns', CampaignController::class)->only(['index', 'store', 'show', 'destroy']);

    // Audit logs (admin only)
    Route::middleware('role:admin')->prefix('audit-logs')->group(function () {
        Route::get('/',        [AuditController::class, 'index']);
        Route::get('/export',  [AuditController::class, 'export']);
        Route::get('/{auditLog}', [AuditController::class, 'show']);
    });

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
