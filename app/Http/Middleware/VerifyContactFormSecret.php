<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyContactFormSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret   = (string) config('services.contact.secret');
        $provided = (string) ($request->bearerToken() ?: $request->header('X-Contact-Secret', ''));

        if ($secret === '' || $provided === '' || ! hash_equals($secret, $provided)) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        return $next($request);
    }
}
