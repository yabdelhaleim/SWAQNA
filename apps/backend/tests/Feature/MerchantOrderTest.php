<?php

namespace Tests\Feature;

use App\Enums\DeliveryFulfillmentType;
use App\Enums\MerchantStatus;
use App\Enums\MerchantType;
use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Merchant;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MerchantOrderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Merchant $merchant;

    protected function setUp(): void
    {
        parent::setUp();

        // إنشاء تاجر معتمد
        $this->user = User::create([
            'phone_number'      => '01099999999',
            'full_name'         => 'تاجر تجريبي',
            'role'              => UserRole::MERCHANT_OWNER,
            'is_active'         => true,
            'is_phone_verified' => true,
        ]);

        $this->merchant = Merchant::create([
            'owner_id'                 => $this->user->id,
            'name'                     => 'مطبخ أم علي',
            'slug'                     => 'om-ali-kitchen',
            'merchant_type'            => MerchantType::HOME_KITCHEN,
            'phone_number'             => '01099999999',
            'status'                   => MerchantStatus::ACTIVE,
            'fulfillment_type'         => DeliveryFulfillmentType::MERCHANT_DELIVERY,
            'preparation_time_minutes' => 45,
            'address_text'             => 'المعادي - القاهرة',
        ]);

        Sanctum::actingAs($this->user);
    }

    /** @test */
    public function test_can_list_orders_with_eager_loading(): void
    {
        // إنشاء 3 طلبات للتاجر
        $this->createTestOrder('01011111111', OrderStatus::PENDING);
        $this->createTestOrder('01022222222', OrderStatus::PREPARING);
        $this->createTestOrder('01033333333', OrderStatus::READY);

        $response = $this->getJson('/api/v1/merchant/orders');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [['id', 'status', 'customer_name', 'total_amount', 'items']],
                    'total',
                    'per_page',
                ],
            ])
            ->assertJsonPath('data.total', 3);
    }

    /** @test */
    public function test_can_filter_orders_by_status(): void
    {
        $this->createTestOrder('01011111111', OrderStatus::PENDING);
        $this->createTestOrder('01022222222', OrderStatus::PREPARING);
        $this->createTestOrder('01033333333', OrderStatus::PENDING);

        $response = $this->getJson('/api/v1/merchant/orders?status=PENDING');

        $response->assertOk()
            ->assertJsonPath('data.total', 2);
    }

    /** @test */
    public function test_can_accept_pending_order(): void
    {
        $order = $this->createTestOrder('01011111111', OrderStatus::PENDING);

        $response = $this->postJson("/api/v1/merchant/orders/{$order->id}/accept", [
            'prep_time_minutes' => 45,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('order.status', OrderStatus::PREPARING->value);

        $this->assertDatabaseHas('orders', [
            'id'     => $order->id,
            'status' => OrderStatus::PREPARING,
        ]);

        $this->assertNotNull($order->fresh()->accepted_at);
    }

    /** @test */
    public function test_cannot_accept_already_preparing_order(): void
    {
        $order = $this->createTestOrder('01011111111', OrderStatus::PREPARING);

        $response = $this->postJson("/api/v1/merchant/orders/{$order->id}/accept", []);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    /** @test */
    public function test_can_reject_pending_order_with_reason(): void
    {
        $order = $this->createTestOrder('01011111111', OrderStatus::PENDING);

        $response = $this->postJson("/api/v1/merchant/orders/{$order->id}/reject", [
            'rejection_reason' => 'المطبخ مغلق حالياً بسبب الظروف',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('order.status', OrderStatus::REJECTED->value);

        $this->assertDatabaseHas('orders', [
            'id'               => $order->id,
            'status'           => OrderStatus::REJECTED,
            'rejection_reason' => 'المطبخ مغلق حالياً بسبب الظروف',
        ]);

        $this->assertNotNull($order->fresh()->cancelled_at);
    }

    /** @test */
    public function test_reject_requires_reason_min_5_chars(): void
    {
        $order = $this->createTestOrder('01011111111', OrderStatus::PENDING);

        $response = $this->postJson("/api/v1/merchant/orders/{$order->id}/reject", [
            'rejection_reason' => 'لا',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['rejection_reason']);
    }

    /** @test */
    public function test_can_mark_preparing_order_as_ready(): void
    {
        $order = $this->createTestOrder('01011111111', OrderStatus::PREPARING);

        $response = $this->patchJson("/api/v1/merchant/orders/{$order->id}/ready");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('order.status', OrderStatus::READY->value);

        $this->assertDatabaseHas('orders', [
            'id'     => $order->id,
            'status' => OrderStatus::READY,
        ]);

        $this->assertNotNull($order->fresh()->ready_at);
    }

    /** @test */
    public function test_can_get_order_stats(): void
    {
        $this->createTestOrder('01011111111', OrderStatus::PENDING);
        $this->createTestOrder('01022222222', OrderStatus::PENDING);
        $this->createTestOrder('01033333333', OrderStatus::PREPARING);
        $this->createTestOrder('01044444444', OrderStatus::READY);

        $response = $this->getJson('/api/v1/merchant/orders/stats');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'stats' => ['pending', 'preparing', 'ready', 'today_sales', 'active_total'],
            ])
            ->assertJsonPath('stats.pending', 2)
            ->assertJsonPath('stats.preparing', 1)
            ->assertJsonPath('stats.ready', 1)
            ->assertJsonPath('stats.active_total', 4);
    }

    /** @test */
    public function test_can_create_test_order(): void
    {
        $response = $this->postJson('/api/v1/merchant/orders/create-test-order');

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['order' => ['id', 'status', 'customer_name']]);
    }

    // =========================================================================
    // Helper: إنشاء طلب تجريبي مباشرة في قاعدة البيانات
    // =========================================================================
    private function createTestOrder(string $phone, OrderStatus $status): Order
    {
        $order = Order::create([
            'id'                => Str::uuid(),
            'order_code'        => 'ORD-' . strtoupper(Str::random(6)),
            'merchant_id'       => $this->merchant->id,
            'status'            => $status,
            'payment_method'    => 'CASH_ON_DELIVERY',
            'fulfillment_type'  => 'MERCHANT_DELIVERY',
            'customer_name'     => 'عميل تجريبي',
            'customer_phone'    => $phone,
            'delivery_address'  => 'شارع التحرير، القاهرة',
            'subtotal_amount'   => 85.00,
            'delivery_fee'      => 15.00,
            'total_amount'      => 100.00,
            'prep_time_minutes' => 30,
            'accepted_at'       => in_array($status, [OrderStatus::PREPARING, OrderStatus::READY]) ? now() : null,
            'ready_at'          => $status === OrderStatus::READY ? now() : null,
        ]);

        OrderItem::create([
            'id'                       => Str::uuid(),
            'order_id'                 => $order->id,
            'product_name_at_purchase' => 'كشري مصري',
            'unit_price'               => 42.50,
            'quantity'                 => 2,
            'total_price'              => 85.00,
        ]);

        return $order;
    }
}
