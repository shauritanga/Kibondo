<?php

namespace App\Http\Resources\Store;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'sale_number'           => $this->sale_number,
            'subtotal'              => $this->subtotal,
            'discount_amount'       => $this->discount_amount,
            'total_amount'          => $this->total_amount,
            'status'                => $this->status,
            'payment_status'        => $this->payment_status,
            'delivery_address'      => $this->delivery_address,
            'assigned_to_name'      => $this->assignedTo?->name,
            'delivery_confirmed_at' => $this->delivery_confirmed_at,
            'customer_feedback'     => $this->customer_feedback,
            'created_at'            => $this->created_at,
            'items'                 => OrderItemResource::collection($this->items),
        ];
    }
}
