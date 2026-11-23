<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تشغيل الميجريشن: إنشاء جداول التفاعل (اللايكات والمحفوظات)
     */
    public function up(): void
    {
        // 1. إضافة عمود saves_count لجدول الريلز إذا لم يكن موجوداً
        if (Schema::hasTable('reels') && !Schema::hasColumn('reels', 'saves_count')) {
            Schema::table('reels', function (Blueprint $table) {
                $table->unsignedBigInteger('saves_count')->default(0)->after('shares_count');
            });
        }

        // 2. جدول تسجيل لايكات المستخدمين على الفيديوهات
        Schema::create('reel_likes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('reel_id')->constrained('reels')->cascadeOnDelete();
            $table->timestamps();

            // قيد فريد يمنع تكرار اللايك للمستخدم الواحد على نفس الفيديو (Database-level Idempotency)
            $table->unique(['user_id', 'reel_id'], 'user_reel_like_unique');
            $table->index(['user_id', 'created_at']);
        });

        // 3. جدول المحفوظات والمفضلة للعميل (Saved Reels & Favorite Dishes)
        Schema::create('reel_saves', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('reel_id')->constrained('reels')->cascadeOnDelete();
            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->timestamps();

            // قيد فريد يمنع حفظ الفيديو مرتين في المفضلة
            $table->unique(['user_id', 'reel_id'], 'user_reel_save_unique');
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * التراجع عن الميجريشن
     */
    public function down(): void
    {
        Schema::dropIfExists('reel_saves');
        Schema::dropIfExists('reel_likes');

        if (Schema::hasTable('reels') && Schema::hasColumn('reels', 'saves_count')) {
            Schema::table('reels', function (Blueprint $table) {
                $table->dropColumn('saves_count');
            });
        }
    }
};
