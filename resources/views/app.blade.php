<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />

    <title>{{ config('app.name') }}</title>
    <meta name="description" content="Order fresh farm produce online. Cash on delivery." />
    <meta name="robots" content="{{ config('app.env') === 'production' ? 'index, follow' : 'noindex, nofollow' }}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="{{ config('app.name') }}" />
    <meta property="og:description" content="Order fresh farm produce online. Cash on delivery." />
    <meta property="og:url" content="{{ config('app.url') }}" />

    <meta name="theme-color" content="#16a34a" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="manifest" href="/manifest.json" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
    @viteReactRefresh
    @vite(['resources/js/bootstrap.tsx'])
</head>
<body class="antialiased">
    <div id="root"></div>
</body>
</html>
