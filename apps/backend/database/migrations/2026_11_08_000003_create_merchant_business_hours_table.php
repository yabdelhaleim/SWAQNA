<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchant_business_hours', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('merchant_id')->constrained('merchants')->onDelete('cascade');
            $table->tinyInteger('day_of_week'); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            $table->time('open_time')->default('09:00:00');
            $table->time('close_time')->default('23:00:00');
            $table->boolean('is_closed')->default(false);
            $table->timestamps();

            $table->unique(['merchant_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_business_hours');
    }
};
