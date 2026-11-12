// AI provider health check (2026-11-11).
//
// On 2026-11-11 OpenAI, Anthropic and Perplexity had all run out of credit and
// Gemini's search quota was exhausted, and nobody knew: ICP Builder, PMF, GTM
// and MVP Builder failed silently for founders. This check sends each provider
// one tiny request, records the result in public.ai_provider_health, and emails
// the admins only when a provider starts failing or recovers.
//
// Called daily by pg_cron (job ai-provider-health-daily) and on demand by an
// admin. Cost: a few tokens per provider and one Tavily search per run.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";
import { requireAdminOrWorker } from "../_shared/guards.ts";
import { escapeHtml } from "../_shared/email-voice.ts";
import { callGemini, GEMINI_SEARCH_MODELS } from "../_shared/gemini.ts";
import { FAST_JSON_MODELS } from "../_shared/json-generation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProviderCheck {
  provider: string;
  /** What breaks for founders when this provider fails. */
  affects: string;
  run: () => Promise<void>;
}

interface CheckResult {
  provider: string;
  affects: string;
  ok: boolean;
  configured: boolean;
  message: string;
  latencyMs: number;
}

const TIMEOUT_MS = 20_000;

const withTimeout = async (url: string, init: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/** Reads a provider error body into one short line, e.g. "429 credit_balance_exhausted". */
const describeFailure = async (response: Response) => {
  const text = await response.text().catch(() => "");
  let detail = "";
  try {
    const body = JSON.parse(text);
    const error = body?.error ?? body;
    detail = [error?.code, error?.type, error?.status, error?.message].filter((part) => typeof part === "string" && part).join(" · ");
  } catch {
    detail = text;
  }
  return `${response.status} ${detail}`.trim().slice(0, 300);
};

const env = (name: string) => Deno.env.get(name)?.trim() ?? "";

const CHECKS: ProviderCheck[] = [
  {
    provider: "gemini_text",
    affects: "ICP Builder, PMF Lab, GTM Strategist, Insighta Test, Pitch Deck Analyzer",
    run: async () => {
      await callGemini({
        models: FAST_JSON_MODELS,
        parts: [{ text: 'Return {"ok":true}' }],
        maxOutputTokens: 20,
        json: true,
        timeoutMs: TIMEOUT_MS,
      });
    },
  },
  {
    provider: "gemini_search",
    affects: "Search fallback after Tavily (needs a paid Gemini key)",
    run: async () => {
      await callGemini({
        models: GEMINI_SEARCH_MODELS,
        parts: [{ text: "Name one search engine." }],
        maxOutputTokens: 30,
        googleSearch: true,
        timeoutMs: TIMEOUT_MS,
      });
    },
  },
  {
    provider: "tavily",
    affects: "Web research in ICP Builder, GTM Strategist and Customer Discovery",
    run: async () => {
      const response = await withTimeout("https://api.tavily.com/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("TAVILY_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: "startup customer interview guide", max_results: 1, search_depth: "basic" }),
      });
      if (!response.ok) throw new Error(await describeFailure(response));
    },
  },
  {
    provider: "openai",
    affects: "Fallback for ICP, PMF and GTM when Gemini fails; search fallback",
    run: async () => {
      const response = await withTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("OPENAI_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 1, messages: [{ role: "user", content: "ok" }] }),
      });
      if (!response.ok) throw new Error(await describeFailure(response));
    },
  },
  {
    provider: "anthropic",
    affects: "MVP Builder generation, retention email personalisation",
    run: async () => {
      const response = await withTimeout("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1, messages: [{ role: "user", content: "ok" }] }),
      });
      if (!response.ok) throw new Error(await describeFailure(response));
    },
  },
  {
    provider: "deepseek",
    affects: "MVP Builder fallback model",
    run: async () => {
      const response = await withTimeout("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("DEEPSEEK_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "deepseek-chat", max_tokens: 1, messages: [{ role: "user", content: "ok" }] }),
      });
      if (!response.ok) throw new Error(await describeFailure(response));
    },
  },
];

const KEY_FOR: Record<string, string> = {
  gemini_text: "GEMINI_API_KEY",
  gemini_search: "GEMINI_API_KEY",
  tavily: "TAVILY_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

async function runCheck(check: ProviderCheck): Promise<CheckResult> {
  const started = Date.now();
  if (!env(KEY_FOR[check.provider])) {
    return { provider: check.provider, affects: check.affects, ok: false, configured: false, message: `${KEY_FOR[check.provider]} is not set`, latencyMs: 0 };
  }
  try {
    await check.run();
    return { provider: check.provider, affects: check.affects, ok: true, configured: true, message: "ok", latencyMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { provider: check.provider, affects: check.affects, ok: false, configured: true, message: message.slice(0, 300), latencyMs: Date.now() - started };
  }
}

function alertEmail(changes: Array<CheckResult & { recovered: boolean }>, all: CheckResult[]) {
  const row = (r: CheckResult & { recovered?: boolean }) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee"><strong>${escapeHtml(r.provider)}</strong></td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.ok ? (r.recovered ? "Recovered" : "OK") : "Failing"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(r.ok ? "" : r.message)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666">${escapeHtml(r.affects)}</td>
    </tr>`;
  return `
    <div style="font-family:Arial,sans-serif;max-width:720px">
      <h2 style="margin:0 0 8px">AI provider status changed</h2>
      <p style="margin:0 0 16px;color:#444">These changed since the last check:</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">${changes.map(row).join("")}</table>
      <p style="margin:20px 0 8px;color:#444">All providers now:</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">${all.map(row).join("")}</table>
      <p style="margin-top:16px;color:#666;font-size:12px">Sent by the daily ai-provider-health check. Full status: /admin/adoption.</p>
    </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireAdminOrWorker(req);
  if (denied) return denied;

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const results = await Promise.all(CHECKS.map(runCheck));
    const now = new Date().toISOString();

    // Without the previous state every run would look like a first run and
    // email about every failing provider, so a read failure stops here.
    const { data: previousRows, error: readError } = await admin.from("ai_provider_health").select("provider, ok, failing_since, last_ok_at");
    if (readError) throw new Error(`Could not read ai_provider_health: ${readError.message}`);
    const previous = new Map((previousRows ?? []).map((row: { provider: string; ok: boolean; failing_since: string | null; last_ok_at: string | null }) => [row.provider, row]));

    const changes: Array<CheckResult & { recovered: boolean }> = [];
    for (const result of results) {
      const before = previous.get(result.provider);
      // A first run reports every failing provider; later runs only changes.
      if (!before ? !result.ok : before.ok !== result.ok) {
        changes.push({ ...result, recovered: Boolean(before && !before.ok && result.ok) });
      }
      const { error: writeError } = await admin.from("ai_provider_health").upsert({
        provider: result.provider,
        ok: result.ok,
        configured: result.configured,
        message: result.message,
        affects: result.affects,
        latency_ms: result.latencyMs,
        checked_at: now,
        last_ok_at: result.ok ? now : before?.last_ok_at ?? null,
        failing_since: result.ok ? null : before?.failing_since ?? now,
      }, { onConflict: "provider" });
      if (writeError) console.error(`ai-provider-health could not save ${result.provider}:`, writeError.message);
    }

    let emailed = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (changes.length > 0 && resendKey) {
      const recipients = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").map((email) => email.trim()).filter(Boolean);
      if (recipients.length > 0) {
        const failing = changes.filter((change) => !change.ok).map((change) => change.provider);
        const recovered = changes.filter((change) => change.recovered).map((change) => change.provider);
        const subject = failing.length
          ? `AI provider failing: ${failing.join(", ")}`
          : `AI provider recovered: ${recovered.join(", ")}`;
        const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
        const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
        const sent = await new Resend(resendKey).emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: recipients,
          subject,
          html: alertEmail(changes, results),
        });
        emailed = !sent.error;
        if (sent.error) console.error("ai-provider-health email failed:", sent.error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      checkedAt: now,
      results: results.map(({ provider, ok, configured, message, latencyMs }) => ({ provider, ok, configured, message, latencyMs })),
      changes: changes.map((change) => change.provider),
      emailed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("ai-provider-health error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
