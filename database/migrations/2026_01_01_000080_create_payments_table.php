<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('sale_id');
            $table->uuid('customer_id')->nullable();
            $table->uuid('user_id');
            $table->bigInteger('amount');
            $table->enum('payment_method', ['cash', 'mobile_money', 'card', 'credit', 'bank_transfer'])->default('cash');
            $table->string('reference', 100)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->foreign('sale_id')->references('id')->on('sales');
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
            $table->foreign('user_id')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
