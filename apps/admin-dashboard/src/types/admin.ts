// src/types/admin.ts

export type AdminRole = 'SUPER_ADMIN' | 'OPERATIONS' | 'SUPPORT';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar_url?: string;
}

export type MerchantStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export interface AdminMerchant {
  id: string;
  name: string;
  store_name: string;
  owner_name: string;
  phone: string;
  status: MerchantStatus;
  merchant_type: string;
  fulfillment_type: string;
  avg_rating: number;
  total_orders: number;
  total_revenue: number;
  wallet_balance: number;
  commission_rate: number; // e.g. 10%
  created_at: string;
  logo_url?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export interface AdminOrder {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  store_id: string;
  store_name: string;
  status: OrderStatus;
  delivery_address: string;
  total_amount: number;
  platform_commission: number;
  delivery_pin: string;
  captain_id?: string;
  captain_name?: string;
  items_summary: string;
  items_count: number;
  created_at: string;
}

export type CaptainStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface DeliveryCaptain {
  id: string;
  name: string;
  phone: string;
  vehicle_type: 'MOTORCYCLE' | 'BICYCLE' | 'CAR';
  status: CaptainStatus;
  active_order_code?: string;
  active_order_id?: string;
  completed_today: number;
  total_earnings_today: number;
  rating: number;
  current_zone: string;
}

export interface WithdrawalRequest {
  id: string;
  merchant_id: string;
  merchant_name: string;
  amount: number;
  payout_method: 'VODAFONE_CASH' | 'INSTAPAY' | 'BANK_TRANSFER';
  account_details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export interface ModeratedReel {
  id: string;
  store_name: string;
  product_name: string;
  video_url: string;
  thumbnail_url: string;
  views_count: number;
  likes_count: number;
  reports_count: number;
  is_active: boolean;
  created_at: string;
}

export interface PlatformCoupon {
  id: string;
  code: string;
  discount_percentage: number;
  max_discount_amount: number;
  min_order_amount: number;
  usage_count: number;
  max_usage_limit: number;
  is_active: boolean;
  expires_at: string;
}

export interface PlatformMetrics {
  total_sales: number;
  platform_revenue: number;
  active_merchants_count: number;
  total_orders_today: number;
  pending_orders_count: number;
  active_captains_count: number;
  pending_withdrawals_amount: number;
}
