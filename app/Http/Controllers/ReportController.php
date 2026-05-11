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
    public function dashboard(): JsonResponse
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();

        $totalSalesToday = Sale::whereDate('created_at', $today)
            ->where('status', '!=', 'cancelled')
            ->sum('total_amount');

        $totalSalesMonth = Sale::whereDate('created_at', '>=', $monthStart)
            ->where('status', '!=', 'cancelled')
            ->sum('total_amount');

        $totalOrders = Sale::whereDate('created_at', $today)
            ->where('status', '!=', 'cancelled')
            ->count();

        $totalCustomers = Customer::count();

        $outstandingBalance = Customer::sum('outstanding_balance');

        $lowStockProducts = Product::where('is_active', true)
            ->whereColumn('stock_qty', '<=', 'min_stock')
            ->with('category:id,name')
            ->get(['id', 'name', 'stock_qty', 'min_stock', 'category_id']);

        // Sales trend — last 7 days
        $salesTrend = Sale::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_amount) as total')
            )
            ->where('status', '!=', 'cancelled')
            ->whereDate('created_at', '>=', now()->subDays(6)->toDateString())
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Payment method mix
        $paymentMix = Payment::select('payment_method', DB::raw('SUM(amount) as total'))
            ->whereDate('created_at', '>=', $monthStart)
            ->groupBy('payment_method')
            ->get();

        // Category sales mix
        $categoryMix = SaleItem::join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereDate('sales.created_at', '>=', $monthStart)
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
                    'total_sales_today' => $totalSalesToday,
                    'total_sales_month' => $totalSalesMonth,
                    'total_orders_today' => $totalOrders,
                    'total_customers' => $totalCustomers,
                    'outstanding_balance' => $outstandingBalance,
                    'low_stock_count' => $lowStockProducts->count(),
                ],
                'sales_trend' => $salesTrend,
                'payment_mix' => $paymentMix,
                'category_mix' => $categoryMix,
                'recent_sales' => $recentSales,
                'low_stock_products' => $lowStockProducts,
                'top_customers' => $topCustomers,
            ],
        ]);
    }

    public function sales(Request $request): JsonResponse
    {
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to = $request->get('to', now()->toDateString());
        $groupBy = $request->get('group_by', 'day');

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
        $to = $request->get('to', now()->toDateString());

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
        $limit = $request->get('limit', 5);
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to = $request->get('to', now()->toDateString());

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
        $to = $request->get('to', now()->toDateString());

        $inTypes  = ['stock_in', 'returned'];
        $outTypes = ['stock_out', 'sale', 'damaged'];

        $rows = Product::where('is_active', true)
            ->with(['stockMovements' => function ($q) use ($from, $to) {
                $q->whereDate('created_at', '>=', $from)
                  ->whereDate('created_at', '<=', $to);
            }])
            ->get(['id', 'name', 'stock_qty'])
            ->map(function ($product) use ($inTypes, $outTypes) {
                $in  = $product->stockMovements->whereIn('movement_type', $inTypes)->sum('quantity');
                $out = $product->stockMovements->whereIn('movement_type', $outTypes)->sum('quantity');
                return [
                    'product'     => $product->name,
                    'stock_in'    => $in,
                    'stock_out'   => $out,
                    'current_qty' => $product->stock_qty,
                ];
            });

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
        $to = $request->get('to', now()->toDateString());

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
