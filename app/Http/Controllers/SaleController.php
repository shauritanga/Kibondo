<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\User;
use App\Notifications\DeliveryConfirmedNotification;
use App\Notifications\OrderAssignedNotification;
use App\Notifications\OrderCancelledNotification;
use App\Notifications\OrderConfirmedNotification;
use App\Notifications\OrderDeliveredNotification;
use App\Services\AuditService;
use App\Services\SaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class SaleController extends Controller
{
    public function __construct(private SaleService $sales) {}

    public function index(Request $request): JsonResponse
    {
        $query = Sale::with(['customer:id,name', 'user:id,name', 'assignedTo:id,name'])
            ->withCount('items');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('sale_number', 'ilike', "%{$search}%")
                  ->orWhereHas('customer', fn ($c) => $c->where('name', 'ilike', "%{$search}%"));
            });
        }

        // Delivery persons see only their assigned orders
        if (auth()->user()->role === 'delivery') {
            $query->where('assigned_to', auth()->id());
        }

        return response()->json($query->orderByDesc('created_at')->paginate(10));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id'      => 'nullable|uuid|exists:customers,id',
            'guest_name'       => 'nullable|string|max:255',
            'guest_phone'      => 'nullable|string|max:30',
            'guest_email'      => 'nullable|email|max:255',
            'guest_company'    => 'nullable|string|max:255',
            'payment_method'   => 'sometimes|string',
            'status'           => 'sometimes|in:completed,pending,confirmed',
            'discount_amount'  => 'sometimes|integer|min:0',
            'note'             => 'nullable|string|max:500',
            'delivery_address' => 'nullable|string|max:500',
            'delivery_zone_id' => 'nullable|uuid|exists:delivery_zones,id',
            'delivery_cost'    => 'nullable|integer|min:0',
            'is_offline_sync'  => 'sometimes|boolean',
            'items'            => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1',
        ]);

        // Resolve unit prices server-side — never trust client-supplied prices
        $validated['items'] = collect($validated['items'])->map(function ($item) {
            $product = \App\Models\Product::findOrFail($item['product_id']);
            return array_merge($item, ['unit_price' => $product->price]);
        })->toArray();

        $sale = $this->sales->createSale($validated, $request->user()->id);

        AuditService::log([
            'action'      => 'order_created',
            'module'      => 'orders',
            'description' => "Order {$sale->sale_number} created",
            'record_id'   => $sale->id,
            'table_name'  => 'sales',
            'new_values'  => ['sale_number' => $sale->sale_number, 'total_amount' => $sale->total_amount, 'status' => $sale->status],
        ]);

        return response()->json(['data' => $sale], 201);
    }

    public function show(Sale $sale): JsonResponse
    {
        if (auth()->user()->role === 'delivery') {
            abort_unless($sale->assigned_to === auth()->id(), 403);
        }

        $sale->load(['customer', 'user:id,name', 'assignedTo:id,name', 'items.product', 'payments']);

        return response()->json(['data' => $sale]);
    }

    public function confirm(Request $request, Sale $sale): JsonResponse
    {
        abort_unless($sale->status === 'pending', 422, 'Only pending orders can be confirmed.');

        $request->validate([
            'delivery_cost' => 'sometimes|integer|min:0',
        ]);

        DB::transaction(function () use ($request, $sale) {
            $updates = ['status' => 'confirmed'];

            if ($request->has('delivery_cost') && $sale->delivery_cost === null) {
                $cost     = $request->integer('delivery_cost');
                $newTotal = $sale->subtotal - $sale->discount_amount + $cost;

                $updates['delivery_cost'] = $cost;
                $updates['total_amount']  = $newTotal;
                $updates['outstanding']   = max(0, $newTotal - $sale->paid_amount);

                if ($sale->customer_id) {
                    $sale->customer()->increment('outstanding_balance', $cost);
                    $sale->customer()->increment('total_spend', $cost);
                }
            }

            $sale->update($updates);
        });

        AuditService::log([
            'action'      => 'order_confirmed',
            'module'      => 'orders',
            'description' => "Order {$sale->sale_number} confirmed",
            'record_id'   => $sale->id,
            'table_name'  => 'sales',
        ]);

        $this->notifyBuyer($sale->refresh(), new OrderConfirmedNotification($sale));

        return response()->json(['data' => $sale->refresh()]);
    }

    public function assign(Request $request, Sale $sale): JsonResponse
    {
        $data = $request->validate([
            'user_id'                         => 'nullable|required_without:external_delivery_name|uuid|exists:users,id',
            'external_delivery_name'          => 'nullable|required_without:user_id|string|max:120',
            'external_delivery_phone'         => 'nullable|required_with:external_delivery_name|string|max:40',
            'external_delivery_vehicle_plate' => 'nullable|required_with:external_delivery_name|string|max:40',
        ]);

        if (! empty($data['user_id']) && ! empty($data['external_delivery_name'])) {
            return response()->json(['message' => 'Choose either an internal driver or an external courier, not both.'], 422);
        }

        abort_unless(
            in_array($sale->status, ['confirmed', 'pending'], true),
            422,
            'Order must be pending or confirmed before assigning a delivery person.'
        );

        if (! empty($data['user_id'])) {
            $deliveryUser = User::where('id', $data['user_id'])
                ->where('role', 'delivery')
                ->firstOrFail();

            $sale->update([
                'status'                           => 'out_for_delivery',
                'assigned_to'                      => $deliveryUser->id,
                'external_delivery_name'           => null,
                'external_delivery_phone'          => null,
                'external_delivery_vehicle_plate'  => null,
                'processed_by'                     => auth()->id(),
            ]);

            AuditService::log([
                'action'      => 'order_assigned',
                'module'      => 'orders',
                'description' => "Order {$sale->sale_number} assigned to {$deliveryUser->name}",
                'record_id'   => $sale->id,
                'table_name'  => 'sales',
                'metadata'    => ['delivery_user_id' => $deliveryUser->id, 'delivery_user_name' => $deliveryUser->name],
            ]);

            $this->notifyBuyer($sale, new OrderAssignedNotification($sale, 'customer'));

            $deliveryUser->notify(new OrderAssignedNotification($sale, 'delivery'));

            $sale->load('assignedTo:id,name');

            return response()->json(['data' => $sale]);
        }

        $sale->update([
            'status'                           => 'out_for_delivery',
            'assigned_to'                      => null,
            'external_delivery_name'           => $data['external_delivery_name'],
            'external_delivery_phone'          => $data['external_delivery_phone'],
            'external_delivery_vehicle_plate'  => $data['external_delivery_vehicle_plate'],
            'processed_by'                     => auth()->id(),
        ]);

        AuditService::log([
            'action'      => 'order_assigned',
            'module'      => 'orders',
            'description' => "Order {$sale->sale_number} assigned to external courier {$data['external_delivery_name']}",
            'record_id'   => $sale->id,
            'table_name'  => 'sales',
            'metadata'    => [
                'external_delivery_name'          => $data['external_delivery_name'],
                'external_delivery_phone'         => $data['external_delivery_phone'],
                'external_delivery_vehicle_plate' => $data['external_delivery_vehicle_plate'],
            ],
        ]);

        $this->notifyBuyer($sale, new OrderAssignedNotification($sale, 'customer'));

        $sale->load('assignedTo:id,name');

        return response()->json(['data' => $sale]);
    }

    public function deliver(Request $request, Sale $sale): JsonResponse
    {
        if (auth()->user()->role === 'delivery') {
            abort_unless($sale->assigned_to === auth()->id(), 403);
        }

        abort_unless($sale->status === 'out_for_delivery', 422, 'Order must be out for delivery before marking as delivered.');

        // Registered-customer orders wait for the customer to confirm receipt.
        // Guest orders complete immediately — there is no customer account to confirm.
        $newStatus = $sale->customer_id ? 'awaiting_confirmation' : 'completed';

        $sale->update(['status' => $newStatus]);

        AuditService::log([
            'action'      => 'order_delivered',
            'module'      => 'orders',
            'description' => "Order {$sale->sale_number} marked as delivered (status: {$newStatus})",
            'record_id'   => $sale->id,
            'table_name'  => 'sales',
        ]);

        $this->notifyBuyer($sale, new OrderDeliveredNotification($sale));

        return response()->json(['data' => $sale]);
    }

    public function updateStatus(Request $request, Sale $sale): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:cancelled,completed',
        ]);

        // Admin force-complete: move an awaiting_confirmation order to completed
        // when the customer has not confirmed within a reasonable time.
        if ($request->status === 'completed') {
            if ($sale->status !== 'awaiting_confirmation') {
                return response()->json(['message' => 'Only orders awaiting confirmation can be force-completed.'], 422);
            }

            $sale->update(['status' => 'completed']);

            AuditService::log([
                'action'      => 'order_force_completed',
                'module'      => 'orders',
                'description' => "Order {$sale->sale_number} force-completed by admin",
                'record_id'   => $sale->id,
                'table_name'  => 'sales',
            ]);

            $sale->load('items.product', 'customer', 'assignedTo:id,name', 'payments', 'deliveryZone');
            return response()->json(['data' => $sale]);
        }

        if ($sale->status === 'cancelled') {
            return response()->json(['message' => 'Sale is already cancelled.'], 422);
        }

        if (in_array($sale->status, ['completed', 'awaiting_confirmation'])) {
            return response()->json(['message' => 'Cannot cancel a completed sale.'], 422);
        }

        if ($sale->paid_amount > 0) {
            return response()->json(['message' => 'Cannot cancel a sale with recorded payments. Void the payments first.'], 422);
        }

        $this->sales->cancelSale($sale, $request->user()->id);

        AuditService::log([
            'action'      => 'order_cancelled',
            'module'      => 'orders',
            'description' => "Order {$sale->sale_number} cancelled",
            'record_id'   => $sale->id,
            'table_name'  => 'sales',
        ]);

        $this->notifyBuyer($sale, new OrderCancelledNotification($sale));

        return response()->json(['data' => $sale]);
    }

    private function notifyBuyer(Sale $sale, \Illuminate\Notifications\Notification $notification): void
    {
        if ($sale->customer_id) {
            $sale->customer->notify($notification);
            return;
        }

        $route = Notification::route('mail', []);

        if ($sale->guest_email) {
            $route = Notification::route('mail', [$sale->guest_email => $sale->guest_name ?? 'Customer']);
        }

        if ($sale->guest_phone) {
            $route->route('sms', $sale->guest_phone);
        }

        if ($sale->guest_email || $sale->guest_phone) {
            $route->notify($notification);
        }
    }

    public function destroy(Sale $sale): JsonResponse
    {
        if ($sale->paid_amount > 0) {
            return response()->json(['message' => 'Cannot delete a sale with recorded payments.'], 422);
        }

        $sale->delete();

        return response()->json(['message' => 'Sale deleted.']);
    }
}
