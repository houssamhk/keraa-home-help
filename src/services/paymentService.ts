import { supabase } from "@/integrations/supabase/client";

// أنواع الدفع المدعومة
export type PaymentType = 
  | "wallet_deposit" 
  | "featured_listing" 
  | "agency_subscription" 
  | "verification_service";

export type PaymentMethod = "satim_cib" | "ccp" | "baridimob" | "dahabia";

export interface CreatePaymentParams {
  amount: number;
  payment_type: PaymentType;
  reference_id: string;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  mode: "production" | "development";
  order_number: string;
  redirect_url: string | null;
  message?: string;
}

/**
 * إنشاء عملية دفع عبر SATIM (CIB / البطاقة الذهبية)
 * عند تفعيل SATIM: يتم توجيه المستخدم لصفحة الدفع
 * قبل التفعيل: يتم إرجاع رسالة بأن الخدمة غير متاحة
 */
export async function createSatimPayment(params: CreatePaymentParams): Promise<PaymentResult> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/satim-create-payment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        ...params,
        return_url: `https://${projectId}.supabase.co/functions/v1/satim-payment-callback`,
      }),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "فشل في إنشاء عملية الدفع");
  }

  return data;
}

/**
 * التحقق من حالة الدفع
 */
export async function checkPaymentStatus(orderNumber: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/satim-check-status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ order_number: orderNumber }),
    }
  );

  return response.json();
}

/**
 * فتح صفحة الدفع SATIM
 */
export function redirectToSatimPayment(redirectUrl: string) {
  window.location.href = redirectUrl;
}

/**
 * معلومات طرق الدفع اليدوية (CCP, BaridiMob, Dahabia)
 */
export const MANUAL_PAYMENT_METHODS = {
  ccp: {
    label: "CCP",
    icon: "🏦",
    color: "from-green-500/20 to-green-600/10 border-green-500/30",
    accountName: "سكني للخدمات العقارية",
    accountNumber: "00799999 0019940 31",
    instructions: "قم بتحويل المبلغ إلى حساب CCP أعلاه ثم ارفع إثبات الدفع",
  },
  baridimob: {
    label: "BaridiMob",
    icon: "📱",
    color: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
    accountName: "سكني للخدمات العقارية",
    accountNumber: "00799999001994031",
    instructions: "أرسل المبلغ عبر تطبيق بريدي موب إلى الرقم أعلاه ثم ارفع لقطة شاشة التأكيد",
  },
  dahabia: {
    label: "بطاقة الذهبية",
    icon: "💳",
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    accountName: "سكني",
    accountNumber: "6280 XXXX XXXX 4521",
    instructions: "حوّل المبلغ إلى بطاقة الذهبية أعلاه عبر GAB أو تطبيق الذهبية ثم ارفع الإثبات",
  },
} as const;

export type ManualPaymentMethod = keyof typeof MANUAL_PAYMENT_METHODS;
