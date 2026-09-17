<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->dropUnique(['campaign_id', 'customer_id']);
        });

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
        });

        DB::statement('ALTER TABLE campaign_recipients ALTER COLUMN customer_id DROP NOT NULL');

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
        });

        DB::statement('
            CREATE UNIQUE INDEX campaign_recipients_campaign_customer_unique
            ON campaign_recipients (campaign_id, customer_id)
            WHERE customer_id IS NOT NULL
        ');
        DB::statement('
            CREATE UNIQUE INDEX campaign_recipients_campaign_destination_unique
            ON campaign_recipients (campaign_id, destination)
            WHERE destination IS NOT NULL AND customer_id IS NULL
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS campaign_recipients_campaign_customer_unique');
        DB::statement('DROP INDEX IF EXISTS campaign_recipients_campaign_destination_unique');

        DB::table('campaign_recipients')->whereNull('customer_id')->delete();

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
        });

        DB::statement('ALTER TABLE campaign_recipients ALTER COLUMN customer_id SET NOT NULL');

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->foreign('customer_id')->references('id')->on('customers')->cascadeOnDelete();
            $table->unique(['campaign_id', 'customer_id']);
        });
    }
};
