import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "shimmer" } = await req.json();

    if (!text || text.trim() === "") {
      throw new Error("Text is required");
    }

    console.log("TTS request for text:", text.substring(0, 100));

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
