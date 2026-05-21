<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $period     = $request->input('period', 'week'); // 'week' | 'month'
        $today      = now()->toDateString();
        $yesterday  = now()->subDay()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $lastMonthStart   = now()->subMonth()->startOfMonth()->toDateString();
        $lastMonthSameDay = now()->subMonth()->toDateString();

        // KPIs — collapse five separate sale queries into one aggregate
        $saleStats = DB::table('sales')
            ->where('status', '!=', 'cancelled')
            ->selectRaw("
                SUM(CASE WHEN DATE(created_at) = ? THEN total_amount ELSE 0 END) AS today_revenue,
                SUM(CASE WHEN DATE(created_at) = ? THEN total_amount ELSE 0 END) AS yesterday_revenue,
                SUM(CASE WHEN DATE(created_at) >= ? THEN total_amount ELSE 0 END) AS month_revenue,
                SUM(CASE WHEN DATE(created_at) BETWEEN ? AND ? THEN total_amount ELSE 0 END) AS last_month_revenue,
                COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) AS today_orders
            ", [$today, $yesterday, $monthStart, $lastMonthStart, $lastMonthSameDay, $today])
            ->first();

        $totalSalesToday     = (int) $saleStats->today_revenue;
        $totalSalesYesterday = (int) $saleStats->yesterday_revenue;
        $totalSalesMonth     = (int) $saleStats->month_revenue;
        $totalSalesLastMonth = (int) $saleStats->last_month_revenue;
        $totalOrders         = (int) $saleStats->today_orders;

        $pct = fn ($now, $prev) => $prev > 0 ? round(($now - $prev) / $prev * 100, 1) : null;

        $customerStats  = DB::table('customers')->whereNull('deleted_at')
            ->selectRaw('COUNT(*) AS cnt, COALESCE(SUM(outstanding_balance), 0) AS balance')
            ->first();
        $totalCustomers     = (int) $customerStats->cnt;
        $outstandingBalance = (int) $customerStats->balance;

        $lowStockProducts = Product::where('is_active', true)
            ->whereColumn('stock_qty', '<=', 'min_stock')
            ->with('category:id,name')
            ->get(['id', 'name', 'stock_qty', 'min_stock', 'category_id']);

        // Sales trend — 7 days (week) or current month day-by-day (month)
        $trendFrom = $period === 'month' ? $monthStart : now()->subDays(6)->toDateString();

        $salesTrend = Sale::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_amount) as total')
            )
            ->where('status', '!=', 'cancelled')
            ->whereDate('created_at', '>=', $trendFrom)
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Mix charts — last 7 days (week) or current month (month)
        $mixFrom = $period === 'month' ? $monthStart : now()->subDays(6)->toDateString();

        $paymentMix = Payment::select('payment_method', DB::raw('SUM(amount) as total'))
            ->whereDate('created_at', '>=', $mixFrom)
            ->groupBy('payment_method')
            ->get();

        $categoryMix = SaleItem::join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereDate('sales.created_at', '>=', $mixFrom)
            ->select('categories.name', DB::raw('SUM(sale_items.line_total) as total'))
            ->groupBy('categories.name')
            ->get();

        // Recent sales
        $recentSales = Sale::with('customer:id,name')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'sale_number', 'customer_id', 'total_amount', 'status', 'payment_status', 'created_at']);

        // Top customers
        $topCustomers = Customer::orderByDesc('total_spend')
            ->limit(5)
            ->get(['id', 'name', 'type', 'total_spend', 'outstanding_balance']);

        return response()->json([
            'data' => [
                'kpis' => [
                    'total_sales_today'  => $totalSalesToday,
                    'total_sales_month'  => $totalSalesMonth,
                    'total_orders_today' => $totalOrders,
                    'total_customers'    => $totalCustomers,
                    'outstanding_balance'=> $outstandingBalance,
                    'low_stock_count'    => $lowStockProducts->count(),
                    'sales_today_change' => $pct($totalSalesToday, $totalSalesYesterday),
                    'sales_month_change' => $pct($totalSalesMonth, $totalSalesLastMonth),
                ],
                'sales_trend'       => $salesTrend,
                'payment_mix'       => $paymentMix,
                'category_mix'      => $categoryMix,
                'recent_sales'      => $recentSales,
                'low_stock_products'=> $lowStockProducts,
                'top_customers'     => $topCustomers,
            ],
        ]);
    }

    public function deliveryDashboard(Request $request): JsonResponse
    {
        $userId     = auth()->id();
        $monthStart = now()->startOfMonth();
        $period     = $request->input('period', 'week'); // week | month | year

        $base = Sale::where('assigned_to', $userId);

        $assignedTotal  = (clone $base)->count();
        $outForDelivery = (clone $base)->where('status', 'out_for_delivery')->count();

        $deliveredToday = (clone $base)
            ->whereIn('status', ['awaiting_confirmation', 'completed'])
            ->whereDate('updated_at', today())
            ->count();

        $deliveredMonth = (clone $base)
            ->whereIn('status', ['awaiting_confirmation', 'completed'])
            ->where('updated_at', '>=', $monthStart)
            ->count();

        $deliveredTotal = (clone $base)
            ->whereIn('status', ['awaiting_confirmation', 'completed'])
            ->count();

        $earningsToday = (clone $base)
            ->whereIn('status', ['awaiting_confirmation', 'completed'])
            ->whereDate('updated_at', today())
            ->sum('delivery_cost');

        $earningsMonth = (clone $base)
            ->whereIn('status', ['awaiting_confirmation', 'completed'])
            ->where('updated_at', '>=', $monthStart)
            ->sum('delivery_cost');

        $earningsTotal = (clone $base)
            ->whereIn('status', ['awaiting_confirmation', 'completed'])
            ->sum('delivery_cost');

        $recentOrders = (clone $base)
            ->with('customer:id,name')
            ->orderByDesc('updated_at')
            ->limit(8)
            ->get(['id', 'sale_number', 'status', 'delivery_cost', 'total_amount',
                   'customer_id', 'guest_name', 'updated_at', 'delivery_confirmed_at']);

        // ── Order trend (assigned vs delivered) ──────────────────────────
        if ($period === 'year') {
            // Last 12 months up to (and including) the current month
            $trendFrom  = now()->subMonths(11)->startOfMonth();
            $bucketExpr = "TO_CHAR(created_at, 'YYYY-MM')";
            $delBucket  = "TO_CHAR(updated_at, 'YYYY-MM')";
            $dates = collect(range(0, 11))
                ->map(fn ($i) => now()->subMonths(11 - $i)->format('Y-m'));

        } elseif ($period === 'month') {
            // Current month broken into ISO weeks (Monday start)
            $trendFrom      = now()->startOfMonth();
            $bucketExpr     = "DATE_TRUNC('week', created_at)::date";
            $delBucket      = "DATE_TRUNC('week', updated_at)::date";
            // Walk Monday-by-Monday from the week that contains the 1st
            // through the week that contains today
            $weekCursor    = now()->copy()->startOfMonth()->startOfWeek(\Carbon\Carbon::MONDAY);
            $thisWeekStart = now()->copy()->startOfWeek(\Carbon\Carbon::MONDAY);
            $dates = collect();
            while ($weekCursor->lessThanOrEqualTo($thisWeekStart)) {
                $dates->push($weekCursor->toDateString());
                $weekCursor->addWeek();
            }

        } else {
            // Last 7 days — one bar per day
            $trendFrom  = now()->subDays(6)->startOfDay();
            $bucketExpr = 'DATE(created_at)';
            $delBucket  = 'DATE(updated_at)';
            $dates = collect(range(0, 6))
                ->map(fn ($i) => now()->subDays(6 - $i)->toDateString());
        }

        $assignedRaw = (clone $base)
            ->where('created_at', '>=', $trendFrom)
            ->selectRaw("$bucketExpr as bucket, COUNT(*) as cnt")
            ->groupBy(DB::raw($bucketExpr))
            ->pluck('cnt', 'bucket');

        $deliveredRaw = (clone $base)
            ->whereIn('status', ['awaiting_confirmation', 'completed'])
            ->where('updated_at', '>=', $trendFrom)
            ->selectRaw("$delBucket as bucket, COUNT(*) as cnt")
            ->groupBy(DB::raw($delBucket))
            ->pluck('cnt', 'bucket');

        $orderTrend = $dates->map(fn ($d) => [
            'date'      => $d,
            'assigned'  => (int) ($assignedRaw[$d] ?? 0),
            'delivered' => (int) ($deliveredRaw[$d] ?? 0),
        ])->values();

        // ── Payment methods breakdown ─────────────────────────────────────
        $paymentMix = DB::table('payments')
            ->join('sales', 'payments.sale_id', '=', 'sales.id')
            ->where('sales.assigned_to', $userId)
            ->whereNull('sales.deleted_at')
            ->selectRaw('payments.payment_method, COUNT(*) as count, SUM(payments.amount) as total')
            ->groupBy('payments.payment_method')
            ->get();

        return response()->json([
            'assigned_total'   => $assignedTotal,
            'out_for_delivery' => $outForDelivery,
            'delivered_today'  => $deliveredToday,
            'delivered_month'  => $deliveredMonth,
            'delivered_total'  => $deliveredTotal,
            'earnings_today'   => (int) $earningsToday,
            'earnings_month'   => (int) $earningsMonth,
            'earnings_total'   => (int) $earningsTotal,
            'recent_orders'    => $recentOrders,
            'order_trend'      => $orderTrend,
            'payment_mix'      => $paymentMix,
        ]);
    }

    private function validateDateRange(string $from, string $to, int $maxDays = 366): ?JsonResponse
    {
        if ($from > $to) {
            return response()->json(['message' => 'from date must be before to date.'], 422);
        }
        if (now()->parse($from)->diffInDays(now()->parse($to)) > $maxDays) {
            return response()->json(['message' => "Date range cannot exceed {$maxDays} days."], 422);
        }
        return null;
    }

    public function sales(Request $request): JsonResponse
    {
        $from    = $request->get('from', now()->startOfMonth()->toDateString());
        $to      = $request->get('to',   now()->toDateString());
        $groupBy = $request->get('group_by', 'day');

        if ($err = $this->validateDateRange($from, $to)) return $err;

        $dateTrunc = match ($groupBy) {
            'week' => "DATE_TRUNC('week', created_at)",
            'month' => "DATE_TRUNC('month', created_at)",
            default => 'DATE(created_at)',
        };

        $rows = Sale::select(
                DB::raw("{$dateTrunc} as period"),
                DB::raw('COUNT(*) as orders'),
                DB::raw('SUM(total_amount) as revenue'),
                DB::raw('SUM(paid_amount) as collected')
            )
            ->where('status', '!=', 'cancelled')
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function salesByProduct(Request $request): JsonResponse
    {
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to   = $request->get('to',   now()->toDateString());

        if ($err = $this->validateDateRange($from, $to)) return $err;

        $rows = SaleItem::join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereDate('sales.created_at', '>=', $from)
            ->whereDate('sales.created_at', '<=', $to)
            ->select(
                'products.id',
                'products.name',
                DB::raw('SUM(sale_items.quantity) as total_qty'),
                DB::raw('SUM(sale_items.line_total) as total_revenue')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_revenue')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function bestSellers(Request $request): JsonResponse
    {
        $limit = min((int) $request->get('limit', 5), 50);
        $from  = $request->get('from', now()->startOfMonth()->toDateString());
        $to    = $request->get('to',   now()->toDateString());

        if ($err = $this->validateDateRange($from, $to)) return $err;

        $rows = SaleItem::join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereDate('sales.created_at', '>=', $from)
            ->whereDate('sales.created_at', '<=', $to)
            ->select(
                'products.name',
                DB::raw('SUM(sale_items.quantity) as total_qty'),
                DB::raw('SUM(sale_items.line_total) as total_revenue')
            )
            ->groupBy('products.name')
            ->orderByDesc('total_qty')
            ->limit($limit)
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function stockMovementSummary(Request $request): JsonResponse
    {
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to   = $request->get('to',   now()->toDateString());

        if ($from > $to) {
            return response()->json(['message' => 'from date must be before to date.'], 422);
        }
        if (now()->parse($from)->diffInDays(now()->parse($to)) > 365) {
            return response()->json(['message' => 'Date range cannot exceed 365 days.'], 422);
        }

        $rows = DB::table('products as p')
            ->where('p.is_active', true)
            ->leftJoin('stock_movements as sm', function ($join) use ($from, $to) {
                $join->on('sm.product_id', '=', 'p.id')
                     ->whereDate('sm.created_at', '>=', $from)
                     ->whereDate('sm.created_at', '<=', $to);
            })
            ->selectRaw("
                p.name AS product,
                p.stock_qty AS current_qty,
                COALESCE(SUM(CASE WHEN sm.movement_type IN ('stock_in','returned') THEN sm.quantity ELSE 0 END), 0) AS stock_in,
                COALESCE(SUM(CASE WHEN sm.movement_type IN ('stock_out','sale','damaged') THEN sm.quantity ELSE 0 END), 0) AS stock_out
            ")
            ->groupBy('p.id', 'p.name', 'p.stock_qty')
            ->orderBy('p.name')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function stockValue(): JsonResponse
    {
        $rows = Product::where('is_active', true)
            ->get(['id', 'name', 'stock_qty', 'cost_price', 'price'])
            ->map(fn($p) => [
                'product' => $p->name,
                'stock_qty' => $p->stock_qty,
                'cost_value' => $p->stock_qty * $p->cost_price,
                'sell_value' => $p->stock_qty * $p->price,
            ]);

        return response()->json([
            'data' => $rows,
            'totals' => [
                'cost_value' => $rows->sum('cost_value'),
                'sell_value' => $rows->sum('sell_value'),
            ],
        ]);
    }

    public function customerBalances(): JsonResponse
    {
        $customers = Customer::where('outstanding_balance', '>', 0)
            ->orderByDesc('outstanding_balance')
            ->get(['id', 'name', 'type', 'phone', 'outstanding_balance', 'total_spend']);

        return response()->json(['data' => $customers]);
    }

    public function paymentSummary(Request $request): JsonResponse
    {
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to   = $request->get('to',   now()->toDateString());

        if ($err = $this->validateDateRange($from, $to)) return $err;

        $rows = Payment::select(
                'payment_method',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(amount) as total')
            )
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->groupBy('payment_method')
            ->get();

        return response()->json([
            'data' => $rows,
            'total_collected' => $rows->sum('total'),
        ]);
    }
}
