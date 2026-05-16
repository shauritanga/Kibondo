<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Http\Requests\Store\ConfirmDeliveryRequest;
use App\Http\Requests\Store\PlaceOrderRequest;
use App\Http\Resources\Store\OrderDetailResource;
use App\Http\Resources\Store\OrderSummaryResource;
use App\Models\DeliveryZone;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Customer;
use App\Models\User;
use App\Notifications\DeliveryConfirmedNotification;
use App\Notifications\OrderPlacedNotification;
use App\Services\SaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

/**
 * @group Store – Orders
 *
 * Place and manage customer orders. All endpoints require customer authentication.
 *
 * @authenticated
 */
class OrderController extends Controller
{
    public function __construct(private SaleService $sales) {}

    public function store(PlaceOrderRequest $request): JsonResponse
    {
        $customer = $request->user('customer');
        // Guard against Sanctum bleeding a staff session into the customer guard
        if (!($customer instanceof Customer)) {
            $customer = null;
        }

        $items = collect($request->items)->map(function ($item) use ($customer) {
            $product = Product::where('id', $item['product_id'])
                ->where('is_active', true)
                ->firstOrFail();

            if ($product->stock_qty <= 0) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'items' => "{$product->name} is currently out of stock.",
                ]);
            }

            if ($product->stock_qty < $item['quantity']) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'items' => "Only {$product->stock_qty} unit(s) of {$product->name} available. You requested {$item['quantity']}.",
                ]);
            }

            return [
                'product_id' => $product->id,
                'quantity'   => $item['quantity'],
                'unit_price' => $product->price,
            ];
        })->toArray();

        $deliveryZone = null;
        if ($request->filled('delivery_zone_id')) {
            $deliveryZone = DeliveryZone::where('id', $request->delivery_zone_id)
                ->where('is_active', true)
                ->first();
        }

        $sale = $this->sales->createSale([
            'customer_id'      => $customer?->id,
            'guest_name'       => $customer ? null : $request->guest_name,
            'guest_phone'      => $customer ? null : $request->guest_phone,
            'guest_email'      => $customer ? null : $request->guest_email,
            'guest_company'    => $customer ? null : $request->guest_company,
            'delivery_address' => $request->delivery_address,
            'billing_address'  => $request->billing_address,
            'delivery_zone_id' => $deliveryZone?->id,
            'delivery_cost'    => $deliveryZone?->delivery_cost,
            'payment_method'   => $request->payment_method ?? 'cash',
            'status'           => 'pending',
            'discount_amount'  => 0,
            'items'            => $items,
        ], null);

        $admins = User::where('role', 'admin')->get();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, new OrderPlacedNotification($sale));
        }

        return response()->json([
            'sale_number'    => $sale->sale_number,
            'total_amount'   => $sale->total_amount,
            'payment_method' => $sale->payment_method,
            'message'        => 'Order placed successfully. We will contact you to confirm delivery.',
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $orders = Sale::where('customer_id', $request->user('customer')->id)
            ->withCount('items')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => OrderSummaryResource::collection($orders),
        ]);
    }

    public function show(Request $request, Sale $sale): JsonResponse
    {
        abort_if($sale->customer_id !== $request->user('customer')->id, 403);

        $sale->load('items.product', 'assignedTo:id,name');

        return response()->json(['data' => new OrderDetailResource($sale)]);
    }

    public function confirm(ConfirmDeliveryRequest $request, Sale $sale): JsonResponse
    {
        abort_if($sale->customer_id !== $request->user('customer')->id, 403);

        if ($sale->status !== 'completed') {
            return response()->json(['message' => 'Order is not yet delivered.'], 422);
        }

        if ($sale->delivery_confirmed_at) {
            return response()->json(['message' => 'Delivery already confirmed.'], 422);
        }

        $sale->update([
            'delivery_confirmed_at' => now(),
            'customer_feedback'     => $request->feedback,
        ]);

        $admins = User::where('role', 'admin')->get();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, new DeliveryConfirmedNotification($sale));
        }

        if ($sale->assigned_to) {
            User::find($sale->assigned_to)?->notify(new DeliveryConfirmedNotification($sale));
        }

        return response()->json(['message' => 'Thank you for confirming your delivery!']);
    }
}
