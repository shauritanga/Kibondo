<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Phone column itself is added in 2026_05_31_000001_add_sms_preferences.
 * Kept as a no-op so environments that already recorded this migration stay consistent.
 */
return new class extends Migration
{
    public function up(): void
    {
        //
    }

    public function down(): void
    {
        //
    }
};
