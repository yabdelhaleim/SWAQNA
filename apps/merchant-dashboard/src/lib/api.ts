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
};
