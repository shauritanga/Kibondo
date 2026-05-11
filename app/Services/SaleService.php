<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleService
{
    public function __construct(private StockService $stock) {}

    public function createSale(array $data, ?string $userId): Sale
    {
        return DB::transaction(function () use ($data, $userId) {
            $items = $data['items'];

            // Validate stock availability upfront
            foreach ($items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                if ($product->stock_qty < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => "Insufficient stock for {$product->name}. Available: {$product->stock_qty}",
                    ]);
                }
            }

            $subtotal = collect($items)->sum(fn($i) => $i['quantity'] * $i['unit_price']);
            $discount = $data['discount_amount'] ?? 0;
            $total = $subtotal - $discount;

            $sale = Sale::create([
                'sale_number' => $this->nextSaleNumber(),
                'customer_id' => $data['customer_id'] ?? null,
                'user_id' => $userId,
                'subtotal' => $subtotal,
                'discount_amount' => $discount,
                'total_amount' => $total,
                'paid_amount' => 0,
                'outstanding' => $total,
                'status' => $data['status'] ?? 'completed',
                'payment_status' => 'unpaid',
                'note' => $data['note'] ?? null,
                'is_offline_sync' => $data['is_offline_sync'] ?? false,
                'synced_at' => ($data['is_offline_sync'] ?? false) ? now() : null,
            ]);

            foreach ($items as $item) {
                $product = Product::find($item['product_id']);

                $sale->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'line_total' => $item['quantity'] * $item['unit_price'],
                    'created_at' => now(),
                ]);

                $this->stock->stockOut($product, $item['quantity'], $userId, $sale->id);
            }

            // Update customer total spend
            if ($sale->customer_id) {
                $sale->customer()->increment('total_spend', $total);
                $sale->customer()->increment('outstanding_balance', $total);
            }

            return $sale->load('items.product', 'customer');
        });
    }

    private function nextSaleNumber(): string
    {
        $last = Sale::withTrashed()->orderByDesc('created_at')->value('sale_number');
        $next = $last ? (intval(substr($last, 4)) + 1) : 1;
        return 'ORD-' . str_pad($next, 5, '0', STR_PAD_LEFT);
    }
}
