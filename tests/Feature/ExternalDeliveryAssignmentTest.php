<?php

namespace Tests\Feature;

use App\Models\Sale;
use App\Models\User;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExternalDeliveryAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_assign_confirmed_order_to_external_courier(): void
    {
        $admin = $this->user('admin');
        $customer = Customer::factory()->create();
        $sale = $this->sale($admin, ['status' => 'confirmed', 'customer_id' => $customer->id]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/sales/{$sale->id}/assign", [
            'external_delivery_name'          => 'Juma Courier',
            'external_delivery_phone'         => '+255 711 222 333',
            'external_delivery_vehicle_plate' => 'T 123 ABC',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'out_for_delivery')
            ->assertJsonPath('data.assigned_to', null)
            ->assertJsonPath('data.external_delivery_name', 'Juma Courier')
            ->assertJsonPath('data.external_delivery_phone', '+255 711 222 333')
            ->assertJsonPath('data.external_delivery_vehicle_plate', 'T 123 ABC');

        $this->assertDatabaseHas('sales', [
            'id'                               => $sale->id,
            'status'                           => 'out_for_delivery',
            'assigned_to'                      => null,
            'external_delivery_name'           => 'Juma Courier',
            'external_delivery_phone'          => '+255 711 222 333',
            'external_delivery_vehicle_plate'  => 'T 123 ABC',
        ]);
    }

    public function test_guest_email_receives_external_assignment_without_customer_account(): void
    {
        $admin = $this->user('admin');
        $sale = $this->sale($admin, [
            'status' => 'confirmed',
            'guest_name' => 'Guest Buyer',
            'guest_email' => 'guest@example.com',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/sales/{$sale->id}/assign", [
            'external_delivery_name'          => 'Juma Courier',
            'external_delivery_phone'         => '+255 711 222 333',
            'external_delivery_vehicle_plate' => 'T 123 ABC',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'out_for_delivery')
            ->assertJsonPath('data.external_delivery_name', 'Juma Courier');
    }

    public function test_internal_driver_assignment_still_works(): void
    {
        $admin = $this->user('admin');
        $driver = $this->user('delivery', 'driver@example.com');
        $sale = $this->sale($admin, ['status' => 'confirmed']);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/sales/{$sale->id}/assign", [
            'user_id' => $driver->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'out_for_delivery')
            ->assertJsonPath('data.external_delivery_name', null);

        $this->assertDatabaseHas('sales', [
            'id'          => $sale->id,
            'assigned_to' => $driver->id,
        ]);
    }

    public function test_delivery_user_cannot_access_external_assigned_order(): void
    {
        $admin = $this->user('admin');
        $driver = $this->user('delivery', 'driver@example.com');
        $sale = $this->sale($admin, [
            'status' => 'out_for_delivery',
            'external_delivery_name' => 'Juma Courier',
            'external_delivery_phone' => '+255 711 222 333',
            'external_delivery_vehicle_plate' => 'T 123 ABC',
        ]);

        Sanctum::actingAs($driver);

        $this->getJson("/api/v1/sales/{$sale->id}")
            ->assertForbidden();
    }

    public function test_sales_user_can_mark_external_assigned_order_delivered(): void
    {
        $sales = $this->user('sales');
        $sale = $this->sale($sales, [
            'status' => 'out_for_delivery',
            'external_delivery_name' => 'Juma Courier',
            'external_delivery_phone' => '+255 711 222 333',
            'external_delivery_vehicle_plate' => 'T 123 ABC',
        ]);

        Sanctum::actingAs($sales);

        $this->postJson("/api/v1/sales/{$sale->id}/deliver")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');
    }

    private function user(string $role, string $email = 'user@example.com'): User
    {
        return User::create([
            'name'      => ucfirst($role) . ' User',
            'email'     => $email,
            'password'  => Hash::make('password'),
            'role'      => $role,
            'is_active' => true,
        ]);
    }

    private function sale(User $user, array $overrides = []): Sale
    {
        return Sale::create(array_merge([
            'sale_number'    => 'S-' . str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'user_id'        => $user->id,
            'subtotal'       => 10000,
            'discount_amount'=> 0,
            'total_amount'   => 10000,
            'paid_amount'    => 0,
            'outstanding'    => 10000,
            'status'         => 'confirmed',
            'payment_status' => 'unpaid',
        ], $overrides));
    }
}
