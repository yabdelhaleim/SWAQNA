-- ============================================================================
-- منصة حواديت - سكريبت تهيئة قاعدة البيانات الأولي (Initial Production Schema)
-- ============================================================================

-- تفعيل الامتدادات الضرورية (UUIDs & PostGIS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- 1. جداول الهوية والمستخدمين والعناوين
-- ============================================================================
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'DELIVERY_CAPTAIN', 'MERCHANT_OWNER', 'ADMIN', 'SUPER_ADMIN');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL,
    region VARCHAR(100) NOT NULL,
    street VARCHAR(150) NOT NULL,
    building_no VARCHAR(20) NOT NULL,
    floor_no VARCHAR(20),
    apartment_no VARCHAR(20),
    landmark TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_addresses_geo ON user_addresses USING GIST(location);
CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);

-- ============================================================================
-- 2. جداول البائعين بمختلف الأنشطة (مطاعم - محلات - مطابخ منزلية)
-- ============================================================================
CREATE TYPE merchant_type_enum AS ENUM ('RESTAURANT', 'RETAIL_SHOP', 'HOME_KITCHEN');
CREATE TYPE delivery_fulfillment_type AS ENUM ('PLATFORM_DELIVERY', 'MERCHANT_DELIVERY');
CREATE TYPE merchant_status AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED');

CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) UNIQUE NOT NULL,
    merchant_type merchant_type_enum NOT NULL,
    logo_url TEXT,
    cover_image_url TEXT,
    phone_number VARCHAR(20) NOT NULL,
    status merchant_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    
    fulfillment_type delivery_fulfillment_type NOT NULL DEFAULT 'PLATFORM_DELIVERY',
    preparation_time_minutes INT NOT NULL DEFAULT 30,
    min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    address_text TEXT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    delivery_radius_km DECIMAL(6, 2) NOT NULL DEFAULT 10.0,
    
    avg_rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    total_reviews INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchants_geo ON merchants USING GIST(location);
CREATE INDEX idx_merchants_type_status ON merchants(merchant_type, status);
CREATE INDEX idx_merchants_ranking ON merchants(avg_rating DESC, total_reviews DESC);

CREATE TABLE merchant_business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================================
-- 3. جداول المنتجات والمخزون والإضافات
-- ============================================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    icon_url TEXT,
    target_merchant_type merchant_type_enum,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    
    track_inventory BOOLEAN NOT NULL DEFAULT FALSE,
    stock_quantity INT DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_merchant ON products(merchant_id);

CREATE TABLE modifier_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    min_selection INT NOT NULL DEFAULT 0,
    max_selection INT NOT NULL DEFAULT 1
);

CREATE TABLE product_modifier_groups (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    PRIMARY KEY(product_id, modifier_group_id)
);

CREATE TABLE modifier_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    extra_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (extra_price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE,
    color VARCHAR(50),
    size VARCHAR(50),
    price_override DECIMAL(10, 2),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================================
-- 4. منظومة الفيديوهات (Reels)
-- ============================================================================
CREATE TABLE reels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    title VARCHAR(200),
    caption TEXT,
    video_hls_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    duration_seconds INT NOT NULL,
    
    views_count INT NOT NULL DEFAULT 0,
    likes_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reels_merchant ON reels(merchant_id);
CREATE INDEX idx_reels_product ON reels(product_id);
CREATE INDEX idx_reels_engagement ON reels(created_at DESC, views_count DESC);

-- ============================================================================
-- 5. منظومة الطلبات ودورة الحياة
-- ============================================================================
CREATE TYPE order_status_enum AS ENUM (
    'PENDING',
    'PREPARING',
    'READY',
    'ASSIGNED_TO_DELIVERY',
    'PICKED_UP',
    'DELIVERED',
    'CANCELLED',
    'REJECTED'
);

CREATE TYPE payment_method_enum AS ENUM (
    'CASH_ON_DELIVERY',
    'ONLINE_CARD',
    'WALLET',
    'HYBRID_WALLET_CASH'
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    delivery_captain_id UUID REFERENCES users(id),
    
    delivery_address_id UUID REFERENCES user_addresses(id),
    fulfillment_type delivery_fulfillment_type NOT NULL,
    
    subtotal_amount DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    payment_method payment_method_enum NOT NULL,
    paid_from_wallet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    remaining_cash_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    
    status order_status_enum NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_orders_captain ON orders(delivery_captain_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    product_name_at_purchase VARCHAR(200) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price DECIMAL(10, 2) NOT NULL
);

CREATE TYPE actor_type_enum AS ENUM ('CUSTOMER', 'MERCHANT', 'DELIVERY_CAPTAIN', 'ADMIN', 'SYSTEM');

CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status order_status_enum,
    new_status order_status_enum NOT NULL,
    actor_id UUID REFERENCES users(id),
    actor_type actor_type_enum NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_history_order ON order_status_history(order_id);

-- ============================================================================
-- 6. المنظومة المالية والقيد المزدوج
-- ============================================================================
CREATE TYPE wallet_type_enum AS ENUM ('CUSTOMER', 'MERCHANT', 'DELIVERY_CAPTAIN', 'PLATFORM_REVENUE');

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    wallet_type wallet_type_enum NOT NULL,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    locked_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(5) NOT NULL DEFAULT 'EGP',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_wallet_owner CHECK (
        (user_id IS NOT NULL AND merchant_id IS NULL) OR
        (user_id IS NULL AND merchant_id IS NOT NULL) OR
        (wallet_type = 'PLATFORM_REVENUE')
    )
);

CREATE TYPE transaction_type_enum AS ENUM (
    'WALLET_TOPUP',
    'ORDER_PAYMENT',
    'ORDER_REFUND',
    'DELIVERY_PAYOUT',
    'MERCHANT_SETTLEMENT',
    'PLATFORM_COMMISSION',
    'ADMIN_CORRECTION'
);

CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id),
    transaction_type transaction_type_enum NOT NULL,
    description TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    amount DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_entries_wallet ON ledger_entries(wallet_id);

-- ============================================================================
-- 7. التقييمات وسجلات رقابة الأدمن
-- ============================================================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    reason TEXT NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_entity ON admin_audit_logs(entity_name, entity_id);
