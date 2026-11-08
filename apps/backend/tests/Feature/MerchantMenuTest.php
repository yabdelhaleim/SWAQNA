<?php

namespace Tests\Feature;

use App\Enums\DeliveryFulfillmentType;
use App\Enums\MerchantStatus;
use App\Enums\MerchantType;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Merchant;
use App\Models\ModifierGroup;
use App\Models\ModifierItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MerchantMenuTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Merchant $merchant;
    protected Category $category;
    protected ModifierGroup $modifierGroup;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'phone_number' => '01099998888',
            'full_name' => 'الشيف أم أحمد',
            'role' => UserRole::MERCHANT_OWNER,
            'is_active' => true,
            'is_phone_verified' => true,
        ]);

        $this->merchant = Merchant::create([
            'owner_id' => $this->user->id,
            'name' => 'مطبخ أم أحمد للأكل البيتي',
            'slug' => 'om-ahmed-kitchen',
            'merchant_type' => MerchantType::HOME_KITCHEN,
            'phone_number' => '01099998888',
            'status' => MerchantStatus::ACTIVE,
            'fulfillment_type' => DeliveryFulfillmentType::MERCHANT_DELIVERY,
            'preparation_time_minutes' => 120,
            'address_text' => 'المعادي - شارع النصر',
        ]);

        $this->category = Category::create([
            'name' => 'محاشي',
            'icon_url' => '🥬',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->modifierGroup = ModifierGroup::create([
            'merchant_id' => $this->merchant->id,
            'name' => 'نوع الأرز',
            'is_required' => false,
            'min_selection' => 0,
            'max_selection' => 2,
        ]);

        ModifierItem::create([
            'group_id' => $this->modifierGroup->id,
            'name' => 'أرز أبيض بلدي',
            'additional_price' => 0.00,
            'is_available' => true,
        ]);

        ModifierItem::create([
            'group_id' => $this->modifierGroup->id,
            'name' => 'أرز بسمتي',
            'additional_price' => 20.00,
            'is_available' => true,
        ]);
    }

    public function test_can_retrieve_menu_with_eager_loading(): void
    {
        Sanctum::actingAs($this->user, ['merchant:access']);

        $response = $this->getJson('/api/v1/merchant/menu');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'categories',
                'products',
                'available_modifier_groups',
            ]);
    }

    public function test_can_create_new_dish_with_variants_and_modifiers(): void
    {
        Sanctum::actingAs($this->user, ['merchant:access']);

        $payload = [
            'name' => 'محشي مشكل بيتي بالسمنة البلدي',
            'description' => 'محشي كوسة وباذنجان وفلفل وورق عنب بالسمنة الفلاحي',
            'base_price' => 180.00,
            'category_id' => $this->category->id,
            'prep_time_minutes' => 90,
            'servings_count' => '3-4 أفراد',
            'requires_preorder' => true,
            'is_available' => true,
            'variants' => [
                ['name' => 'وسط', 'price' => 180.00],
                ['name' => 'عائلي', 'price' => 250.00],
            ],
            'modifier_group_ids' => [$this->modifierGroup->id],
        ];

        $response = $this->postJson('/api/v1/merchant/menu/products', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('product.name', 'محشي مشكل بيتي بالسمنة البلدي')
            ->assertJsonCount(2, 'product.variants')
            ->assertJsonCount(1, 'product.modifier_groups');

        $this->assertDatabaseHas('products', [
            'merchant_id' => $this->merchant->id,
            'name' => 'محشي مشكل بيتي بالسمنة البلدي',
            'base_price' => 180.00,
            'requires_preorder' => true,
        ]);

        $this->assertDatabaseHas('product_variants', [
            'name' => 'عائلي',
            'price' => 250.00,
        ]);
    }

    public function test_can_toggle_dish_availability(): void
    {
        Sanctum::actingAs($this->user, ['merchant:access']);

        $product = Product::create([
            'merchant_id' => $this->merchant->id,
            'category_id' => $this->category->id,
            'name' => 'طاجن بامية باللحمة الضاني',
            'base_price' => 220.00,
            'is_available' => true,
        ]);

        $response = $this->patchJson("/api/v1/merchant/menu/products/{$product->id}/toggle-availability");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('is_available', false);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_available' => false,
        ]);
    }

    public function test_can_update_dish(): void
    {
        Sanctum::actingAs($this->user, ['merchant:access']);

        $product = Product::create([
            'merchant_id' => $this->merchant->id,
            'category_id' => $this->category->id,
            'name' => 'طاجن بامية',
            'base_price' => 200.00,
            'is_available' => true,
        ]);

        $payload = [
            'name' => 'طاجن بامية بلدي باللحمة الضاني الفاخرة',
            'base_price' => 220.00,
            'category_id' => $this->category->id,
            'prep_time_minutes' => 60,
        ];

        $response = $this->putJson("/api/v1/merchant/menu/products/{$product->id}", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('product.name', 'طاجن بامية بلدي باللحمة الضاني الفاخرة');

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'طاجن بامية بلدي باللحمة الضاني الفاخرة',
            'base_price' => 220.00,
        ]);
    }

    public function test_can_delete_dish(): void
    {
        Sanctum::actingAs($this->user, ['merchant:access']);

        $product = Product::create([
            'merchant_id' => $this->merchant->id,
            'category_id' => $this->category->id,
            'name' => 'طبق للتجربة',
            'base_price' => 50.00,
        ]);

        $response = $this->deleteJson("/api/v1/merchant/menu/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('products', [
            'id' => $product->id,
        ]);
    }
}
