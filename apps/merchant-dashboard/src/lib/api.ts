/**
 * API Client لربط لوحة تحكم التاجر بسيرفر Laravel
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/merchant";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  token?: string;
  is_new_merchant?: boolean;
  user?: any;
  merchant?: any;
  data?: any;
  order?: any;
  orders?: any[];
  reel?: any;
  reels?: any[];
  cursor?: any;
  stats?: any;
  product?: any;
  products?: any[];
  categories?: any[];
  available_modifier_groups?: any[];
  business_hours?: any[];
  url?: string;
  debug_code?: string;
  expires_in_seconds?: number;
  resend_in_seconds?: number;
  errors?: Record<string, string[]>;
}

export const merchantApi = {
  /**
   * إرسال كود التحقق OTP
   */
  async sendOtp(phoneNumber: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
    return res.json();
  },

  /**
   * فحص كود الـ OTP وتسجيل الدخول
   */
  async verifyOtp(phoneNumber: string, code: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ phone_number: phoneNumber, code }),
    });
    return res.json();
  },

  /**
   * استكمال بيانات المتجر الجديد
   */
  async registerStore(
    token: string,
    data: {
      store_name: string;
      merchant_type: string;
      address_text: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/register-store`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * تسجيل الخروج وإبطال التوكن
   */
  async logout(token: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * جلب بيانات التاجر الحالي
   */
  async getMe(token: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * جلب إعدادات المتجر وساعات العمل (Eager Loaded)
   */
  async getSettings(token: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * تحديث الملف الشخصي والبيانات التشغيلية للمتجر
   */
  async updateProfile(
    token: string,
    data: {
      name: string;
      address_text: string;
      preparation_time_minutes: number;
      min_order_amount?: number;
      delivery_radius_km?: number;
    }
  ): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/settings/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * تحديث ساعات العمل الأسبوعية
   */
  async updateBusinessHours(
    token: string,
    hours: Array<{
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_closed: boolean;
    }>
  ): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/settings/business-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hours }),
    });
    return res.json();
  },

  /**
   * طلب تغيير نظام التوصيل
   */
  async requestFulfillmentChange(
    token: string,
    data: {
      requested_fulfillment_type: string;
      notes?: string;
    }
  ): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/settings/fulfillment-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * رفع شعار أو غلاف المتجر
   */
  async uploadMedia(token: string, formData: FormData): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/settings/media`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return res.json();
  },

  /**
   * جلب قائمة الطعام والمنتجات كاملة
   */
  async getMenu(token: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/menu`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * إضافة طبق جديد
   */
  async createProduct(token: string, data: any): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/menu/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * تعديل بيانات طبق
   */
  async updateProduct(token: string, productId: string, data: any): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/menu/products/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * تبديل حالة توفر الطبق اليوم (متاح / غير متاح)
   */
  async toggleProductAvailability(token: string, productId: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/menu/products/${productId}/toggle-availability`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * حذف طبق من القائمة
   */
  async deleteProduct(token: string, productId: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/menu/products/${productId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * رفع صورة للطبق
   */
  async uploadDishImage(token: string, formData: FormData): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/menu/upload-image`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return res.json();
  },

  /**
   * =========================================================================
   * مسارات إدارة الطلبات (Order Management API)
   * =========================================================================
   */

  /**
   * جلب قائمة الطلبات مع إمكانية الفلترة بالحالة
   */
  async getOrders(token: string, status?: string): Promise<ApiResponse> {
    const url = status
      ? `${API_BASE_URL}/orders?status=${encodeURIComponent(status)}`
      : `${API_BASE_URL}/orders`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * جلب إحصائيات الطلبات السريعة اليومية
   */
  async getOrderStats(token: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/orders/stats`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * جلب تفاصيل طلب محدد
   */
  async getOrder(token: string, id: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * قبول طلب قيد الانتظار وتحديد مدة التحضير
   */
  async acceptOrder(token: string, id: string, prepTimeMinutes?: number): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/orders/${id}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prep_time_minutes: prepTimeMinutes }),
    });
    return res.json();
  },

  /**
   * رفض طلب مع كتابة السبب
   */
  async rejectOrder(token: string, id: string, rejectionReason: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/orders/${id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
    return res.json();
  },

  /**
   * تعيين حالة الطلب إلى جاهز للتسليم
   */
  async markOrderReady(token: string, id: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/orders/${id}/ready`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * إنشاء طلب تجريبي للتجربة والمعاينة
   */
  async createTestOrder(token: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/orders/create-test-order`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * =========================================================================
   * مسارات الفيديوهات والريلز (Reels API)
   * =========================================================================
   */

  /**
   * جلب فيديوهات المتجر مع دعم الـ Cursor-based Pagination
   */
  async getReels(token: string, cursor?: string, productId?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append("cursor", cursor);
    if (productId) params.append("product_id", productId);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/reels${query}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * رفع ونشر فيديو ريلز جديد وربطه بالطبق
   */
  async uploadReel(token: string, formData: FormData): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/reels`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return res.json();
  },

  /**
   * تفعيل أو إيقاف ظهور الريلز
   */
  async toggleReelStatus(token: string, id: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/reels/${id}/toggle-status`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },

  /**
   * حذف فيديو ريلز
   */
  async deleteReel(token: string, id: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE_URL}/reels/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  },
};
