<?php

namespace App\Console\Commands;

use App\Models\Sale;
use App\Services\SaleService;
use Illuminate\Console\Command;

class CancelStaleGuestOrders extends Command
{
    protected $signature   = 'orders:cancel-stale {--hours=24 : Cancel pending guest orders older than this many hours}';
    protected $description = 'Cancel pending guest orders that have not been confirmed within the TTL window';

    public function handle(SaleService $sales): int
    {
        $hours = (int) $this->option('hours');

        $stale = Sale::query()
            ->whereNull('customer_id')
            ->where('status', 'pending')
            ->where('created_at', '<', now()->subHours($hours))
            ->get();

        if ($stale->isEmpty()) {
            $this->info('No stale guest orders found.');
            return self::SUCCESS;
        }

        foreach ($stale as $sale) {
            try {
                $sales->cancelSale($sale, null);
                $this->line("Cancelled {$sale->sale_number}");
            } catch (\Throwable $e) {
                $this->error("Failed to cancel {$sale->sale_number}: {$e->getMessage()}");
            }
        }

        $this->info("Cancelled {$stale->count()} stale guest order(s).");

        return self::SUCCESS;
    }
}
