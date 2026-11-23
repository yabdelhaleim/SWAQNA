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
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'delivery_pin')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('delivery_pin', 6)->nullable()->after('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'delivery_pin')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn('delivery_pin');
            });
        }
    }
};
