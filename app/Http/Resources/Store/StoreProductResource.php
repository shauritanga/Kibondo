<?php

namespace App\Http\Resources\Store;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'description'   => $this->description,
            'unit'          => $this->unit,
            'price'         => $this->price,
            'stock_qty'     => $this->stock_qty,
            'category_id'   => $this->category_id,
            'category_name' => $this->category?->name,
            'image_url'     => $this->image_url,
        ];
    }
}
