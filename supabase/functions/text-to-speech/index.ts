import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "يجب تسجيل الدخول لاستخدام تحويل النص إلى كلام" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !data?.user) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة، يرجى تسجيل الدخول مجدداً" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, voice = "shimmer" } = await req.json();

    if (!text || typeof text !== 'string' || text.trim() === "") {
      throw new Error("Text is required");
    }

    // Input length limit to prevent abuse
    if (text.length > 5000) {
      throw new Error("Text too long (max 5000 characters)");
    }

    // Since Lovable AI doesn't support TTS directly, we return a fallback flag
    // The frontend will use enhanced browser TTS with optimal settings
    return new Response(
      JSON.stringify({ 
        text: text,
        fallback: true,
        settings: {
          rate: 1.0,      // Normal speed
          pitch: 1.1,     // Slightly higher for clarity
          lang: "ar-SA"   // Arabic Saudi (best quality Arabic voice)
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("TTS error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, fallback: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
