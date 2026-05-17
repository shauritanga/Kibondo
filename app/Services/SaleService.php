<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Material;
use App\Models\Product;
use App\Models\Sale;
use App\Services\MaterialService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleService
{
    public function __construct(
        private StockService $stock,
        private MaterialService $materials,
    ) {}

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

            $subtotal     = collect($items)->sum(fn($i) => $i['quantity'] * $i['unit_price']);
            $discount     = $data['discount_amount'] ?? 0;
            $deliveryCost = $data['delivery_cost'] ?? 0;
            $total        = $subtotal - $discount + $deliveryCost;

            // Enforce credit limit for account customers
            if (!empty($data['customer_id'])) {
                $customer = Customer::lockForUpdate()->findOrFail($data['customer_id']);
                if ($customer->credit_limit > 0 && ($customer->outstanding_balance + $total) > $customer->credit_limit) {
                    $available = max(0, $customer->credit_limit - $customer->outstanding_balance);
                    throw ValidationException::withMessages([
                        'customer_id' => "Credit limit exceeded. Customer's available credit: TZS " . number_format($available),
                    ]);
                }
            }

            $sale = Sale::create([
                'sale_number'      => $this->nextSaleNumber(),
                'customer_id'      => $data['customer_id'] ?? null,
                'guest_name'       => $data['guest_name'] ?? null,
                'guest_phone'      => $data['guest_phone'] ?? null,
                'guest_email'      => $data['guest_email'] ?? null,
                'guest_company'    => $data['guest_company'] ?? null,
                'user_id'          => $userId,
                'subtotal'         => $subtotal,
                'discount_amount'  => $discount,
                'delivery_zone_id' => $data['delivery_zone_id'] ?? null,
                'delivery_cost'    => $data['delivery_cost'] ?? null,
                'total_amount'     => $total,
                'paid_amount'      => 0,
                'outstanding'      => $total,
                'status'           => $data['status'] ?? 'completed',
                'payment_status'   => 'unpaid',
                'note'             => $data['note'] ?? null,
                'delivery_address' => $data['delivery_address'] ?? null,
                'billing_address'  => $data['billing_address'] ?? null,
                'payment_method'   => $data['payment_method'] ?? 'cash',
                'is_offline_sync'  => $data['is_offline_sync'] ?? false,
                'synced_at'        => ($data['is_offline_sync'] ?? false) ? now() : null,
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

                $product->loadMissing('recipe.material');
                if ($product->recipe && $product->recipe->material) {
                    $toConsume = (int) round($item['quantity'] * $product->recipe->quantity_per_unit);
                    if ($toConsume > 0) {
                        try {
                            $this->materials->consume(
                                $product->recipe->material,
                                $toConsume,
                                $userId,
                                $sale->id,
                                "Auto-consumed from sale {$sale->sale_number}"
                            );
                        } catch (\InvalidArgumentException) {
                            // Material stock already at zero — don't block the sale
                        }
                    }
                }
            }

            // Update customer total spend
            if ($sale->customer_id) {
                $sale->customer()->increment('total_spend', $total);
                $sale->customer()->increment('outstanding_balance', $total);
            }

            return $sale->load('items.product', 'customer');
        });
    }

    public function cancelSale(Sale $sale, ?string $userId): void
    {
        DB::transaction(function () use ($sale, $userId) {
            $sale->load('items.product.recipe.material');

            foreach ($sale->items as $item) {
                $product = $item->product;
                if (!$product) continue;

                // Restore product stock
                $product->refresh();
                $this->stock->recordMovement(
                    $product, 'returned', $item->quantity, $userId, $sale->id,
                    "Restocked on cancellation of {$sale->sale_number}"
                );

                // Reverse material consumption if recipe exists
                $product->loadMissing('recipe.material');
                if ($product->recipe && $product->recipe->material) {
                    $toRestore = (int) round($item->quantity * $product->recipe->quantity_per_unit);
                    if ($toRestore > 0) {
                        $material = Material::lockForUpdate()->find($product->recipe->material_id);
                        if ($material) {
                            $this->materials->recordMovement(
                                $material, 'adjusted', $toRestore, $userId, $sale->id,
                                "Restored on cancellation of {$sale->sale_number}"
                            );
                        }
                    }
                }
            }

            // Reverse customer balances
            if ($sale->customer_id && $sale->customer) {
                $sale->customer()->decrement('total_spend', $sale->total_amount);
                $sale->customer()->decrement('outstanding_balance', $sale->outstanding);
            }

            $sale->update(['status' => 'cancelled']);
        });
    }

    private function nextSaleNumber(): string
    {
        $last = Sale::withTrashed()->orderByDesc('created_at')->value('sale_number');
        $next = $last ? (intval(substr($last, 4)) + 1) : 1;
        return 'ORD-' . str_pad($next, 5, '0', STR_PAD_LEFT);
    }
}
