<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Sale;
use App\Notifications\PaymentReceivedNotification;
use App\Support\BuyerNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function recordPayment(array $data, string $userId): Payment
    {
        $payment = DB::transaction(function () use ($data, $userId) {
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

        try {
            $sale = $payment->sale->fresh();
            BuyerNotifier::notify($sale, new PaymentReceivedNotification($payment, $sale));
        } catch (\Throwable $e) {
            Log::warning('Payment received notification failed.', [
                'payment_id' => $payment->id,
                'error'      => $e->getMessage(),
            ]);
        }

        return $payment;
    }
}
