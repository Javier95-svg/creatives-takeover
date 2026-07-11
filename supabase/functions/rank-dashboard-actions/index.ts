import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const MAX_CANDIDATES = 10;
const MAX_RATIONALE_LENGTH = 180;

interface Candidate {
  key: string;
  urgency: "high" | "medium" | "low";
  reasonCodes: string[];
  estimatedMinutes: number;
  toolKey: string;
}

function parseCandidates(value: unknown): Candidate[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_CANDIDATES).flatMap((item): Candidate[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    if (typeof row.key !== "string" || typeof row.toolKey !== "string") return [];
    const urgency = row.urgency === "high" || row.urgency === "low" ? row.urgency : "medium";
    return [{
      key: row.key.slice(0, 160),
      toolKey: row.toolKey.slice(0, 80),
      urgency,
      reasonCodes: Array.isArray(row.reasonCodes)
        ? row.reasonCodes.filter((entry): entry is string => typeof entry === "string").slice(0, 8)
        : [],
      estimatedMinutes: Math.max(1, Math.min(240, Number(row.estimatedMinutes) || 15)),
    }];
  });
}

function validateRanking(
  value: unknown,
  candidates: Candidate[],
): { orderedCandidateKeys: string[]; rationaleByKey: Record<string, string> } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.orderedCandidateKeys)) return null;

  const allowed = new Set(candidates.map((candidate) => candidate.key));
  const ordered = payload.orderedCandidateKeys.filter(
    (key): key is string => typeof key === "string" && allowed.has(key),
  );
  const unique = [...new Set(ordered)];
  if (unique.length !== candidates.length) return null;

  const rawRationales = payload.rationaleByKey;
  const rationaleByKey: Record<string, string> = {};
  if (rawRationales && typeof rawRationales === "object" && !Array.isArray(rawRationales)) {
    for (const [key, rationale] of Object.entries(rawRationales as Record<string, unknown>)) {
      if (allowed.has(key) && typeof rationale === "string") {
        rationaleByKey[key] = rationale.slice(0, MAX_RATIONALE_LENGTH);
      }
    }
  }

  return { orderedCandidateKeys: unique, rationaleByKey };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await supabase.auth.getUser(authHeader.slice("Bearer ".length));
  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: "Invalid authentication" }), { status: 401, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const snapshotHash = typeof body.snapshotHash === "string" ? body.snapshotHash.slice(0, 128) : "";
  const candidates = parseCandidates(body.candidates);
  if (!snapshotHash || candidates.length < 2) {
    return new Response(JSON.stringify({ error: "snapshotHash and at least two valid candidates are required" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { data: cached } = await supabase
    .from("dashboard_ranking_cache")
    .select("snapshot_hash, ordered_candidate_keys, rationale_by_key, model, generated_at, expires_at")
    .eq("user_id", authData.user.id)
    .eq("snapshot_hash", snapshotHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) {
    return new Response(JSON.stringify({
      orderedCandidateKeys: cached.ordered_candidate_keys,
      rationaleByKey: cached.rationale_by_key,
      model: cached.model,
      generatedAt: cached.generated_at,
      cached: true,
    }), { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ fallback: true, reason: "ranking_model_unavailable" }), {
      status: 503,
      headers: corsHeaders,
    });
  }

  const model = Deno.env.get("DASHBOARD_RANKING_MODEL") || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Rank only the supplied founder action keys. Prefer deadlines, waiting human replies, commitments, stage blockers, stale signals, then optional growth. Return JSON with orderedCandidateKeys and rationaleByKey. Never invent or omit a key.",
          },
          { role: "user", content: JSON.stringify({ candidates }) },
        ],
      }),
    });

    if (!response.ok) throw new Error(`Ranking model returned ${response.status}`);
    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    const ranking = validateRanking(parsed, candidates);
    if (!ranking) throw new Error("Ranking model returned an invalid candidate set");

    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + 24 * 60 * 60 * 1000);
    await supabase.from("dashboard_ranking_cache").upsert({
      user_id: authData.user.id,
      snapshot_hash: snapshotHash,
      ordered_candidate_keys: ranking.orderedCandidateKeys,
      rationale_by_key: ranking.rationaleByKey,
      model,
      generated_at: generatedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    return new Response(JSON.stringify({ ...ranking, model, generatedAt: generatedAt.toISOString(), cached: false }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.warn("Dashboard ranking fell back to deterministic order", error);
    return new Response(JSON.stringify({ fallback: true, reason: "ranking_failed" }), {
      status: 503,
      headers: corsHeaders,
    });
  } finally {
    clearTimeout(timeout);
  }
});
