<?php

use App\Http\Middleware\ForceHttps;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Sentry\Laravel\Integration;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);

        $middleware->api(append: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // Force HTTPS in production
        if (env('APP_ENV') === 'production') {
            $middleware->prepend(ForceHttps::class);
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Report unhandled exceptions to Sentry
        Integration::handles($exceptions);

        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*')) {
                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    return response()->json(['message' => 'Unauthenticated.'], 401);
                }
                if ($e instanceof \Illuminate\Auth\Access\AuthorizationException) {
                    return response()->json(['message' => 'Forbidden.'], 403);
                }
                if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
                    return response()->json(['message' => 'Not found.'], 404);
                }
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'message' => 'Validation failed.',
                        'errors' => $e->errors(),
                    ], 422);
                }
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException) {
                    return response()->json(['message' => $e->getMessage() ?: 'HTTP error.'], $e->getStatusCode());
                }
                if ($e instanceof \Illuminate\Database\QueryException) {
                    report($e);
                    return response()->json(['message' => 'A database error occurred. Please try again.'], 500);
                }
                // Catch-all: return JSON instead of HTML for all API errors
                report($e);
                return response()->json(['message' => 'An unexpected error occurred. Please try again.'], 500);
            }
        });
    })->create();
