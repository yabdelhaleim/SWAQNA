// src/lib/api.ts
import {
  CaptainStatus,
  DeliveryCaptain,
  OrderStatus,
  PlatformCoupon,
} from "../types/admin";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_BASE_URL}/admin${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({
    success: false,
    message: "حدث خطأ غير متوقع في الاتصال بالسيرفر",
  }));

  if (!res.ok && data.success === undefined) {
    return { success: false, message: data.message || "خطأ في الخادم" } as T;
  }

  return data;
}

export const adminApi = {
  login(email: string, password: string) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  logout(token: string) {
    return request("/auth/logout", { method: "POST" }, token);
  },

  getMetrics(token: string) {
    return request("/metrics", { method: "GET" }, token);
  },

  getMerchants(token: string) {
    return request("/merchants", { method: "GET" }, token);
  },

  approveMerchant(token: string, id: string) {
    return request(`/merchants/${id}/approve`, { method: "POST" }, token);
  },

  suspendMerchant(token: string, id: string) {
    return request(`/merchants/${id}/suspend`, { method: "POST" }, token);
  },

  updateCommission(token: string, id: string, commission_rate: number) {
    return request(
      `/merchants/${id}/commission`,
      { method: "PATCH", body: JSON.stringify({ commission_rate }) },
      token
    );
  },

  getOrders(token: string) {
    return request("/orders", { method: "GET" }, token);
  },

  assignCaptain(token: string, orderId: string, captain_id: string) {
    return request(
      `/orders/${orderId}/assign-captain`,
      { method: "POST", body: JSON.stringify({ captain_id }) },
      token
    );
  },

  confirmDelivery(token: string, orderId: string, delivery_pin: string) {
    return request(
      `/orders/${orderId}/confirm-delivery`,
      { method: "POST", body: JSON.stringify({ delivery_pin }) },
      token
    );
  },

  updateOrderStatus(token: string, orderId: string, status: OrderStatus) {
    return request(
      `/orders/${orderId}/status`,
      { method: "PATCH", body: JSON.stringify({ status: status.toUpperCase() }) },
      token
    );
  },

  getCaptains(token: string) {
    return request("/captains", { method: "GET" }, token);
  },

  createCaptain(token: string, data: Omit<DeliveryCaptain, "id">) {
    return request(
      "/captains",
      {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          vehicle_type: data.vehicle_type,
          current_zone: data.current_zone,
        }),
      },
      token
    );
  },

  updateCaptainStatus(token: string, captainId: string, status: CaptainStatus) {
    return request(
      `/captains/${captainId}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      token
    );
  },

  getWithdrawals(token: string) {
    return request("/withdrawals", { method: "GET" }, token);
  },

  approveWithdrawal(token: string, id: string) {
    return request(`/withdrawals/${id}/approve`, { method: "POST" }, token);
  },

  rejectWithdrawal(token: string, id: string) {
    return request(`/withdrawals/${id}/reject`, { method: "POST" }, token);
  },

  getReels(token: string) {
    return request("/reels", { method: "GET" }, token);
  },

  toggleReel(token: string, id: string) {
    return request(`/reels/${id}/toggle`, { method: "PATCH" }, token);
  },

  deleteReel(token: string, id: string) {
    return request(`/reels/${id}`, { method: "DELETE" }, token);
  },

  getCoupons(token: string) {
    return request("/coupons", { method: "GET" }, token);
  },

  createCoupon(token: string, data: Omit<PlatformCoupon, "id" | "usage_count">) {
    return request(
      "/coupons",
      {
        method: "POST",
        body: JSON.stringify({
          code: data.code,
          discount_type: "PERCENTAGE",
          discount_value: data.discount_percentage,
          max_discount_amount: data.max_discount_amount,
          min_order_amount: data.min_order_amount,
          max_uses: data.max_usage_limit,
          expires_at: data.expires_at,
        }),
      },
      token
    );
  },

  toggleCoupon(token: string, id: string) {
    return request(`/coupons/${id}/toggle`, { method: "PATCH" }, token);
  },
};
