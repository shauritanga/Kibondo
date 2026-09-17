<?php

namespace App\Console\Commands;

use App\Services\CampaignService;
use Illuminate\Console\Command;

class DispatchDueCampaigns extends Command
{
    protected $signature = 'campaigns:dispatch-due';

    protected $description = 'Send scheduled campaigns whose scheduled_at time has arrived';

    public function handle(CampaignService $campaigns): int
    {
        $started = $campaigns->dispatchDue();

        if ($started > 0) {
            $this->info("Dispatched {$started} scheduled campaign(s).");
        }

        return self::SUCCESS;
    }
}
