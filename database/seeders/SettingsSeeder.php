<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        Setting::set('require_2fa_for_admins', env('REQUIRE_2FA_FOR_ADMINS', '1'));
    }
}
