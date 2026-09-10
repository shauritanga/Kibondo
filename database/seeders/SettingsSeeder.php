<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        Setting::set('require_2fa_for_admins', env('REQUIRE_2FA_FOR_ADMINS', '1'));
        Setting::set('company_name', 'Kibondo Green Farm');
        Setting::set('company_phone', '+255 655 591 660');
        Setting::set('company_email', 'sales@kibondo.co.tz');
        Setting::set('company_address', '');
        Setting::set('company_city', 'Dar es Salaam');
        Setting::set('company_country', 'Tanzania');
    }
}
