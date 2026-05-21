<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            // 'paid_full' | 'paid_partial' | 'not_paid'
            $table->string('customer_payment_type', 20)->nullable()->after('customer_feedback');
            $table->unsignedBigInteger('customer_payment_amount')->nullable()->after('customer_payment_type');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['customer_payment_type', 'customer_payment_amount']);
        });
    }
};
