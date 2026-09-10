<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{ $title }} | Kibondo Green Farm</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f7faf7;
      color: #1f2937;
      font-family: Arial, Helvetica, sans-serif;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
      padding: 32px;
      text-align: center;
    }
    .logo {
      width: 76px;
      height: 76px;
      object-fit: contain;
      margin-bottom: 18px;
    }
    .badge {
      width: 46px;
      height: 46px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;
      font-size: 26px;
      font-weight: 700;
    }
    .success { background: #dcfce7; color: #15803d; }
    .error { background: #fee2e2; color: #b91c1c; }
    h1 {
      font-size: 24px;
      line-height: 1.2;
      margin: 0 0 10px;
      color: #111827;
    }
    p {
      margin: 0;
      font-size: 14px;
      line-height: 1.7;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      margin-top: 24px;
      background: #16a34a;
      color: #ffffff;
      text-decoration: none;
      border-radius: 10px;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 700;
    }
    .button:hover {
      background: #15803d;
    }
  </style>
</head>
<body>
  <main class="card">
    <img src="/kibodo-logo.png" alt="Kibondo Green Farm" class="logo" />
    <div class="badge {{ $tone === 'success' ? 'success' : 'error' }}">
      {!! $tone === 'success' ? '&check;' : '!' !!}
    </div>
    <h1>{{ $title }}</h1>
    <p>{{ $message }}</p>
    <a href="/store" class="button">{{ $tone === 'success' ? 'Continue to Store' : 'Back to Store' }}</a>
  </main>
</body>
</html>
