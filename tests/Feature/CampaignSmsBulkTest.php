<?php

namespace Tests\Feature;

use App\Jobs\SendCampaignSmsBatchJob;
use App\Models\Campaign;
use App\Models\Customer;
use App\Models\Setting;
use App\Models\User;
use App\Services\CampaignService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class CampaignSmsBulkTest extends TestCase
{
    use RefreshDatabase;

    public function test_sms_campaign_dispatches_batch_jobs(): void
    {
        Queue::fake();
        Setting::set('sms_enabled', '1');
        config(['sms.bulk_chunk_size' => 2]);

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin-bulk@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        Customer::factory()->count(3)->create([
            'sms_marketing_opt_in' => true,
            'type' => 'retail',
        ]);

        $campaign = Campaign::create([
            'name' => 'Bulk Promo',
            'subject' => 'SMS',
            'body' => 'Hello farmers',
            'channel' => 'sms',
            'recipient_filter' => ['all' => true],
            'status' => 'draft',
            'created_by' => $admin->id,
        ]);

        app(CampaignService::class)->send($campaign);

        // 3 recipients, chunk size 2 → 2 batch jobs
        Queue::assertPushed(SendCampaignSmsBatchJob::class, 2);
        $this->assertSame(3, $campaign->fresh()->total_recipients);
    }
}
