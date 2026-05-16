<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('guest_email', 255)->nullable()->after('guest_phone');
            $table->string('guest_company', 100)->nullable()->after('guest_email');
            $table->text('billing_address')->nullable()->after('delivery_address');
            $table->string('payment_method', 30)->nullable()->default('cash')->after('payment_status');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['guest_email', 'guest_company', 'billing_address', 'payment_method']);
        });
    }
};
