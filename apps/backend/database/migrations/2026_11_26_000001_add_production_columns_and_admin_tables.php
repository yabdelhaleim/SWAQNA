<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'password')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('password')->nullable()->after('email');
            });
        }

        if (!Schema::hasColumn('merchants', 'commission_rate')) {
            Schema::table('merchants', function (Blueprint $table) {
                $table->decimal('commission_rate', 5, 2)->default(10.00)->after('total_reviews');
            });
        }

        if (!Schema::hasTable('delivery_captains')) {
            Schema::create('delivery_captains', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('name', 150);
                $table->string('phone', 20)->unique();
                $table->string('vehicle_type', 30)->default('MOTORCYCLE');
                $table->string('status', 30)->default('AVAILABLE');
                $table->string('current_zone', 150)->nullable();
                $table->decimal('rating', 3, 2)->default(5.00);
                $table->unsignedInteger('completed_today')->default(0);
                $table->decimal('total_earnings_today', 10, 2)->default(0.00);
                $table->timestamps();
            });
        }

        if (!Schema::hasColumn('orders', 'captain_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->foreignUuid('captain_id')
                    ->nullable()
                    ->constrained('delivery_captains')
                    ->nullOnDelete();
            });
        }

        if (!Schema::hasTable('withdrawal_requests')) {
            Schema::create('withdrawal_requests', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('reference_id', 30)->unique();
                $table->foreignUuid('merchant_id')->constrained('merchants')->cascadeOnDelete();
                $table->foreignUuid('wallet_id')->constrained('wallets')->cascadeOnDelete();
                $table->decimal('amount', 12, 2);
                $table->string('payout_method', 30);
                $table->string('account_details', 255);
                $table->text('notes')->nullable();
                $table->string('status', 30)->default('PENDING');
                $table->text('admin_notes')->nullable();
                $table->foreignUuid('processed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('withdrawal_requests');

        if (Schema::hasColumn('orders', 'captain_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropConstrainedForeignId('captain_id');
            });
        }

        Schema::dropIfExists('delivery_captains');

        if (Schema::hasColumn('merchants', 'commission_rate')) {
            Schema::table('merchants', function (Blueprint $table) {
                $table->dropColumn('commission_rate');
            });
        }

        if (Schema::hasColumn('users', 'password')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('password');
            });
        }
    }
};
