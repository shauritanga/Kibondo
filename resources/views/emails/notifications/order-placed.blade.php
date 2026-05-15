<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New order: {{ $sale->sale_number }}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f7f6; font-family: 'Helvetica Neue', Arial, sans-serif; color: #2d3748; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #3d7639; padding: 28px 32px; }
    .header-brand { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header-tagline { color: rgba(255,255,255,0.75); font-size: 12px; margin-top: 2px; }
    .greeting { padding: 28px 32px 0; font-size: 15px; font-weight: 600; }
    .body { padding: 16px 32px 28px; font-size: 14px; line-height: 1.7; }
    .detail-box { background: #f8faf8; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0; font-size: 13px; }
    .detail-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .label { color: #718096; }
    .value { font-weight: 600; }
    .footer { border-top: 1px solid #e2e8f0; padding: 18px 32px; font-size: 11px; color: #a0aec0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-brand">Kibondo Green Farm</div>
      <div class="header-tagline">Order Management Dashboard</div>
    </div>
    <div class="greeting">New order received</div>
    <div class="body">
      <p>A new customer order has been placed and is awaiting your confirmation.</p>
      <div class="detail-box">
        <div class="detail-row"><span class="label">Order</span><span class="value">{{ $sale->sale_number }}</span></div>
        <div class="detail-row"><span class="label">Customer</span><span class="value">{{ $sale->customer?->name ?? 'Guest' }}</span></div>
        <div class="detail-row"><span class="label">Total</span><span class="value">TZS {{ number_format($sale->total_amount) }}</span></div>
        <div class="detail-row"><span class="label">Delivery address</span><span class="value">{{ $sale->delivery_address ?? '—' }}</span></div>
        <div class="detail-row"><span class="label">Placed at</span><span class="value">{{ $sale->created_at->format('d M Y, H:i') }}</span></div>
      </div>
      <p>Log in to the dashboard to confirm or cancel this order.</p>
    </div>
    <div class="footer">Kibondo Green Farm · Internal notification</div>
  </div>
</body>
</html>
