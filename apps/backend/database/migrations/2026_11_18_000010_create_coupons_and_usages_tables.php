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
        Schema::create('coupons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('type', 20)->default('FIXED'); // FIXED or PERCENTAGE
            $table->decimal('value', 10, 2); // e.g. 30.00 or 15.00%
            $table->decimal('min_order_amount', 10, 2)->default(0);
            $table->decimal('max_discount_amount', 10, 2)->nullable(); // cap for percentage
            $table->integer('max_uses')->nullable();
            $table->integer('used_count')->default(0);
            $table->integer('max_uses_per_user')->default(1);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('merchant_id')->nullable()->constrained('merchants')->nullOnDelete();
            $table->string('description', 255)->nullable();
            $table->timestamps();

            $table->index(['code', 'is_active']);
        });

        Schema::create('coupon_usages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('coupon_id')->constrained('coupons')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->decimal('discount_amount', 10, 2);
            $table->timestamp('used_at')->useCurrent();

            $table->index(['coupon_id', 'user_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('coupon_code', 50)->nullable()->after('discount_amount');
            $table->foreignUuid('coupon_id')->nullable()->after('coupon_code')->constrained('coupons')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['coupon_id']);
            $table->dropColumn(['coupon_code', 'coupon_id']);
        });
        Schema::dropIfExists('coupon_usages');
        Schema::dropIfExists('coupons');
    }
};
