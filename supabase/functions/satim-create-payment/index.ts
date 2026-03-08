import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// SATIM API Configuration
// عند الحصول على حساب SATIM، أضف هذه المفاتيح في Supabase Secrets:
// SATIM_TERMINAL_ID, SATIM_MERCHANT_ID, SATIM_SECRET_KEY
const SATIM_API_URL = Deno.env.get("SATIM_API_URL") || "https://test.satim.dz/payment/rest"; // Production: https://cib.satim.dz/payment/rest
const SATIM_TERMINAL_ID = Deno.env.get("SATIM_TERMINAL_ID") || "";
const SATIM_MERCHANT_ID = Deno.env.get("SATIM_MERCHANT_ID") || "";
const SATIM_SECRET_KEY = Deno.env.get("SATIM_SECRET_KEY") || "";

interface PaymentRequest {
  amount: number; // بالدينار الجزائري
  payment_type: "wallet_deposit" | "featured_listing" | "agency_subscription" | "verification_service";
  reference_id: string;
  description?: string;
  return_url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PaymentRequest = await req.json();
    const { amount, payment_type, reference_id, description, return_url } = body;

    // Validation
    if (!amount || amount < 100) {
      return new Response(
        JSON.stringify({ error: "الحد الأدنى للمبلغ 100 دج" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payment_type || !reference_id) {
      return new Response(
        JSON.stringify({ error: "بيانات الدفع غير مكتملة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique order number
    const orderNumber = `SKN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // SATIM amount is in centimes (multiply by 100)
    const satimAmount = Math.round(amount * 100);

    // Build return URL
    const baseReturnUrl = return_url || `${supabaseUrl}/functions/v1/satim-payment-callback`;
    const callbackUrl = `${baseReturnUrl}?order=${orderNumber}`;

    // Check if SATIM credentials are configured
    if (!SATIM_TERMINAL_ID || !SATIM_MERCHANT_ID || !SATIM_SECRET_KEY) {
      // Development mode: simulate payment creation
      console.warn("SATIM credentials not configured - running in development mode");

      // Create payment record in pending state
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

      await adminSupabase.from("payment_history").insert({
        user_id: user.id,
        payment_type,
        reference_id,
        amount,
        payment_method: "satim_cib",
        payment_reference: orderNumber,
        status: "pending",
      });

      return new Response(
        JSON.stringify({
          success: true,
          mode: "development",
          order_number: orderNumber,
          message: "بوابة SATIM غير مفعلة حالياً. استخدم طرق الدفع اليدوية.",
          redirect_url: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== SATIM API: Register Order ======
    const registerParams = new URLSearchParams({
      userName: SATIM_MERCHANT_ID,
      password: SATIM_SECRET_KEY,
      orderNumber: orderNumber,
      amount: satimAmount.toString(),
      currency: "012", // DZD currency code
      returnUrl: callbackUrl,
      failUrl: callbackUrl,
      description: description || `دفع ${payment_type} - سكني`,
      language: "AR",
      jsonParams: JSON.stringify({
        force_terminal_id: SATIM_TERMINAL_ID,
        udf1: user.id,
        udf2: payment_type,
        udf3: reference_id,
      }),
    });

    const satimResponse = await fetch(`${SATIM_API_URL}/register.do`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: registerParams.toString(),
    });

    const satimData = await satimResponse.json();

    if (satimData.errorCode && satimData.errorCode !== "0") {
      console.error("SATIM register error:", satimData);
      return new Response(
        JSON.stringify({
          error: "فشل في إنشاء عملية الدفع",
          details: satimData.errorMessage,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save payment record
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    await adminSupabase.from("payment_history").insert({
      user_id: user.id,
      payment_type,
      reference_id,
      amount,
      payment_method: "satim_cib",
      payment_reference: orderNumber,
      status: "pending",
    });

    return new Response(
      JSON.stringify({
        success: true,
        mode: "production",
        order_number: orderNumber,
        satim_order_id: satimData.orderId,
        redirect_url: satimData.formUrl, // URL to redirect user to SATIM payment page
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(
      JSON.stringify({ error: "خطأ داخلي في الخادم" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
