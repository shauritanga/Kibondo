<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE UNIQUE INDEX users_phone_unique ON users (phone) WHERE deleted_at IS NULL AND phone IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS users_phone_unique');
    }
};
