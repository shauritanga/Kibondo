<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('provider', 50);
            $table->string('to', 30);
            $table->text('body');
            $table->string('status', 20); // queued|sent|failed
            $table->string('provider_message_id')->nullable();
            $table->text('error')->nullable();
            $table->jsonb('context')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_messages');
    }
};
