import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SATIM_API_URL = Deno.env.get("SATIM_API_URL") || "https://test.satim.dz/payment/rest";
const SATIM_MERCHANT_ID = Deno.env.get("SATIM_MERCHANT_ID") || "";
const SATIM_SECRET_KEY = Deno.env.get("SATIM_SECRET_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
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

    const { order_number } = await req.json();

    if (!order_number) {
      return new Response(
        JSON.stringify({ error: "Missing order_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the payment - verify ownership
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: payment } = await adminSupabase
      .from("payment_history")
      .select("*")
      .eq("payment_reference", order_number)
      .eq("user_id", user.id)
      .single();

    if (!payment) {
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already processed, return current status
    if (payment.status !== "pending") {
      return new Response(
        JSON.stringify({
          status: payment.status,
          amount: payment.amount,
          payment_type: payment.payment_type,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check with SATIM if credentials available
    if (SATIM_MERCHANT_ID && SATIM_SECRET_KEY) {
      const statusParams = new URLSearchParams({
        userName: SATIM_MERCHANT_ID,
        password: SATIM_SECRET_KEY,
        orderNumber: order_number,
        language: "AR",
      });

      const statusResponse = await fetch(`${SATIM_API_URL}/getOrderStatus.do`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: statusParams.toString(),
      });

      const statusData = await statusResponse.json();

      return new Response(
        JSON.stringify({
          status: "pending",
          satim_status: statusData.orderStatus,
          satim_description: statusData.actionCodeDescription,
          amount: payment.amount,
          payment_type: payment.payment_type,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: payment.status,
        amount: payment.amount,
        payment_type: payment.payment_type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Status check error:", error);
    return new Response(
      JSON.stringify({ error: "خطأ داخلي" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
