<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Remove old fixed-key rows and replace with a single JSON array
        DB::table('settings')->whereIn('key', ['social_whatsapp', 'social_facebook', 'social_instagram'])->delete();

        DB::table('settings')->insert([
            'key'        => 'social_links',
            'value'      => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'social_links')->delete();
    }
};
