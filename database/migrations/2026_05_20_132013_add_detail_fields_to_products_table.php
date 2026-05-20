<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->text('key_benefits')->nullable()->after('description');
            $table->text('ingredients')->nullable()->after('key_benefits');
            $table->text('nutrition_info')->nullable()->after('ingredients');
            $table->text('packaging_details')->nullable()->after('nutrition_info');
            $table->text('storage_instructions')->nullable()->after('packaging_details');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'key_benefits',
                'ingredients',
                'nutrition_info',
                'packaging_details',
                'storage_instructions',
            ]);
        });
    }
};
