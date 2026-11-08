<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('owner_id')->constrained('users')->onDelete('restrict');
            $table->string('name', 200);
            $table->string('slug', 220)->unique();
            $table->string('merchant_type', 50); // RESTAURANT, RETAIL_SHOP, HOME_KITCHEN
            $table->text('logo_url')->nullable();
            $table->text('cover_image_url')->nullable();
            $table->string('phone_number', 20);
            $table->string('status', 50)->default('PENDING_APPROVAL');

            $table->string('fulfillment_type', 50)->default('PLATFORM_DELIVERY');
            $table->integer('preparation_time_minutes')->default(30);
            $table->decimal('min_order_amount', 10, 2)->default(0.00);

            $table->text('address_text');
            $table->geometry('location')->nullable();
            $table->decimal('delivery_radius_km', 6, 2)->default(10.00);

            $table->decimal('avg_rating', 3, 2)->default(0.00);
            $table->integer('total_reviews')->default(0);

            $table->timestamps();

            $table->index(['merchant_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchants');
    }
};
