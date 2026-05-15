<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your order {{ $sale->sale_number }} has been cancelled</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f7f6; font-family: 'Helvetica Neue', Arial, sans-serif; color: #2d3748; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #3d7639; padding: 28px 32px; }
    .header-brand { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header-tagline { color: rgba(255,255,255,0.75); font-size: 12px; margin-top: 2px; }
    .greeting { padding: 28px 32px 0; font-size: 15px; font-weight: 600; }
    .body { padding: 16px 32px 28px; font-size: 14px; line-height: 1.7; }
    .footer { border-top: 1px solid #e2e8f0; padding: 18px 32px; font-size: 11px; color: #a0aec0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-brand">Kibondo Green Farm</div>
      <div class="header-tagline">Fresh produce, direct from the farm</div>
    </div>
    <div class="greeting">Hello {{ $customer->name }},</div>
    <div class="body">
      <p>We regret to inform you that your order <strong>{{ $sale->sale_number }}</strong> has been cancelled.</p>
      <p>If you have any questions about this cancellation, please contact us directly. We apologise for any inconvenience.</p>
      <p>You are welcome to place a new order at any time.</p>
    </div>
    <div class="footer">You are receiving this because you placed an order with Kibondo Green Farm.</div>
  </div>
</body>
</html>
