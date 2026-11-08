<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. جدول التصنيفات والأقسام (Categories & Menu Sections)
        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('merchant_id')->nullable()->constrained('merchants')->onDelete('cascade');
            $table->string('name', 100);
            $table->text('icon_url')->nullable();
            $table->string('target_merchant_type', 50)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['merchant_id', 'is_active', 'sort_order']);
        });

        // 2. جدول المنتجات والأطباق (Products & Dishes)
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('merchant_id')->constrained('merchants')->onDelete('cascade');
            $table->foreignUuid('category_id')->nullable()->constrained('categories')->onDelete('set null');
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->decimal('base_price', 10, 2);
            $table->text('image_url')->nullable();
            $table->boolean('is_available')->default(true);
            
            // خصائص الأكل البيتي والمطاعم
            $table->integer('prep_time_minutes')->default(30);
            $table->string('servings_count', 50)->nullable(); // مثال: "3-4 أفراد"
            $table->boolean('requires_preorder')->default(false); // هل يحتاج حجز مسبق؟
            
            $table->boolean('track_inventory')->default(false);
            $table->integer('stock_quantity')->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['merchant_id', 'is_available', 'sort_order']);
        });

        // 3. جدول أحجام وخيارات المنتج (Product Variants / Sizes)
        Schema::create('product_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->onDelete('cascade');
            $table->string('name', 100); // مثال: "وسط", "عائلي", "صغير"
            $table->decimal('price', 10, 2);
            $table->string('sku', 100)->nullable();
            $table->integer('stock_quantity')->default(0);
            $table->boolean('is_available')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['product_id', 'is_available']);
        });

        // 4. جدول مجموعات الإضافات (Modifier Groups)
        Schema::create('modifier_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('merchant_id')->constrained('merchants')->onDelete('cascade');
            $table->string('name', 100); // مثال: "نوع الأرز", "الصوصات والسلطات"
            $table->boolean('is_required')->default(false);
            $table->integer('min_selection')->default(0);
            $table->integer('max_selection')->default(1);
            $table->timestamps();

            $table->index(['merchant_id']);
        });

        // 5. جدول عناصر الإضافات (Modifier Items)
        Schema::create('modifier_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('group_id')->constrained('modifier_groups')->onDelete('cascade');
            $table->string('name', 100); // مثال: "أرز أبيض", "سلطة طحينة"
            $table->decimal('additional_price', 10, 2)->default(0.00);
            $table->boolean('is_available')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['group_id', 'is_available']);
        });

        // 6. جدول ربط الإضافات بالأطباق (Product Modifier Groups Pivot)
        Schema::create('product_modifier_groups', function (Blueprint $table) {
            $table->foreignUuid('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignUuid('modifier_group_id')->constrained('modifier_groups')->onDelete('cascade');
            $table->timestamps();

            $table->primary(['product_id', 'modifier_group_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_modifier_groups');
        Schema::dropIfExists('modifier_items');
        Schema::dropIfExists('modifier_groups');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
    }
};
