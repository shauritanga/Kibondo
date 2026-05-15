<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('business_name', 200)->nullable()->after('name');
            $table->string('alt_phone', 30)->nullable()->after('phone');
            $table->enum('payment_terms', ['cod', 'net_7', 'net_14', 'net_30'])->default('cod')->after('location');
            $table->bigInteger('credit_limit')->default(0)->after('outstanding_balance');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['business_name', 'alt_phone', 'payment_terms', 'credit_limit']);
        });
    }
};
