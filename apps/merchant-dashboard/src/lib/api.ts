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
};
