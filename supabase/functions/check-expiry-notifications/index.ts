import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT - require authenticated admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Verify the caller is an admin
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin', userId, 'triggered expiry check');

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const notifications: { user_id: string; title: string; message: string; type: string }[] = [];

    // Check featured listings expiring in 3 days
    const { data: expiringFeatured } = await serviceClient
      .from("featured_listings")
      .select("id, user_id, property_id, expires_at")
      .eq("status", "active")
      .lte("expires_at", threeDaysFromNow.toISOString())
      .gt("expires_at", now.toISOString());

    if (expiringFeatured) {
      for (const listing of expiringFeatured) {
        const { data: existing } = await serviceClient
          .from("notifications")
          .select("id")
          .eq("user_id", listing.user_id)
          .eq("type", "expiry_warning")
          .like("message", `%${listing.id}%`)
          .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existing) {
          const expiresAt = new Date(listing.expires_at!);
          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          
          notifications.push({
            user_id: listing.user_id,
            title: "تنبيه انتهاء صلاحية التمييز",
            message: `إعلانك المميز سينتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}. قم بتجديده للحفاظ على ظهوره في المقدمة. [${listing.id}]`,
            type: "expiry_warning"
          });
        }
      }
    }

    // Check agency subscriptions expiring in 3 days
    const { data: expiringAgency } = await serviceClient
      .from("agency_subscriptions")
      .select("id, user_id, agency_name, expires_at")
      .eq("status", "active")
      .lte("expires_at", threeDaysFromNow.toISOString())
      .gt("expires_at", now.toISOString());

    if (expiringAgency) {
      for (const sub of expiringAgency) {
        const { data: existing } = await serviceClient
          .from("notifications")
          .select("id")
          .eq("user_id", sub.user_id)
          .eq("type", "subscription_expiry")
          .like("message", `%${sub.id}%`)
          .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existing) {
          const expiresAt = new Date(sub.expires_at!);
          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          
          notifications.push({
            user_id: sub.user_id,
            title: "تنبيه انتهاء الاشتراك",
            message: `اشتراك وكالتك "${sub.agency_name}" سينتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}. جدد الآن لتجنب انقطاع الخدمة. [${sub.id}]`,
            type: "subscription_expiry"
          });
        }
      }
    }

    if (notifications.length > 0) {
      const { error: insertError } = await serviceClient
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        details: {
          featuredExpiring: expiringFeatured?.length || 0,
          agencyExpiring: expiringAgency?.length || 0
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
