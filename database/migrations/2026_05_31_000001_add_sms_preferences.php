<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 40)->nullable()->after('email');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->enum('order_notification_channel', ['email', 'sms', 'both'])->default('email')->after('email');
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $table->enum('channel', ['email', 'sms'])->default('email')->after('name');
        });

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->enum('channel', ['email', 'sms'])->default('email')->after('customer_id');
            $table->string('destination')->nullable()->after('channel');
        });
    }

    public function down(): void
    {
        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->dropColumn(['channel', 'destination']);
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('channel');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('order_notification_channel');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('phone');
        });
    }
};
