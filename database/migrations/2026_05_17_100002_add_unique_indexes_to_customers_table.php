<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Partial unique indexes — only enforce uniqueness on non-deleted rows
        DB::statement('CREATE UNIQUE INDEX customers_email_unique ON customers (email) WHERE deleted_at IS NULL AND email IS NOT NULL');
        DB::statement('CREATE UNIQUE INDEX customers_phone_unique ON customers (phone) WHERE deleted_at IS NULL AND phone IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS customers_email_unique');
        DB::statement('DROP INDEX IF EXISTS customers_phone_unique');
    }
};
