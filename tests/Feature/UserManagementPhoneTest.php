<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManagementPhoneTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_must_provide_unique_phone_when_creating_staff(): void
    {
        Sanctum::actingAs($this->user('admin', 'admin@example.com', '+255700000001'));

        $this->postJson('/api/v1/users', [
            'name' => 'Sales User',
            'email' => 'sales@example.com',
            'password' => 'password123',
            'role' => 'sales',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);

        $this->postJson('/api/v1/users', [
            'name' => 'Sales User',
            'email' => 'sales@example.com',
            'phone' => '+255700000001',
            'password' => 'password123',
            'role' => 'sales',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);

        $this->postJson('/api/v1/users', [
            'name' => 'Sales User',
            'email' => 'sales@example.com',
            'phone' => '+255700000002',
            'password' => 'password123',
            'role' => 'sales',
        ])->assertCreated()
            ->assertJsonPath('data.phone', '+255700000002');
    }

    public function test_admin_can_toggle_staff_active_status_without_resending_phone(): void
    {
        $admin = $this->user('admin', 'admin@example.com', '+255700000001');
        $staff = $this->user('sales', 'sales@example.com', '+255700000002');

        Sanctum::actingAs($admin);

        $this->putJson("/api/v1/users/{$staff->id}", [
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.phone', '+255700000002');
    }

    private function user(string $role, string $email, string $phone): User
    {
        return User::create([
            'name' => ucfirst($role) . ' User',
            'email' => $email,
            'phone' => $phone,
            'password' => Hash::make('password'),
            'role' => $role,
            'is_active' => true,
        ]);
    }
}
