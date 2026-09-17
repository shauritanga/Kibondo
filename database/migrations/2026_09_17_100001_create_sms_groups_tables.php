<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('description')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('sms_group_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sms_group_id')->constrained('sms_groups')->cascadeOnDelete();
            $table->string('phone', 20);
            $table->string('name')->nullable();
            $table->foreignUuid('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->timestamps();

            $table->unique(['sms_group_id', 'phone']);
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_group_members');
        Schema::dropIfExists('sms_groups');
    }
};
