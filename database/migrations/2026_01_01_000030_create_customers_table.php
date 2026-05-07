<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('name', 200);
            $table->enum('type', ['retail', 'wholesale', 'distributor', 'hotel', 'restaurant', 'repeat_buyer'])->default('retail');
            $table->string('phone', 30)->nullable();
            $table->string('email', 180)->nullable();
            $table->string('location', 200)->nullable();
            $table->string('crm_stage', 100)->nullable();
            $table->smallInteger('crm_score')->nullable();
            $table->date('next_follow_up')->nullable();
            $table->bigInteger('outstanding_balance')->default(0);
            $table->bigInteger('total_spend')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
