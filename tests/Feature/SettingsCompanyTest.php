<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SettingsCompanyTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_store_company_settings_return_defaults(): void
    {
        $this->getJson('/api/v1/store/settings/company')
            ->assertOk()
            ->assertJson([
                'name'    => 'Kibondo Green Farm',
                'phone'   => '+255 655 591 660',
                'email'   => 'sales@kibondo.co.tz',
                'address' => '',
                'city'    => 'Dar es Salaam',
                'country' => 'Tanzania',
            ]);
    }

    public function test_admin_can_update_company_settings(): void
    {
        $admin = User::create([
            'name'      => 'Admin User',
            'email'     => 'admin@example.com',
            'password'  => Hash::make('password'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $payload = [
            'name'    => 'Kibondo Green Farm',
            'phone'   => '+255 655 591 660',
            'email'   => 'sales@kibondo.co.tz',
            'address' => 'Msasani',
            'city'    => 'Dar es Salaam',
            'country' => 'Tanzania',
        ];

        $this->putJson('/api/v1/settings/company', $payload)
            ->assertOk()
            ->assertJson([
                'message' => 'Company information saved.',
                'company' => $payload,
            ]);

        $this->assertSame('Msasani', Setting::get('company_address'));
    }

    public function test_company_settings_update_requires_admin(): void
    {
        $this->putJson('/api/v1/settings/company', [
            'name' => 'Kibondo Green Farm',
        ])->assertUnauthorized();
    }
}
