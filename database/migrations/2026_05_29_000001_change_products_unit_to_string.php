<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE products ALTER COLUMN unit DROP DEFAULT');
        DB::statement('ALTER TABLE products ALTER COLUMN unit TYPE varchar(30) USING unit::text');
        DB::statement("ALTER TABLE products ALTER COLUMN unit SET DEFAULT 'kg'");
    }

    public function down(): void
    {
        // Custom units (e.g. g, 500g) cannot be restored to the original enum safely.
    }
};
