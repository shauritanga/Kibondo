<?php

namespace App\Http\Resources\Store;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'sale_number'           => $this->sale_number,
            'total_amount'          => $this->total_amount,
            'status'                => $this->status,
            'payment_status'        => $this->payment_status,
            'items_count'           => $this->items_count,
            'delivery_confirmed_at' => $this->delivery_confirmed_at,
            'created_at'            => $this->created_at,
        ];
    }
}
