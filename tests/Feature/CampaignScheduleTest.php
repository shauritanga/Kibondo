<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\SmsGroup;
use App\Models\SmsGroupMember;
use App\Models\User;
use App\Services\CampaignService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CampaignScheduleTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'sched-admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);
    }

    public function test_schedule_series_creates_one_campaign_per_group_per_day(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $g1 = SmsGroup::create(['name' => 'Group One', 'created_by' => $admin->id]);
        $g2 = SmsGroup::create(['name' => 'Group Two', 'created_by' => $admin->id]);
        SmsGroupMember::create(['sms_group_id' => $g1->id, 'phone' => '255711111111', 'name' => 'A']);
        SmsGroupMember::create(['sms_group_id' => $g2->id, 'phone' => '255722222222', 'name' => 'B']);

        $start = now()->addDay()->toDateString();

        $res = $this->postJson('/api/v1/campaigns/schedule-series', [
            'name' => 'Weekly Promo',
            'body' => 'Karibu Kibondo!',
            'group_ids' => [$g1->id, $g2->id],
            'start_date' => $start,
            'send_time' => '09:30',
        ]);

        $res->assertCreated()->assertJsonPath('data.0.status', 'scheduled');
        $this->assertCount(2, $res->json('data'));

        $c1 = $res->json('data.0');
        $c2 = $res->json('data.1');

        $this->assertSame($g1->id, $c1['recipient_filter']['sms_group_id']);
        $this->assertSame($g2->id, $c2['recipient_filter']['sms_group_id']);

        $this->assertTrue(
            Carbon::parse($start.' 09:30:00', config('app.timezone'))
                ->equalTo(Carbon::parse($c1['scheduled_at']))
        );
        $this->assertTrue(
            Carbon::parse($start.' 09:30:00', config('app.timezone'))->addDay()
                ->equalTo(Carbon::parse($c2['scheduled_at']))
        );
    }

    public function test_dispatch_due_sends_scheduled_campaigns(): void
    {
        Queue::fake();
        Setting::set('sms_enabled', '1');
        config(['sms.default' => 'log']);

        $admin = $this->admin();
        $group = SmsGroup::create(['name' => 'Due', 'created_by' => $admin->id]);
        SmsGroupMember::create(['sms_group_id' => $group->id, 'phone' => '255733333333']);

        $campaign = app(CampaignService::class)->createCampaign([
            'name' => 'Due now',
            'channel' => 'sms',
            'body' => 'Hello',
            'recipient_filter' => ['sms_group_id' => $group->id],
        ], $admin);

        $campaign->update([
            'status' => 'scheduled',
            'scheduled_at' => now()->subMinute(),
        ]);

        $started = app(CampaignService::class)->dispatchDue();

        $this->assertSame(1, $started);
        $this->assertSame('sending', $campaign->fresh()->status);
        $this->artisan('campaigns:dispatch-due')->assertSuccessful();
    }

    public function test_cancel_schedule_returns_to_draft(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $group = SmsGroup::create(['name' => 'X', 'created_by' => $admin->id]);
        SmsGroupMember::create(['sms_group_id' => $group->id, 'phone' => '255744444444']);

        $create = $this->postJson('/api/v1/campaigns', [
            'name' => 'Later',
            'channel' => 'sms',
            'body' => 'Hi',
            'recipient_filter' => ['sms_group_id' => $group->id],
            'scheduled_at' => now()->addHours(3)->toIso8601String(),
        ]);
        $create->assertCreated()->assertJsonPath('data.status', 'scheduled');

        $id = $create->json('data.id');
        $this->postJson("/api/v1/campaigns/{$id}/cancel-schedule")
            ->assertOk()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.scheduled_at', null);
    }
}
