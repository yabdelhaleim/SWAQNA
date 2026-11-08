<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->string('fulfillment_type', 50)->default('MERCHANT_DELIVERY')->change();
            $table->string('fulfillment_request_status', 50)->default('NONE')->after('fulfillment_type');
            $table->string('requested_fulfillment_type', 50)->nullable()->after('fulfillment_request_status');
            $table->text('fulfillment_request_notes')->nullable()->after('requested_fulfillment_type');
        });
    }

    public function down(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->dropColumn([
                'fulfillment_request_status',
                'requested_fulfillment_type',
                'fulfillment_request_notes',
            ]);
        });
    }
};
