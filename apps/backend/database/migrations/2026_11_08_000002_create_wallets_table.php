<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignUuid('merchant_id')->nullable()->constrained('merchants')->onDelete('cascade');
            $table->string('wallet_type', 50); // CUSTOMER, MERCHANT, DELIVERY_CAPTAIN, PLATFORM_REVENUE
            $table->decimal('balance', 12, 2)->default(0.00);
            $table->decimal('locked_amount', 12, 2)->default(0.00);
            $table->string('currency', 5)->default('EGP');
            $table->timestamp('updated_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
