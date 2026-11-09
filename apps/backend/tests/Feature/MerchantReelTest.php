<?php

namespace Tests\Feature;

use App\Enums\DeliveryFulfillmentType;
use App\Enums\MerchantStatus;
use App\Enums\MerchantType;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\Reel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MerchantReelTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Merchant $merchant;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        // إنشاء تاجر معتمد
        $this->user = User::create([
            'phone_number'      => '01099998888',
            'full_name'         => 'الشيف أم أحمد',
            'role'              => UserRole::MERCHANT_OWNER,
            'is_active'         => true,
            'is_phone_verified' => true,
        ]);

        $this->merchant = Merchant::create([
            'owner_id'                 => $this->user->id,
            'name'                     => 'مطبخ أم أحمد للأكل البيتي',
            'slug'                     => 'om-ahmed-kitchen',
            'merchant_type'            => MerchantType::HOME_KITCHEN,
            'phone_number'             => '01099998888',
            'status'                   => MerchantStatus::ACTIVE,
            'fulfillment_type'         => DeliveryFulfillmentType::MERCHANT_DELIVERY,
            'preparation_time_minutes' => 60,
            'address_text'             => 'المعادي - القاهرة',
        ]);

        $category = Category::create([
            'name'        => 'طواجن',
            'sort_order'  => 1,
            'is_active'   => true,
        ]);

        $this->product = Product::create([
            'merchant_id'       => $this->merchant->id,
            'category_id'       => $category->id,
            'name'              => 'طاجن بامية باللحمة الضاني',
            'description'       => 'طاجن بامية بلدي طازج',
            'base_price'        => 220.00,
            'is_available'      => true,
            'prep_time_minutes' => 60,
        ]);

        Sanctum::actingAs($this->user);
    }

    /** @test */
    public function test_can_list_reels_with_cursor_pagination_and_eager_loading(): void
    {
        // إنشاء 3 فيديوهات للتاجر بأوقات زمنية متتالية
        for ($i = 1; $i <= 3; $i++) {
            Reel::create([
                'id'               => Str::uuid(),
                'merchant_id'      => $this->merchant->id,
                'product_id'       => $this->product->id,
                'title'            => "فيديو تجريبي رقم {$i}",
                'video_url'        => "https://hawadeet.test/storage/reels/video{$i}.mp4",
                'duration_seconds' => 30,
                'is_active'        => true,
                'created_at'       => now()->subMinutes(10 - $i),
            ]);
        }

        // طلب أول صفحة مع cursor بحد أقصى 2 فيديو
        $response = $this->getJson('/api/v1/merchant/reels?per_page=2');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'title', 'video_url', 'product'],
                ],
                'cursor' => ['has_more', 'next_cursor', 'prev_cursor', 'per_page'],
            ])
            ->assertJsonPath('cursor.has_more', true)
            ->assertJsonCount(2, 'data');

        // جلب الصفحة التالية بواسطة الـ Next Cursor
        $nextCursor = $response->json('cursor.next_cursor');
        $this->assertNotNull($nextCursor);

        $nextPageResponse = $this->getJson("/api/v1/merchant/reels?per_page=2&cursor={$nextCursor}");
        $nextPageResponse->assertOk()
            ->assertJsonCount(1, 'data');
    }

    /** @test */
    public function test_can_upload_and_create_reel_linked_to_product(): void
    {
        $videoFile = UploadedFile::fake()->create('reel_video.mp4', 1024, 'video/mp4');
        $thumbFile = UploadedFile::fake()->image('thumbnail.jpg', 600, 800);

        $response = $this->postJson('/api/v1/merchant/reels', [
            'title'            => 'سر طاجن البامية البلدي المسبك',
            'caption'          => 'شوفوا اللحمة دايبة إزاي! #أكل_بيتي #حواديت',
            'product_id'       => $this->product->id,
            'duration_seconds' => 45,
            'video'            => $videoFile,
            'thumbnail'        => $thumbFile,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('reel.title', 'سر طاجن البامية البلدي المسبك')
            ->assertJsonPath('reel.product_id', $this->product->id);

        $this->assertDatabaseHas('reels', [
            'merchant_id' => $this->merchant->id,
            'product_id'  => $this->product->id,
            'title'       => 'سر طاجن البامية البلدي المسبك',
        ]);
    }

    /** @test */
    public function test_can_create_reel_with_video_url(): void
    {
        $response = $this->postJson('/api/v1/merchant/reels', [
            'title'            => 'ريلز الكشري المصري المخصوص',
            'caption'          => 'صلصة ودقة وشطة حارة',
            'product_id'       => $this->product->id,
            'video_url'        => 'https://assets.hawadeet.test/reels/koshary.mp4',
            'duration_seconds' => 20,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('reel.video_url', 'https://assets.hawadeet.test/reels/koshary.mp4');

        $this->assertDatabaseHas('reels', [
            'merchant_id' => $this->merchant->id,
            'title'       => 'ريلز الكشري المصري المخصوص',
        ]);
    }

    /** @test */
    public function test_validates_required_fields_and_formats(): void
    {
        // محاولة رفع ملف نصي بدلاً من فيديو
        $invalidFile = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');

        $response = $this->postJson('/api/v1/merchant/reels', [
            'title' => 'ف', // أقل من 3 أحرف
            'video' => $invalidFile,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'video']);
    }

    /** @test */
    public function test_can_toggle_reel_active_status(): void
    {
        $reel = Reel::create([
            'id'          => Str::uuid(),
            'merchant_id' => $this->merchant->id,
            'product_id'  => $this->product->id,
            'title'       => 'فيديو قيد الاختبار',
            'video_url'   => 'https://hawadeet.test/video.mp4',
            'is_active'   => true,
        ]);

        $response = $this->patchJson("/api/v1/merchant/reels/{$reel->id}/toggle-status");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('is_active', false);

        $this->assertFalse($reel->fresh()->is_active);
    }

    /** @test */
    public function test_can_delete_reel(): void
    {
        $reel = Reel::create([
            'id'          => Str::uuid(),
            'merchant_id' => $this->merchant->id,
            'product_id'  => $this->product->id,
            'title'       => 'فيديو للحذف',
            'video_url'   => 'https://hawadeet.test/video.mp4',
            'is_active'   => true,
        ]);

        $response = $this->deleteJson("/api/v1/merchant/reels/{$reel->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('reels', ['id' => $reel->id]);
    }
}
