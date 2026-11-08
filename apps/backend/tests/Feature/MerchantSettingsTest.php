<?php

namespace Tests\Feature;

use App\Enums\DeliveryFulfillmentType;
use App\Enums\FulfillmentRequestStatus;
use App\Enums\MerchantStatus;
use App\Enums\MerchantType;
use App\Enums\UserRole;
use App\Enums\WalletType;
use App\Models\Merchant;
use App\Models\MerchantBusinessHour;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MerchantSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Merchant $merchant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'phone_number' => '01011112222',
            'full_name' => 'الشيف فاطمة',
            'role' => UserRole::MERCHANT_OWNER,
            'is_active' => true,
            'is_phone_verified' => true,
        ]);

        $this->merchant = Merchant::create([
            'owner_id' => $this->user->id,
            'name' => 'مطبخ فاطمة البيتي',
            'slug' => 'fatma-kitchen',
            'merchant_type' => MerchantType::HOME_KITCHEN,
            'phone_number' => '01011112222',
            'status' => MerchantStatus::ACTIVE,
            'fulfillment_type' => DeliveryFulfillmentType::MERCHANT_DELIVERY,
            'fulfillment_request_status' => FulfillmentRequestStatus::NONE,
            'preparation_time_minutes' => 120,
            'min_order_amount' => 50.00,
            'delivery_radius_km' => 8.00,
            'address_text' => 'المعادي - شارع 9 - القاهرة',
        ]);

        Wallet::create([
            'merchant_id' => $this->merchant->id,
            'wallet_type' => WalletType::MERCHANT,
            'balance' => 350.00,
            'locked_amount' => 0.00,
            'currency' => 'EGP',
        ]);

        for ($day = 0; $day <= 6; $day++) {
            MerchantBusinessHour::create([
                'merchant_id' => $this->merchant->id,
                'day_of_week' => $day,
                'open_time' => '10:00:00',
                'close_time' => '23:00:00',
                'is_closed' => false,
            ]);
        }
    }

    public function test_can_retrieve_merchant_settings_with_eager_loading(): void
    {
        Sanctum::actingAs($this->user, ['merchant:access']);

        $response = $this->getJson('/api/v1/merchant/settings');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'مطبخ فاطمة البيتي')
            ->assertJsonPath('data.fulfillment_type', 'MERCHANT_DELIVERY')
            ->assertJsonPath('data.preparation_time_minutes', 120)
            ->assertJsonPath('data.wallet.balance', fn($val) => (float)$val === 350.0)
            ->assertJsonCount(7, 'data.business_hours');
    }

    public function test_can_update_merchant_profile_and_preparation_time(): void
    {
        Sanctum::actingAs($this->user, ['merchant:access']);

        $payload = [
            'name' => 'مطبخ فاطمة للأكلات المصرية الأصيلة',
            'address_text' => 'المعادي دجلة - القاهرة',
            'preparation_time_minutes' => 150, // وقت طهي كافي للأكل البيتي
            'min_order_amount' => 100.00,
            'delivery_radius_km' => 12.00,
        ];

        $response = $this->putJson('/api/v1/merchant/settings/profile', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.preparation_time_minutes', 150);

        $this->assertDatabaseHas('merchants', [
            'id' => $this->merchant->id,
            'name' => 'مطبخ فاطمة للأكلات المصرية الأصيلة',
            'preparation_time_minutes' => 150,
            'min_order_amount' => 100.00,
        ]);
    }

    public function test_can_update_weekly_business_hours(): void
    {
        Sanctum::actingAs($this->user, ['merchant:access']);

        $hours = [];
        for ($day = 0; $day <= 6; $day++) {
            $hours[] = [
                'day_of_week' => $day,
                'open_time' => '11:00',
                'close_time' => '22:00',
                'is_closed' => ($day === 5), // الجمعة مغلق مثلاً
            ];
        }

        $response = $this->putJson('/api/v1/merchant/settings/business-hours', ['hours' => $hours]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(7, 'business_hours');

        $this->assertDatabaseHas('merchant_business_hours', [
            'merchant_id' => $this->merchant->id,
            'day_of_week' => 5,
            'is_closed' => true,
        ]);
    }

    public function test_can_submit_request_for_platform_delivery(): void
    {
        Sanctum::actingAs($this->user, ['merchant:access']);

        $payload = [
            'requested_fulfillment_type' => 'PLATFORM_DELIVERY',
            'notes' => 'نحتاج كباتن المنصة لتوصيل الطلبات في نطاق المعادي والتجمع.',
        ];

        $response = $this->postJson('/api/v1/merchant/settings/fulfillment-request', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'PENDING_APPROVAL');

        $this->assertDatabaseHas('merchants', [
            'id' => $this->merchant->id,
            'fulfillment_request_status' => 'PENDING_APPROVAL',
            'requested_fulfillment_type' => 'PLATFORM_DELIVERY',
        ]);
    }

    public function test_cannot_submit_duplicate_fulfillment_request(): void
    {
        Sanctum::actingAs($this->user, ['merchant:access']);

        $this->merchant->update([
            'fulfillment_request_status' => FulfillmentRequestStatus::PENDING_APPROVAL,
            'requested_fulfillment_type' => 'PLATFORM_DELIVERY',
        ]);

        $payload = [
            'requested_fulfillment_type' => 'PLATFORM_DELIVERY',
            'notes' => 'طلب إضافي',
        ];

        $response = $this->postJson('/api/v1/merchant/settings/fulfillment-request', $payload);

        $response->assertStatus(409)
            ->assertJsonPath('success', false);
    }
}
