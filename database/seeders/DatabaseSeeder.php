<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $seeders = [];

        if (class_exists(AdminUserSeeder::class)) {
            $seeders[] = AdminUserSeeder::class;
        } elseif (filter_var(env('SEED_DEV_ADMIN', app()->environment('local')), FILTER_VALIDATE_BOOL)) {
            $seeders[] = DevAdminSeeder::class;
        }

        $seeders[] = CategorySeeder::class;
        $seeders[] = ProductSeeder::class;
        $seeders[] = SettingsSeeder::class;

        $this->call($seeders);
    }
}
