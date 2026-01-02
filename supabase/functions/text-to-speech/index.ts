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
    const { text, voice = "alloy" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!text || text.trim() === "") {
      throw new Error("Text is required");
    }

    console.log("Generating speech for text:", text.substring(0, 100));

    // Use Lovable AI gateway for TTS with a valid voice
    const validVoices = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"];
    const selectedVoice = validVoices.includes(voice) ? voice : "alloy";

    // Use OpenAI-compatible TTS endpoint
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: selectedVoice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TTS API error:", response.status, errorText);
      
      // Fallback: return text without audio
      return new Response(
        JSON.stringify({ 
          error: "TTS not available", 
          text: text,
          fallback: true 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 safely
    const uint8Array = new Uint8Array(audioBuffer);
    let binary = '';
    const chunkSize = 32768;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Audio = btoa(binary);

    console.log("Audio generated successfully, size:", audioBuffer.byteLength);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("TTS error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
