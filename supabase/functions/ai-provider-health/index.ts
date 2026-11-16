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
import { callGemini, GEMINI_SEARCH_MODELS, GEMINI_TEXT_MODELS } from "../_shared/gemini.ts";
import { FAST_JSON_MODELS } from "../_shared/json-generation.ts";

/** Gemini models mvp-builder-generate calls (FREE_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL there). */
const MVP_BUILDER_GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

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

/** Every Gemini model id the edge functions name. Keep in sync when models change. */
const REQUIRED_GEMINI_MODELS = Array.from(new Set([
  ...GEMINI_TEXT_MODELS.map((spec) => spec.model),
  ...GEMINI_SEARCH_MODELS.map((spec) => spec.model),
  ...FAST_JSON_MODELS.map((spec) => spec.model),
  ...MVP_BUILDER_GEMINI_MODELS,
]));

const CHECKS: ProviderCheck[] = [
  {
    // Every 10 minutes on its own (job ai-provider-health-auth-email-hourly)
    // as well as daily. Since 2026-11-16 Supabase Auth emails go through
    // auth_email_outbox and auth-email-worker (Resend API), not SMTP.
    provider: "auth_email",
    affects: "Signup confirmation, password reset and email-change emails",
    run: async () => {
      // 1. The key: an invalid key is rejected; a sending-only key answers
      //    restricted_api_key, which still sends.
      const response = await withTimeout("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}` },
      });
      if (!response.ok) {
        const failure = await describeFailure(response);
        if (!/restricted_api_key/i.test(failure)) throw new Error(`Resend key rejected: ${failure}`);
      }
      // 2. The queue: nothing failed lately, nothing stuck.
      const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
      const since = new Date(Date.now() - 2 * 3600_000).toISOString();
      const stuckBefore = new Date(Date.now() - 10 * 60_000).toISOString();
      const [failed, stuck] = await Promise.all([
        admin.from("auth_email_outbox").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since),
        admin.from("auth_email_outbox").select("id", { count: "exact", head: true }).in("status", ["pending", "sending"]).lt("created_at", stuckBefore),
      ]);
      if (failed.error || stuck.error) throw new Error(`Could not read auth_email_outbox: ${(failed.error ?? stuck.error)?.message}`);
      const problems = [
        failed.count ? `${failed.count} auth email${failed.count === 1 ? "" : "s"} failed in the last 2 hours` : null,
        stuck.count ? `${stuck.count} auth email${stuck.count === 1 ? "" : "s"} waiting more than 10 minutes` : null,
      ].filter(Boolean);
      if (problems.length) throw new Error(problems.join("; "));
    },
  },
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
    // Listing models is free. Catches a model our code names being retired
    // or never existing for this key (MVP Builder failed this way in Oct 2026).
    provider: "gemini_models",
    affects: "Any tool whose Gemini model is missing falls back or fails",
    run: async () => {
      const response = await withTimeout("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
        headers: { "x-goog-api-key": env("GEMINI_API_KEY") },
      });
      if (!response.ok) throw new Error(await describeFailure(response));
      const body = await response.json();
      const available = new Set((body?.models ?? []).map((model: { name?: string }) => String(model?.name ?? "").replace(/^models\//, "")));
      const missing = REQUIRED_GEMINI_MODELS.filter((model) => !available.has(model));
      if (missing.length) throw new Error(`Missing models: ${missing.join(", ")}`);
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
  {
    provider: "groq",
    affects: "Free text fallback (added 2026-11-12, not wired into tools yet)",
    // Groq retires model ids often, so ask which chat models this key has
    // and ping one of them rather than naming a model that may be gone.
    run: async () => {
      const headers = { Authorization: `Bearer ${env("GROQ_API_KEY")}`, "Content-Type": "application/json" };
      const listed = await withTimeout("https://api.groq.com/openai/v1/models", { headers });
      if (!listed.ok) throw new Error(await describeFailure(listed));
      const ids: string[] = ((await listed.json())?.data ?? [])
        .filter((model: { active?: boolean }) => model?.active !== false)
        .map((model: { id?: string }) => String(model?.id ?? ""))
        .filter((id: string) => id && !/whisper|tts|guard|playai|orpheus|distil/i.test(id));
      const model = ids.find((id) => /llama.*instant/i.test(id)) ?? ids.find((id) => /llama/i.test(id)) ?? ids[0];
      if (!model) throw new Error("Key works but no chat models are listed");
      const response = await withTimeout("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: "user", content: "ok" }] }),
      });
      if (!response.ok) throw new Error(`${model}: ${await describeFailure(response)}`);
    },
  },
  {
    // videos.list costs 1 unit of the 10,000 daily quota (search costs 100).
    provider: "youtube",
    affects: "Customer discovery from YouTube (added 2026-11-12, not wired into tools yet)",
    run: async () => {
      const response = await withTimeout("https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1", {
        headers: { "x-goog-api-key": env("YOUTUBE_API_KEY") },
      });
      if (!response.ok) throw new Error(await describeFailure(response));
    },
  },
  {
    provider: "lovable_gateway",
    affects: "Chatbot, business insights, market validation, outreach generator, community feedback, Pulse insights",
    run: async () => {
      const response = await withTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", max_tokens: 1, messages: [{ role: "user", content: "ok" }] }),
      });
      if (!response.ok) throw new Error(await describeFailure(response));
    },
  },
  {
    // One result, no page text: the cheapest real search Exa offers.
    provider: "exa",
    affects: "GTM Strategist Find customers: finding organisations (falls back to web search)",
    run: async () => {
      const response = await withTimeout("https://api.exa.ai/search", {
        method: "POST",
        headers: { "x-api-key": env("EXA_API_KEY"), "Content-Type": "application/json" },
        body: JSON.stringify({ query: "a university startup incubator in Leeds", type: "auto", category: "company", numResults: 1 }),
      });
      if (!response.ok) throw new Error(await describeFailure(response));
      const body = await response.json();
      if (!Array.isArray(body?.results) || !body.results.length) throw new Error("Key works but the search returned no results");
    },
  },
  {
    // The account endpoint is free and shows what the plan has left.
    provider: "hunter",
    affects: "GTM Strategist Find customers: finding the right person (named contacts)",
    run: async () => {
      const response = await withTimeout(`https://api.hunter.io/v2/account?api_key=${encodeURIComponent(env("HUNTER_API_KEY"))}`, {});
      if (!response.ok) throw new Error(await describeFailure(response));
      const data = (await response.json())?.data ?? {};
      const searches = data?.requests?.searches;
      const verifications = data?.requests?.verifications;
      const left = (usage: { used?: number; available?: number } | undefined) => usage && typeof usage.available === "number" ? usage.available - (usage.used ?? 0) : null;
      if (left(searches) === 0 || left(verifications) === 0) {
        throw new Error(`No ${left(searches) === 0 ? "searches" : "verifications"} left this period on the ${data?.plan_name ?? "current"} plan`);
      }
    },
  },
  {
    provider: "perplexity",
    affects: "BizMap research, trends analyzer, market provider health",
    run: async () => {
      const response = await withTimeout("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("PERPLEXITY_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "sonar", max_tokens: 1, messages: [{ role: "user", content: "ok" }] }),
      });
      if (!response.ok) throw new Error(await describeFailure(response));
    },
  },
];

const KEY_FOR: Record<string, string> = {
  auth_email: "RESEND_API_KEY",
  gemini_text: "GEMINI_API_KEY",
  gemini_models: "GEMINI_API_KEY",
  gemini_search: "GEMINI_API_KEY",
  tavily: "TAVILY_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  groq: "GROQ_API_KEY",
  youtube: "YOUTUBE_API_KEY",
  lovable_gateway: "LOVABLE_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  exa: "EXA_API_KEY",
  hunter: "HUNTER_API_KEY",
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

// Same two inboxes contact-form-submission always notifies.
const REQUIRED_ADMIN_RECIPIENTS = ["admin@creatives-takeover.com", "javier@creatives-takeover.com"];
const EMAIL_PATTERN = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;

/**
 * The required inboxes plus every valid address in ADMIN_NOTIFICATION_EMAILS.
 * On 2026-11-12 Resend rejected that secret's value as a `to` list, so it is
 * read loosely (commas, semicolons, spaces, quotes, "Name <a@b.c>") and
 * entries that are not addresses are dropped instead of failing the send.
 */
function adminRecipients(): string[] {
  const configured = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "")
    .split(/[,;\s]+/)
    .map((entry) => entry.replace(/^[\s"'<[(]+|[\s"'>\])]+$/g, "").trim().toLowerCase())
    .filter(Boolean);
  const valid = configured.filter((entry) => EMAIL_PATTERN.test(entry));
  if (configured.length !== valid.length) {
    console.warn(`ai-provider-health: ignored ${configured.length - valid.length} invalid ADMIN_NOTIFICATION_EMAILS entr${configured.length - valid.length === 1 ? "y" : "ies"}`);
  }
  return Array.from(new Set([...REQUIRED_ADMIN_RECIPIENTS, ...valid]));
}

interface MonthSpend {
  month: string;
  byProvider: Array<{ provider: string; usd: number; calls: number }>;
  aiUsd: number;
  aiBudgetUsd: number;
}

/**
 * Month-to-date spend from provider_spend_ledger (estimates, not invoices).
 * "llm:*" rows count against AI_MONTHLY_BUDGET_USD; over it, the shared AI
 * chain (_shared/json-generation.ts) skips the paid providers.
 */
async function monthSpend(admin: ReturnType<typeof createClient>): Promise<MonthSpend | null> {
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const { data, error } = await admin.from("provider_spend_ledger").select("provider, est_cost_usd").gte("created_at", month);
  if (error) {
    console.error("ai-provider-health could not read provider_spend_ledger:", error.message);
    return null;
  }
  const totals = new Map<string, { usd: number; calls: number }>();
  for (const row of (data ?? []) as Array<{ provider: string; est_cost_usd: number | string }>) {
    const entry = totals.get(row.provider) ?? { usd: 0, calls: 0 };
    entry.usd += Number(row.est_cost_usd) || 0;
    entry.calls += 1;
    totals.set(row.provider, entry);
  }
  const byProvider = [...totals.entries()].map(([provider, entry]) => ({ provider, ...entry })).sort((a, b) => b.usd - a.usd);
  return {
    month,
    byProvider,
    aiUsd: byProvider.filter((entry) => entry.provider.startsWith("llm:")).reduce((sum, entry) => sum + entry.usd, 0),
    aiBudgetUsd: Number(Deno.env.get("AI_MONTHLY_BUDGET_USD") ?? "25") || 25,
  };
}

function spendTable(spend: MonthSpend | null) {
  if (!spend) return "";
  const total = spend.byProvider.reduce((sum, entry) => sum + entry.usd, 0);
  const rows = spend.byProvider.map((entry) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(entry.provider)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${entry.calls}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">$${entry.usd.toFixed(2)}</td>
    </tr>`).join("");
  return `
      <p style="margin:20px 0 8px;color:#444">Estimated spend since ${escapeHtml(spend.month)}: <strong>$${total.toFixed(2)}</strong>. AI text: $${spend.aiUsd.toFixed(2)} of the $${spend.aiBudgetUsd.toFixed(2)} cap (AI_MONTHLY_BUDGET_USD).</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">${rows || '<tr><td style="padding:6px 10px;color:#666">Nothing recorded yet.</td></tr>'}</table>`;
}

function budgetEmail(kind: "warning" | "paused", spend: MonthSpend) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:720px">
      <h2 style="margin:0 0 8px">${kind === "paused" ? "AI spend cap reached" : "AI spend at 80% of the monthly cap"}</h2>
      <p style="margin:0 0 8px;color:#444">${kind === "paused"
        ? "Paid AI providers (Gemini, OpenAI) are now skipped until the 1st. The tools keep working on the free providers (Lovable gateway, Groq), which can be slower or weaker. Raise AI_MONTHLY_BUDGET_USD to lift the cap."
        : "Nothing changes yet. At 100% the paid providers are skipped and the tools run on the free ones until the 1st."}</p>
      ${spendTable(spend)}
      <p style="margin-top:16px;color:#666;font-size:12px">Sent once per month and level by the daily ai-provider-health check. Source: provider_spend_ledger (estimates, not invoices).</p>
    </div>`;
}

function alertEmail(changes: Array<CheckResult & { recovered: boolean }>, all: CheckResult[], spend: MonthSpend | null = null) {
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
      ${spendTable(spend)}
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

    // { "only": ["auth_email"] } runs just those checks (the hourly job).
    const body = await req.json().catch(() => ({}));
    const only: string[] | null = Array.isArray(body?.only) ? body.only.filter((name: unknown) => typeof name === "string") : null;
    const selected = only ? CHECKS.filter((check) => only.includes(check.provider)) : CHECKS;
    const results = await Promise.all(selected.map(runCheck));
    const now = new Date().toISOString();

    // Without the previous state every run would look like a first run and
    // email about every failing provider, so a read failure stops here.
    const { data: previousRows, error: readError } = await admin.from("ai_provider_health").select("provider, ok, failing_since, last_ok_at");
    if (readError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Could not read ai_provider_health, nothing saved or emailed: ${readError.message}`,
        results: results.map(({ provider, ok, configured, message, latencyMs }) => ({ provider, ok, configured, message, latencyMs })),
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
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

    // forceEmail re-sends the current failures, e.g. after an email that did
    // not go out (the state is already saved, so it would not count as a change).
    if (body?.forceEmail === true && changes.length === 0) {
      changes.push(...results.filter((result) => !result.ok).map((result) => ({ ...result, recovered: false })));
    }

    // Spend is reported by the full daily run only.
    const spend = only ? null : await monthSpend(admin);

    let emailed = false;
    let budgetAlert: "warning" | "paused" | null = null;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
    if (changes.length > 0 && resendKey) {
      const recipients = adminRecipients();
      const failing = changes.filter((change) => !change.ok).map((change) => change.provider);
      const recovered = changes.filter((change) => change.recovered).map((change) => change.provider);
      const authEmailFailing = changes.some((change) => change.provider === "auth_email" && !change.ok);
      const subject = authEmailFailing
        ? "URGENT: Signup and password emails are not going out"
        : failing.length
          ? `AI provider failing: ${failing.join(", ")}`
          : `AI provider recovered: ${recovered.join(", ")}`;
      const sent = await new Resend(resendKey).emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: recipients,
        subject,
        html: alertEmail(changes, results, spend),
      });
      emailed = !sent.error;
      if (sent.error) console.error("ai-provider-health email failed:", sent.error);
    }

    // One email per month and level when AI text spend reaches 80% and 100%
    // of AI_MONTHLY_BUDGET_USD (provider_spend_alerts dedupes).
    if (spend && resendKey) {
      const kind = spend.aiUsd >= spend.aiBudgetUsd ? "paused" : spend.aiUsd >= spend.aiBudgetUsd * 0.8 ? "warning" : null;
      if (kind) {
        const { data: fresh } = await admin.from("provider_spend_alerts")
          .upsert({ feature: "AI_TEXT", month: spend.month, kind }, { onConflict: "feature,month,kind", ignoreDuplicates: true })
          .select("kind");
        if (fresh?.length) {
          budgetAlert = kind;
          const sent = await new Resend(resendKey).emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: adminRecipients(),
            subject: kind === "paused" ? "AI spend cap reached: paid providers paused" : "AI spend at 80% of the monthly cap",
            html: budgetEmail(kind, spend),
          });
          if (sent.error) console.error("ai-provider-health budget email failed:", sent.error);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      checkedAt: now,
      results: results.map(({ provider, ok, configured, message, latencyMs }) => ({ provider, ok, configured, message, latencyMs })),
      changes: changes.map((change) => change.provider),
      emailed,
      spend: spend ? { month: spend.month, aiUsd: Number(spend.aiUsd.toFixed(2)), aiBudgetUsd: spend.aiBudgetUsd, byProvider: spend.byProvider.map((entry) => ({ ...entry, usd: Number(entry.usd.toFixed(2)) })) } : null,
      budgetAlert,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("ai-provider-health error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
