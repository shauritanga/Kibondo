<?php

namespace App\Http\Middleware;

use App\Models\Customer;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthenticateCustomer
{
    public function handle(Request $request, Closure $next)
    {
        if (! Auth::guard('customer')->check()) {
            throw new AuthenticationException('Unauthenticated.');
        }

        return $next($request);
    }
}
