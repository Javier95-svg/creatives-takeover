import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Cron-invoked (pg_cron via pg_net, no JWT) — verify_jwt=false. Retries failed Demo Studio
// webhook deliveries with exponential backoff and gives up at max_attempts. Optionally
// guarded by a shared CRON_SECRET header when that env var is set.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const BATCH = 25;
const WEBHOOK_TIMEOUT_MS = 5000;
const BACKOFF_MINUTES = [1, 5, 30, 120, 360];

function nextAttemptAt(attempts: number): string {
  const idx = Math.min(Math.max(attempts - 1, 0), BACKOFF_MINUTES.length - 1);
  return new Date(Date.now() + BACKOFF_MINUTES[idx] * 60_000).toISOString();
}

async function postWebhook(url: string, payload: unknown): Promise<{ ok: boolean; status?: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const nowIso = new Date().toISOString();
  const { data: due, error } = await admin
    .from("demo_studio_webhook_deliveries")
    .select("id, webhook_url, payload, attempts, max_attempts")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let succeeded = 0;
  for (const row of due ?? []) {
    // Only retry rows that still have a remaining attempt budget.
    if ((row.attempts as number) >= (row.max_attempts as number)) {
      await admin.from("demo_studio_webhook_deliveries").update({ status: "exhausted", updated_at: new Date().toISOString() }).eq("id", row.id);
      continue;
    }
    const result = await postWebhook(row.webhook_url as string, row.payload);
    const attempts = (row.attempts as number) + 1;
    const maxAttempts = row.max_attempts as number;
    await admin
      .from("demo_studio_webhook_deliveries")
      .update({
        status: result.ok ? "success" : attempts >= maxAttempts ? "exhausted" : "failed",
        attempts,
        last_status_code: result.status ?? null,
        last_error: result.ok ? null : result.error ?? `HTTP ${result.status ?? "error"}`,
        next_attempt_at: result.ok ? new Date().toISOString() : nextAttemptAt(attempts),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    processed += 1;
    if (result.ok) succeeded += 1;
  }

  return new Response(JSON.stringify({ success: true, processed, succeeded }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
