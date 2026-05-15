<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your order {{ $sale->sale_number }} is on the way</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f7f6; font-family: 'Helvetica Neue', Arial, sans-serif; color: #2d3748; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #3d7639; padding: 28px 32px; }
    .header-brand { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header-tagline { color: rgba(255,255,255,0.75); font-size: 12px; margin-top: 2px; }
    .greeting { padding: 28px 32px 0; font-size: 15px; font-weight: 600; }
    .body { padding: 16px 32px 28px; font-size: 14px; line-height: 1.7; }
    .badge { display: inline-block; background: #fffbeb; color: #b7791f; font-weight: 700; font-size: 13px; padding: 6px 16px; border-radius: 20px; margin: 8px 0; }
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
      <div class="header-tagline">Fresh produce, direct from the farm</div>
    </div>
    <div class="greeting">Hello {{ $customer->name }},</div>
    <div class="body">
      <p>Your order is on its way! Our delivery person is heading to your address.</p>
      <div class="badge">🚚 Out for Delivery</div>
      <div class="detail-box">
        <div class="detail-row"><span class="label">Order</span><span class="value">{{ $sale->sale_number }}</span></div>
        <div class="detail-row"><span class="label">Delivery address</span><span class="value">{{ $sale->delivery_address ?? '—' }}</span></div>
        <div class="detail-row"><span class="label">Total due</span><span class="value">TZS {{ number_format($sale->total_amount) }}</span></div>
        <div class="detail-row"><span class="label">Payment</span><span class="value">Cash on delivery</span></div>
        @if($sale->assignedTo)
        <div class="detail-row"><span class="label">Delivery person</span><span class="value">{{ $sale->assignedTo->name }}</span></div>
        @endif
      </div>
      <p>Please have <strong>TZS {{ number_format($sale->total_amount) }}</strong> ready for the delivery person.</p>
    </div>
    <div class="footer">You are receiving this because you placed an order with Kibondo Green Farm.</div>
  </div>
</body>
</html>
