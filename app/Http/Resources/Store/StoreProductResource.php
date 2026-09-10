<?php

namespace App\Http\Resources\Store;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $salePrice = $this->hasActiveSalePrice() ? $this->sale_price : null;

        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'description'   => $this->description,
            'key_benefits'  => $this->key_benefits,
            'ingredients'   => $this->ingredients,
            'nutrition_info' => $this->nutrition_info,
            'packaging_details' => $this->packaging_details,
            'storage_instructions' => $this->storage_instructions,
            'unit'          => $this->unit,
            'price'         => $this->price,
            'sale_price'    => $salePrice,
            'active_price'  => $this->activePrice(),
            'promo_price'   => $salePrice,
            'promo_percent' => null,
            'stock_qty'     => $this->stock_qty,
            'min_stock'     => $this->min_stock,
            'category_id'   => $this->category_id,
            'category_name' => $this->category?->name,
            'image_url'     => $this->image_url,
        ];
    }
}
