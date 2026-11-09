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
        Schema::create('reels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();

            // بيانات الفيديو الأساسية
            $table->string('title', 150);
            $table->text('caption')->nullable();
            $table->text('video_url');
            $table->text('video_hls_url')->nullable();
            $table->text('thumbnail_url')->nullable();
            $table->integer('duration_seconds')->default(15);

            // عدادات التفاعل
            $table->unsignedBigInteger('views_count')->default(0);
            $table->unsignedBigInteger('likes_count')->default(0);
            $table->unsignedBigInteger('shares_count')->default(0);

            // الحالة والتواريخ
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // فهارس السرعة للـ Cursor Pagination
            $table->index(['merchant_id', 'is_active', 'created_at']);
            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reels');
    }
};
