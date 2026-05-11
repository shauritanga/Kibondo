<?php

namespace Tests\Feature\Store;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_register(): void
    {
        $response = $this->postJson('/api/v1/store/auth/register', [
            'name'                  => 'Jane Doe',
            'phone'                 => '+255 712 345 678',
            'email'                 => 'jane@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['token', 'customer' => ['id', 'name', 'email', 'phone']]);

        $this->assertDatabaseHas('customers', ['email' => 'jane@example.com']);
    }

    public function test_register_requires_unique_email(): void
    {
        Customer::factory()->create(['email' => 'jane@example.com']);

        $this->postJson('/api/v1/store/auth/register', [
            'name'                  => 'Jane Doe',
            'phone'                 => '+255 712 999 999',
            'email'                 => 'jane@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['email']);
    }

    public function test_register_requires_unique_phone(): void
    {
        Customer::factory()->create(['phone' => '+255 712 345 678']);

        $this->postJson('/api/v1/store/auth/register', [
            'name'                  => 'Jane Doe',
            'phone'                 => '+255 712 345 678',
            'email'                 => 'unique@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['phone']);
    }

    public function test_customer_can_login(): void
    {
        $customer = Customer::factory()->create(['email' => 'jane@example.com']);

        $this->postJson('/api/v1/store/auth/login', [
            'email'    => 'jane@example.com',
            'password' => 'password',
        ])->assertOk()
          ->assertJsonStructure(['token', 'customer' => ['id', 'name', 'email', 'phone']]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        Customer::factory()->create(['email' => 'jane@example.com']);

        $this->postJson('/api/v1/store/auth/login', [
            'email'    => 'jane@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors(['email']);
    }

    public function test_me_returns_authenticated_customer(): void
    {
        $customer = Customer::factory()->create();

        $this->actingAs($customer, 'customer')
            ->getJson('/api/v1/store/auth/me')
            ->assertOk()
            ->assertJsonPath('id', $customer->id);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/store/auth/me')->assertUnauthorized();
    }

    public function test_customer_can_logout(): void
    {
        $customer = Customer::factory()->create();
        $token    = $customer->createToken('store')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/store/auth/logout')
            ->assertOk();
    }
}
