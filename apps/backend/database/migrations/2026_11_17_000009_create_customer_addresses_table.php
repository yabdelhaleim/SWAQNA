<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('label', 50)->default('home'); // home, work, other
            $table->string('title', 100); // e.g. المنزل, العمل, بيت العيلة
            $table->string('city', 100)->default('القاهرة');
            $table->string('area', 150); // e.g. المعادي, التجمع الخامس, الدقي
            $table->string('street', 200); // e.g. شارع 9
            $table->string('building', 100)->nullable(); // e.g. عمارة 14
            $table->string('floor', 50)->nullable(); // e.g. الدور الثالث
            $table->string('apartment', 50)->nullable(); // e.g. شقة 5
            $table->text('landmark')->nullable(); // e.g. بجوار صيدلية العزبي
            $table->string('phone', 20)->nullable(); // alternate contact phone
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_default']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
    }
};
