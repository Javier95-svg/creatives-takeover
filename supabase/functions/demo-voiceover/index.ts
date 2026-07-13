import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";

// Text-to-speech for Demo Studio narrated exports. Takes the storyboard's
// speaker notes (one text per step) and returns one MP3 clip per step, base64
// encoded. OpenAI tts-1 keeps the cost negligible; free for now, matching the
// existing export TODO(billing) in DemoPlayer.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CLIPS = 10;
const MAX_TEXT_CHARS = 600;
const ALLOWED_VOICES = new Set(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);

function base64Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawTexts = Array.isArray(body?.texts) ? body.texts : [];
    const voice = typeof body?.voice === "string" && ALLOWED_VOICES.has(body.voice) ? body.voice : "alloy";
    const texts = rawTexts
      .slice(0, MAX_CLIPS)
      .map((t: unknown) => (typeof t === "string" ? t.trim().slice(0, MAX_TEXT_CHARS) : ""));

    if (texts.length === 0 || texts.every((t: string) => !t)) {
      return new Response(JSON.stringify({ success: false, error: "No narration text provided" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error("OpenAI API key not configured");

    const clips: (string | null)[] = [];
    for (const text of texts) {
      if (!text) {
        clips.push(null);
        continue;
      }
      const resp = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "tts-1", voice, input: text, response_format: "mp3" }),
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "");
        throw new Error(`TTS failed: ${resp.status} ${errBody.slice(0, 160)}`.trim());
      }
      clips.push(base64Encode(await resp.arrayBuffer()));
    }

    return new Response(JSON.stringify({ success: true, clips, voice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("demo-voiceover error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Voiceover generation failed",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
