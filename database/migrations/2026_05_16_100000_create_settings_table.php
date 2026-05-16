<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Seed defaults
        DB::table('settings')->insert([
            ['key' => 'social_whatsapp',  'value' => '', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'social_facebook',  'value' => '', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'social_instagram', 'value' => '', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
