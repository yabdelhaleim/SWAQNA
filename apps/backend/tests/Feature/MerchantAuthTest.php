<?php

namespace Tests\Feature;

use App\Enums\MerchantType;
use App\Enums\UserRole;
use App\Models\Merchant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class MerchantAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_rejects_invalid_phone_number(): void
    {
        $response = $this->postJson('/api/v1/merchant/auth/send-otp', [
            'phone_number' => '12345',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone_number']);
    }

    public function test_can_send_otp_to_valid_egyptian_phone(): void
    {
        $response = $this->postJson('/api/v1/merchant/auth/send-otp', [
            'phone_number' => '01012345678',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'expires_in_seconds' => 150,
                'resend_in_seconds' => 60,
            ])
            ->assertJsonStructure(['debug_code']);
    }

    public function test_cannot_resend_otp_within_60_seconds(): void
    {
        // الطلب الأول
        $this->postJson('/api/v1/merchant/auth/send-otp', [
            'phone_number' => '01112345678',
        ])->assertStatus(200);

        // الطلب الثاني فوراً (يجب أن يُرفض لحماية الرسائل)
        $response = $this->postJson('/api/v1/merchant/auth/send-otp', [
            'phone_number' => '01112345678',
        ]);

        $response->assertStatus(429)
            ->assertJson(['success' => false]);
    }

    public function test_can_verify_otp_and_login_new_merchant(): void
    {
        // 1. إرسال الكود
        $sendResponse = $this->postJson('/api/v1/merchant/auth/send-otp', [
            'phone_number' => '01212345678',
        ]);
        $code = $sendResponse->json('debug_code');

        // 2. التحقق من الكود
        $verifyResponse = $this->postJson('/api/v1/merchant/auth/verify-otp', [
            'phone_number' => '01212345678',
            'code' => $code,
        ]);

        $verifyResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'is_new_merchant' => true,
            ])
            ->assertJsonStructure(['token', 'user']);

        $this->assertDatabaseHas('users', [
            'phone_number' => '01212345678',
            'role' => UserRole::MERCHANT_OWNER->value,
            'is_phone_verified' => true,
        ]);
    }

    public function test_can_register_store_for_authenticated_merchant(): void
    {
        $user = User::create([
            'full_name' => 'تاجر جديد',
            'phone_number' => '01512345678',
            'role' => UserRole::MERCHANT_OWNER,
            'is_active' => true,
            'is_phone_verified' => true,
        ]);

        $token = $user->createToken('test-token', ['merchant:access'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/merchant/auth/register-store', [
                'store_name' => 'مطعم كشري البرنس',
                'merchant_type' => MerchantType::RESTAURANT->value,
                'address_text' => 'شارع الجمهورية، المنصورة',
                'latitude' => 31.0409,
                'longitude' => 31.3785,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'merchant' => [
                    'name' => 'مطعم كشري البرنس',
                    'merchant_type' => MerchantType::RESTAURANT->value,
                ],
            ]);

        $this->assertDatabaseHas('merchants', [
            'name' => 'مطعم كشري البرنس',
            'owner_id' => $user->id,
        ]);

        $this->assertDatabaseHas('wallets', [
            'merchant_id' => $response->json('merchant.id'),
        ]);
    }
}
