<?php

namespace App\Http\Middleware;

use App\Models\Customer;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class AuthenticateCustomer
{
    public function handle(Request $request, Closure $next)
    {
        $bearerToken = $request->bearerToken();

        if ($bearerToken) {
            // Bearer token present — validate it directly, bypassing the web session check
            $accessToken = PersonalAccessToken::findToken($bearerToken);

            if (! $accessToken
                || ! $accessToken->tokenable instanceof Customer
                || ($accessToken->expires_at && $accessToken->expires_at->isPast())
            ) {
                throw new AuthenticationException('Unauthenticated.');
            }

            $customer = $accessToken->tokenable;
            $customer->withAccessToken($accessToken);
            auth()->guard('customer')->setUser($customer);
        } else {
            // No Bearer token — only allowed if actingAs() already set a Customer on the guard
            // (used in tests; setUser() pre-populates $user so user() returns it without calling
            // Sanctum's web-session-first resolution)
            $user = auth()->guard('customer')->user();
            if (! $user instanceof Customer) {
                throw new AuthenticationException('Unauthenticated.');
            }
        }

        return $next($request);
    }
}
