<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function recordPayment(array $data, string $userId): Payment
    {
        return DB::transaction(function () use ($data, $userId) {
            $sale = Sale::lockForUpdate()->findOrFail($data['sale_id']);

            if ($sale->payment_status === 'paid') {
                throw ValidationException::withMessages([
                    'sale_id' => 'This sale is already fully paid.',
                ]);
            }

            $amount = min($data['amount'], $sale->outstanding);

            $payment = Payment::create([
                'sale_id' => $sale->id,
                'customer_id' => $sale->customer_id,
                'user_id' => $userId,
                'amount' => $amount,
                'payment_method' => $data['payment_method'],
                'reference' => $data['reference'] ?? null,
                'note' => $data['note'] ?? null,
            ]);

            $newPaid = $sale->paid_amount + $amount;
            $newOutstanding = $sale->total_amount - $newPaid;
            $paymentStatus = $newOutstanding <= 0 ? 'paid' : ($newPaid > 0 ? 'partial' : 'unpaid');

            $sale->update([
                'paid_amount' => $newPaid,
                'outstanding' => max(0, $newOutstanding),
                'payment_status' => $paymentStatus,
            ]);

            // Update customer outstanding balance
            if ($sale->customer_id) {
                $sale->customer()->decrement('outstanding_balance', $amount);
            }

            return $payment->load('sale');
        });
    }
}
