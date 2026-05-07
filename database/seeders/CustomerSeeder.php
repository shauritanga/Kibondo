<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            ['name' => 'Serena Hotel Dar es Salaam', 'type' => 'hotel', 'phone' => '+255222117000', 'location' => 'Dar es Salaam'],
            ['name' => 'Karibu Fresh Market', 'type' => 'retail', 'phone' => '+255754001122', 'location' => 'Arusha'],
            ['name' => 'TZ Export Co. Ltd', 'type' => 'distributor', 'phone' => '+255713445566', 'location' => 'Dar es Salaam'],
            ['name' => 'Mama Mboga Wholesale', 'type' => 'wholesale', 'phone' => '+255765334455', 'location' => 'Mwanza'],
            ['name' => 'Savanna Restaurant', 'type' => 'restaurant', 'phone' => '+255784223344', 'location' => 'Zanzibar'],
        ];

        foreach ($customers as $customer) {
            DB::table('customers')->insertOrIgnore(array_merge($customer, [
                'id' => Str::uuid(),
                'outstanding_balance' => 0,
                'total_spend' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
