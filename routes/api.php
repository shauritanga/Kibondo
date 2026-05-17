<?php

use App\Http\Controllers\AuditController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerNoteController;
use App\Http\Controllers\CustomerTaskController;
use App\Http\Controllers\DeliveryZoneController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\MaterialController;
use App\Http\Controllers\PackagingRunController;
use App\Http\Controllers\ProductRecipeController;
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
    Route::get('/products/{product}', [StoreController::class, 'show']);
    Route::get('/categories', [StoreController::class, 'categories']);
    Route::get('/delivery-zones', [DeliveryZoneController::class, 'publicIndex']);
    Route::get('/settings/social-links', [SettingController::class, 'socialLinks']);
    Route::get('/settings/promo', [SettingController::class, 'getPromo']);
    Route::post('/auth/register', [CustomerAuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/auth/login', [CustomerAuthController::class, 'login'])->middleware('throttle:auth');
    Route::get('/auth/verify/{id}/{hash}', [CustomerAuthController::class, 'verifyEmail'])->name('store.verification.verify');
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:orders');
});

// ─── Storefront – customer authenticated ─────────────────────────────────────
Route::prefix('store')->middleware(['auth.customer', 'throttle:store-api'])->group(function () {
    Route::post('/auth/logout', [CustomerAuthController::class, 'logout']);
    Route::get('/auth/me', [CustomerAuthController::class, 'me']);
    Route::put('/auth/me', [CustomerAuthController::class, 'updateProfile']);
    Route::post('/auth/email/resend', [CustomerAuthController::class, 'resendVerification']);
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
Route::middleware(['auth:sanctum', 'throttle:staff-api'])->group(function () {
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
        Route::put('/settings/promo', [SettingController::class, 'updatePromo']);
    });

    // Categories
    Route::apiResource('categories', CategoryController::class)->except(['show']);

    // Products — view all staff, mutations admin/stock_manager only
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);
    Route::get('/products/{product}/movements', [ProductController::class, 'movements']);
    Route::middleware('role:admin,stock_manager')->group(function () {
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
    });

    // Stock movements
    Route::get('/stock-movements', [StockMovementController::class, 'index']);
    Route::post('/stock-movements', [StockMovementController::class, 'store'])->middleware('role:admin,stock_manager');

    // Warehouse — raw materials (view all staff, mutations admin only)
    Route::get('materials', [MaterialController::class, 'index']);
    Route::get('materials/{material}/movements', [MaterialController::class, 'movements']);
    Route::middleware('role:admin,stock_manager')->group(function () {
        Route::post('materials', [MaterialController::class, 'store']);
        Route::put('materials/{material}', [MaterialController::class, 'update']);
        Route::delete('materials/{material}', [MaterialController::class, 'destroy']);
        Route::post('materials/{material}/movements', [MaterialController::class, 'recordMovement']);
        Route::put('products/{product}/recipe', [ProductRecipeController::class, 'upsert']);
        Route::delete('products/{product}/recipe', [ProductRecipeController::class, 'destroy']);
        Route::post('packaging-runs', [PackagingRunController::class, 'store']);
        Route::get('packaging-runs', [PackagingRunController::class, 'index']);
    });

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

    // Payments — create restricted to admin/accountant; view all staff
    Route::get('/payments', [PaymentController::class, 'index']);
    Route::get('/payments/{payment}', [PaymentController::class, 'show']);
    Route::post('/payments', [PaymentController::class, 'store'])->middleware('role:admin,accountant');


    // Campaigns — read all staff; create/delete/send admin only
    Route::get('/campaigns', [CampaignController::class, 'index']);
    Route::get('/campaigns/{campaign}', [CampaignController::class, 'show']);
    Route::middleware('role:admin')->group(function () {
        Route::get('/campaigns/recipient-preview', [CampaignController::class, 'recipientPreview']);
        Route::post('/campaigns', [CampaignController::class, 'store']);
        Route::delete('/campaigns/{campaign}', [CampaignController::class, 'destroy']);
        Route::post('/campaigns/{campaign}/send', [CampaignController::class, 'send']);
    });

    // Audit logs (admin only)
    Route::middleware('role:admin')->prefix('audit-logs')->group(function () {
        Route::get('/',        [AuditController::class, 'index']);
        Route::get('/export',  [AuditController::class, 'export']);
        Route::get('/{auditLog}', [AuditController::class, 'show']);
    });

    // Expenses
    Route::middleware('role:admin,accountant')->group(function () {
        Route::apiResource('expenses', ExpenseController::class);
    });

    // Reports — admin and accountant only
    Route::prefix('reports')->middleware('role:admin,accountant')->group(function () {
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
