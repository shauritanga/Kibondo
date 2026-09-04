<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyContactFormSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) (config('services.contact.secret') ?: env('CONTACT_FORM_SECRET', ''));
        $provided = (string) (
            $request->header('X-Contact-Secret')
            ?: $request->bearerToken()
            ?: ''
        );

        if ($secret === '' || $provided === '' || ! hash_equals($secret, $provided)) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        return $next($request);
    }
}
