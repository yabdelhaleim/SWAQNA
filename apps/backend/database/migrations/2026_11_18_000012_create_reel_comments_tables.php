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
        // 1. إضافة عمود comments_count لجدول الريلز إذا لم يكن موجوداً
        if (Schema::hasTable('reels') && !Schema::hasColumn('reels', 'comments_count')) {
            Schema::table('reels', function (Blueprint $table) {
                $table->unsignedBigInteger('comments_count')->default(0)->after('shares_count');
            });
        }

        // 2. جدول تعليقات الريلز
        Schema::create('reel_comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('reel_id')->constrained('reels')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('parent_id')->nullable()->constrained('reel_comments')->nullOnDelete();
            $table->text('comment');
            $table->unsignedInteger('likes_count')->default(0);
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();

            $table->index(['reel_id', 'created_at']);
            $table->index('user_id');
        });

        // 3. جدول لايكات التعليقات
        Schema::create('reel_comment_likes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('comment_id')->constrained('reel_comments')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['comment_id', 'user_id'], 'comment_user_like_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reel_comment_likes');
        Schema::dropIfExists('reel_comments');

        if (Schema::hasTable('reels') && Schema::hasColumn('reels', 'comments_count')) {
            Schema::table('reels', function (Blueprint $table) {
                $table->dropColumn('comments_count');
            });
        }
    }
};
