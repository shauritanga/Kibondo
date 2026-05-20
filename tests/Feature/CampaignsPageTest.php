<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CampaignsPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_preview_campaign_recipients(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);
        Customer::factory()->create(['email' => 'retail@example.com', 'type' => 'retail']);
        Customer::factory()->create(['email' => 'hotel@example.com', 'type' => 'hotel']);
        Customer::factory()->create(['email' => null, 'type' => 'retail']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/campaigns/recipient-preview?type[]=retail')
            ->assertOk()
            ->assertJson(['count' => 1]);
    }
}
