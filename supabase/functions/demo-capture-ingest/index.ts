import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Receives click-through capture steps from the ct-capture.js script running on
// a founder's published MVP site. Anonymous (the visitor-side script has no
// Supabase session); authenticated by the unguessable pending session id the
// founder created in the demo editor moments earlier. Raw HTML is stored on the
// session row only — the owner's editor sanitizes it with DOMPurify at import
// time and it is always rendered in a fully sandboxed iframe (SnapshotFrame).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_STEPS = 10;
const MAX_HTML_CHARS = 400_000;
const SESSION_TTL_MINUTES = 45;

interface CapturedStep {
  html: string;
  clickX: number;
  clickY: number;
  label: string;
}

function normalizeSteps(raw: unknown): CapturedStep[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_STEPS) return null;
  const steps: CapturedStep[] = [];
  for (const item of raw) {
    const record = (item ?? {}) as Record<string, unknown>;
    const html = typeof record.html === "string" ? record.html : "";
    const clickX = Number(record.clickX);
    const clickY = Number(record.clickY);
    if (!html.trim() || html.length > MAX_HTML_CHARS) return null;
    if (!Number.isFinite(clickX) || clickX < 0 || clickX > 1) return null;
    if (!Number.isFinite(clickY) || clickY < 0 || clickY > 1) return null;
    steps.push({
      html,
      clickX,
      clickY,
      label: typeof record.label === "string" ? record.label.trim().slice(0, 80) : "",
    });
  }
  return steps;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    const sourceUrl = typeof body?.sourceUrl === "string" ? body.sourceUrl.slice(0, 300) : null;
    const steps = normalizeSteps(body?.steps);

    if (!UUID_PATTERN.test(sessionId) || !steps) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid capture payload" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing configuration");
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const cutoff = new Date(Date.now() - SESSION_TTL_MINUTES * 60_000).toISOString();
    const { data: session } = await supabase
      .from("demo_capture_sessions")
      .select("id, status, created_at")
      .eq("id", sessionId)
      .eq("status", "pending")
      .gte("created_at", cutoff)
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ ok: false, error: "Capture session not found or expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("demo_capture_sessions")
      .update({
        steps,
        source_url: sourceUrl,
        status: "complete",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "pending");

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true, stepCount: steps.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("demo-capture-ingest error:", error);
    return new Response(JSON.stringify({ ok: false, error: "Capture upload failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
