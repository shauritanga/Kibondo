<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your order {{ $sale->sale_number }} has arrived</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f7f6; font-family: 'Helvetica Neue', Arial, sans-serif; color: #2d3748; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #3d7639; padding: 28px 32px; }
    .header-brand { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header-tagline { color: rgba(255,255,255,0.75); font-size: 12px; margin-top: 2px; }
    .greeting { padding: 28px 32px 0; font-size: 15px; font-weight: 600; }
    .body { padding: 16px 32px 28px; font-size: 14px; line-height: 1.7; }
    .badge { display: inline-block; background: #ebf8ee; color: #276749; font-weight: 700; font-size: 13px; padding: 6px 16px; border-radius: 20px; margin: 8px 0; }
    .cta { background: #3d7639; color: #fff; text-decoration: none; display: inline-block; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 12px; }
    .footer { border-top: 1px solid #e2e8f0; padding: 18px 32px; font-size: 11px; color: #a0aec0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-brand">Kibondo Green Farm</div>
      <div class="header-tagline">Fresh produce, direct from the farm</div>
    </div>
    <div class="greeting">Hello {{ $customer_name }},</div>
    <div class="body">
      <p>Your order <strong>{{ $sale->sale_number }}</strong> has been delivered!</p>
      <div class="badge">📦 Delivered</div>
      <p>Please check your order and confirm receipt in the app or on our website. Your feedback helps us improve.</p>
      <p>If you have any issues with your delivery, please contact us immediately.</p>
    </div>
    <div class="footer">You are receiving this because you placed an order with Kibondo Green Farm.</div>
  </div>
</body>
</html>
