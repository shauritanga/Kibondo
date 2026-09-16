<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('up') || $this->isLoopback($request)) {
            return $next($request);
        }

        if (! $request->secure()) {
            return redirect()->secure($request->getRequestUri(), 301);
        }

        return $next($request);
    }

    private function isLoopback(Request $request): bool
    {
        return in_array($request->getHost(), ['127.0.0.1', 'localhost', '::1'], true);
    }
}
