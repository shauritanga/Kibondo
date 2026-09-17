<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Setting;
use App\Models\SmsGroup;
use App\Models\User;
use App\Services\SmsComposeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SmsAdminFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'sms-admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);
    }

    public function test_admin_can_create_group_and_add_phones(): void
    {
        $admin = $this->admin();

        Sanctum::actingAs($admin);
        $create = $this->postJson('/api/v1/sms-groups', [
            'name' => 'Group One',
            'description' => 'Masaki list',
        ]);

        $create->assertCreated();
        $groupId = $create->json('data.id');

        $add = $this->postJson("/api/v1/sms-groups/{$groupId}/members", [
            'phones' => [
                ['phone' => '0765628429', 'name' => 'Alice'],
                ['phone' => '255753383840', 'name' => 'Bob'],
            ],
        ]);

        $add->assertOk()->assertJsonPath('added', 2);
        $this->assertDatabaseCount('sms_group_members', 2);
    }

    public function test_import_xlsx_style_csv_into_group(): void
    {
        $admin = $this->admin();
        $group = SmsGroup::create([
            'name' => 'Import',
            'created_by' => $admin->id,
        ]);

        $csv = "Number,Name\n0765111222,Customer A\n255766677788,Customer B\n";
        $file = UploadedFile::fake()->createWithContent('contacts.csv', $csv);

        Sanctum::actingAs($admin);
        $res = $this->post("/api/v1/sms-groups/{$group->id}/members/import", [
            'file' => $file,
        ]);

        $res->assertOk()->assertJsonPath('added', 2);
    }

    public function test_compose_single_and_group_bulk_with_log_driver(): void
    {
        Setting::set('sms_enabled', '1');
        config(['sms.default' => 'log']);

        $admin = $this->admin();
        $group = SmsGroup::create(['name' => 'Blast', 'created_by' => $admin->id]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/sms-groups/{$group->id}/members", [
            'phones' => [
                ['phone' => '0711000001'],
                ['phone' => '0711000002'],
            ],
        ])->assertOk();

        $single = $this->postJson('/api/v1/sms/send', [
            'to' => '0711000003',
            'body' => 'Hello single',
        ]);
        $single->assertOk();

        $bulk = $this->postJson('/api/v1/sms/send-bulk', [
            'body' => 'Hello group',
            'source' => 'group',
            'group_id' => $group->id,
        ]);
        $bulk->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('success', 2);
    }

    public function test_campaign_can_target_sms_group(): void
    {
        Setting::set('sms_enabled', '1');
        config(['sms.default' => 'log', 'queue.default' => 'sync']);

        $admin = $this->admin();
        $group = SmsGroup::create(['name' => 'Campaign Group', 'created_by' => $admin->id]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/sms-groups/{$group->id}/members", [
            'phones' => [['phone' => '0711222333', 'name' => 'C1']],
        ])->assertOk();

        $create = $this->postJson('/api/v1/campaigns', [
            'name' => 'Group SMS',
            'channel' => 'sms',
            'body' => 'Promo from group',
            'recipient_filter' => ['sms_group_id' => $group->id],
        ]);
        $create->assertCreated();

        $send = $this->postJson('/api/v1/campaigns/'.$create->json('data.id').'/send');
        $send->assertOk();

        $this->assertDatabaseHas('campaign_recipients', [
            'destination' => '255711222333',
            'channel' => 'sms',
        ]);
    }

    public function test_compose_service_resolves_customers_by_type(): void
    {
        Customer::factory()->create([
            'phone' => '0711555666',
            'type' => 'hotel',
        ]);
        Customer::factory()->create([
            'phone' => '0711777888',
            'type' => 'retail',
        ]);

        $phones = app(SmsComposeService::class)->resolvePhones([
            'source' => 'customers',
            'customer_filter' => ['type' => ['hotel']],
        ]);

        $this->assertSame(['255711555666'], $phones);
    }
}
