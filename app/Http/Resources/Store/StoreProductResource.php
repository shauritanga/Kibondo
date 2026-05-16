<?php

namespace App\Http\Resources\Store;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreProductResource extends JsonResource
{
    private static function promoPercentage(): int
    {
        static $pct = null;
        if ($pct === null) {
            $pct = (int) \App\Models\Setting::get('promo_percentage', '0');
        }
        return $pct;
    }

    public function toArray(Request $request): array
    {
        $pct = self::promoPercentage();
        $promoPrice = $pct > 0 ? (int) round($this->price * (1 - $pct / 100)) : null;

        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'description'   => $this->description,
            'unit'          => $this->unit,
            'price'         => $this->price,
            'promo_price'   => $promoPrice,
            'promo_percent' => $pct > 0 ? $pct : null,
            'stock_qty'     => $this->stock_qty,
            'category_id'   => $this->category_id,
            'category_name' => $this->category?->name,
            'image_url'     => $this->image_url,
        ];
    }
}
