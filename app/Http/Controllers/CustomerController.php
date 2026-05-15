<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'ilike', '%' . $request->search . '%')
                  ->orWhere('phone', 'ilike', '%' . $request->search . '%');
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('balance_status')) {
            if ($request->balance_status === 'open') {
                $query->where('outstanding_balance', '>', 0);
            } elseif ($request->balance_status === 'clear') {
                $query->where('outstanding_balance', '<=', 0);
            }
        }

        $customers = $query->orderBy('name')->paginate(10);

        return response()->json($customers);
    }

    public function stats(): JsonResponse
    {
        return response()->json([
            'total'              => Customer::count(),
            'total_spend'        => Customer::sum('total_spend'),
            'total_outstanding'  => Customer::sum('outstanding_balance'),
            'open_balance_count' => Customer::where('outstanding_balance', '>', 0)->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:200',
            'business_name' => 'nullable|string|max:200',
            'type'          => 'required|in:retail,wholesale,distributor,hotel,restaurant,repeat_buyer',
            'phone'         => 'nullable|string|max:30',
            'alt_phone'     => 'nullable|string|max:30',
            'email'         => 'nullable|email|max:180',
            'location'      => 'nullable|string|max:200',
            'payment_terms' => 'nullable|in:cod,net_7,net_14,net_30',
            'credit_limit'  => 'nullable|integer|min:0',
            'crm_stage'     => 'nullable|string|max:100',
            'crm_score'     => 'nullable|integer|min:0|max:100',
            'next_follow_up'=> 'nullable|date',
        ]);

        $customer = Customer::create($data);

        return response()->json(['data' => $customer], 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        $customer->loadCount('sales');

        return response()->json(['data' => $customer]);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'sometimes|string|max:200',
            'business_name' => 'nullable|string|max:200',
            'type'          => 'sometimes|in:retail,wholesale,distributor,hotel,restaurant,repeat_buyer',
            'phone'         => 'nullable|string|max:30',
            'alt_phone'     => 'nullable|string|max:30',
            'email'         => 'nullable|email|max:180',
            'location'      => 'nullable|string|max:200',
            'payment_terms' => 'nullable|in:cod,net_7,net_14,net_30',
            'credit_limit'  => 'nullable|integer|min:0',
            'crm_stage'     => 'nullable|string|max:100',
            'crm_score'     => 'nullable|integer|min:0|max:100',
            'next_follow_up'=> 'nullable|date',
        ]);

        $customer->update($data);

        return response()->json(['data' => $customer]);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $customer->delete();

        return response()->json(['message' => 'Customer deleted.']);
    }
}
