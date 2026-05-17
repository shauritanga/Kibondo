<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $payments) {}

    public function index(Request $request): JsonResponse
    {
        $query = Payment::with(['sale:id,sale_number', 'customer:id,name', 'user:id,name']);

        if ($request->filled('sale_id')) {
            $query->where('sale_id', $request->sale_id);
        }

        if ($request->filled('method')) {
            $query->where('payment_method', $request->method);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        return response()->json($query->orderByDesc('created_at')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'sale_id' => 'required|uuid|exists:sales,id',
            'amount' => 'required|integer|min:1|max:999999999',
            'payment_method' => 'required|in:cash,mobile_money,card,credit,bank_transfer',
            'reference' => 'nullable|string|max:100',
            'note' => 'nullable|string|max:500',
        ]);

        $payment = $this->payments->recordPayment($request->all(), $request->user()->id);

        return response()->json(['data' => $payment], 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        return response()->json(['data' => $payment->load('sale', 'customer:id,name', 'user:id,name')]);
    }
}
