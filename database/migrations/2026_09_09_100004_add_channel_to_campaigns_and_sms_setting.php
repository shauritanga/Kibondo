<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Campaign channel column is added in 2026_05_31_000001_add_sms_preferences.
 * This migration only seeds the SMS kill-switch setting.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'sms_enabled'],
            ['value' => '1', 'created_at' => now(), 'updated_at' => now()]
        );
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'sms_enabled')->delete();
    }
};
