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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const orderNumber = url.searchParams.get("order") || url.searchParams.get("orderId");
    const orderId = url.searchParams.get("orderId");

    if (!orderNumber) {
      return redirectToApp("error", "missing_order");
    }

    // Find the payment record
    const { data: payment, error: findError } = await adminSupabase
      .from("payment_history")
      .select("*")
      .eq("payment_reference", orderNumber)
      .eq("status", "pending")
      .single();

    if (findError || !payment) {
      console.error("Payment not found:", orderNumber, findError);
      return redirectToApp("error", "payment_not_found");
    }

    // Check SATIM credentials
    if (!SATIM_MERCHANT_ID || !SATIM_SECRET_KEY) {
      console.warn("SATIM credentials not configured - cannot verify payment");
      return redirectToApp("error", "satim_not_configured");
    }

    // ====== SATIM API: Check Order Status ======
    const statusParams = new URLSearchParams({
      userName: SATIM_MERCHANT_ID,
      password: SATIM_SECRET_KEY,
      orderNumber: orderNumber,
      language: "AR",
    });

    const statusResponse = await fetch(`${SATIM_API_URL}/getOrderStatus.do`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: statusParams.toString(),
    });

    const statusData = await statusResponse.json();

    // SATIM OrderStatus: 0=registered, 1=pre-authorized, 2=deposited (success), 3=reversed, 4=refunded, 5=auth_by_issuer, 6=declined
    const isSuccess = statusData.orderStatus === 2;
    const isDeclined = [3, 4, 6].includes(statusData.orderStatus);

    if (isSuccess) {
      // Payment confirmed! Process it
      await processSuccessfulPayment(adminSupabase, payment, statusData);
      return redirectToApp("success", orderNumber);
    } else if (isDeclined) {
      // Payment failed
      await adminSupabase
        .from("payment_history")
        .update({
          status: "failed",
          rejection_reason: statusData.actionCodeDescription || "تم رفض العملية",
        })
        .eq("id", payment.id);

      return redirectToApp("failed", orderNumber);
    } else {
      // Still processing
      return redirectToApp("pending", orderNumber);
    }
  } catch (error) {
    console.error("Callback processing error:", error);
    return redirectToApp("error", "internal_error");
  }
});

async function processSuccessfulPayment(
  supabase: any,
  payment: any,
  satimData: any
) {
  // Update payment status to verified
  await supabase
    .from("payment_history")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  const userId = payment.user_id;
  const amount = payment.amount;
  const paymentType = payment.payment_type;
  const referenceId = payment.reference_id;

  switch (paymentType) {
    case "wallet_deposit": {
      // Add funds to wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", userId)
        .single();

      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            balance: wallet.balance + amount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", wallet.id);

        // Create transaction record
        await supabase.from("wallet_transactions").insert({
          wallet_id: wallet.id,
          type: "deposit",
          amount: amount,
          description: `إيداع عبر بطاقة CIB/Dahabia - SATIM`,
          reference_id: payment.id,
          reference_type: "satim_payment",
          status: "completed",
        });
      }
      break;
    }

    case "featured_listing": {
      // Activate featured listing
      await supabase
        .from("featured_listings")
        .update({
          status: "active",
          starts_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
          payment_method: "satim_cib",
        })
        .eq("id", referenceId)
        .eq("user_id", userId);
      break;
    }

    case "agency_subscription": {
      // Activate agency subscription
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
      
      await supabase
        .from("agency_subscriptions")
        .update({
          status: "active",
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          verified_at: now.toISOString(),
          last_payment_at: now.toISOString(),
          next_payment_at: expiresAt.toISOString(),
          payment_method: "satim_cib",
        })
        .eq("id", referenceId)
        .eq("user_id", userId);
      break;
    }

    case "verification_service": {
      // Update verification request
      await supabase
        .from("verification_requests")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "satim_cib",
        })
        .eq("id", referenceId)
        .eq("requester_id", userId);
      break;
    }
  }

  // Send notification
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "payment",
    title: "تم الدفع بنجاح ✅",
    message: `تم تأكيد دفع ${amount.toLocaleString()} دج عبر البطاقة البنكية`,
    data: {
      payment_type: paymentType,
      amount,
      order_number: payment.payment_reference,
    },
  });
}

function redirectToApp(status: string, ref: string) {
  // Redirect back to app with payment result
  const appUrl = Deno.env.get("APP_URL") || "https://id-preview--1ae6fc87-6c83-4d3e-a18d-9457f418caca.lovable.app";
  const redirectUrl = `${appUrl}/wallet?payment_status=${status}&ref=${ref}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      ...corsHeaders,
    },
  });
}
