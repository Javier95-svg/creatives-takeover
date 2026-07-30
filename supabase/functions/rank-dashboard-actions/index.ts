import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_POLICY = "collective_v1";
const MAX_CANDIDATES = 10;
const MAX_RATIONALE_LENGTH = 180;

interface Candidate {
  key: string;
  urgency: "high" | "medium" | "low";
  reasonCodes: string[];
  estimatedMinutes: number;
  toolKey: string;
}

interface PolicyConfig {
  active_policy_version: string;
  status: "collecting" | "active" | "paused";
  holdout_percent: number;
  exploration_percent: number;
  min_segment_samples: number;
}

interface PriorRow {
  segment_key: string;
  recommendation_family: string;
  matured_exposures: number;
  smoothed_score: number;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders });
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parseCandidates(value: unknown): Candidate[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();

  return value.slice(0, MAX_CANDIDATES).flatMap((item): Candidate[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    if (typeof row.key !== "string" || typeof row.toolKey !== "string" || seen.has(row.key)) return [];
    seen.add(row.key);
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

function contextSegmentKeys(context: Record<string, unknown>): string[] {
  const stage = String(context.stage ?? "unknown");
  const goal = String(context.goal ?? "unknown");
  const blocker = String(context.blocker ?? "unknown");
  const capacity = String(context.capacityBand ?? "unknown");
  const plan = String(context.plan ?? "rookie");
  return [
    "global",
    `stage:${stage}`,
    `stage:${stage}|goal:${goal}`,
    `stage:${stage}|goal:${goal}|blocker:${blocker}`,
    `stage:${stage}|goal:${goal}|blocker:${blocker}|capacity:${capacity}|plan:${plan}`,
  ];
}

function resolveAssignment(
  userId: string,
  snapshotHash: string,
  config: PolicyConfig,
): "control" | "learned" | "explore" {
  if (stableHash(`${userId}:${config.active_policy_version}:holdout`) % 100 < config.holdout_percent) {
    return "control";
  }
  if (
    config.status === "active"
    && stableHash(`${userId}:${snapshotHash}:${new Date().toISOString().slice(0, 10)}:explore`) % 100
      < config.exploration_percent
  ) {
    return "explore";
  }
  return "learned";
}

function bestPriorByFamily(
  rows: PriorRow[],
  segmentKeys: string[],
): Map<string, { score: number; samples: number; segment: string }> {
  const specificity = new Map(segmentKeys.map((key, index) => [key, index]));
  const best = new Map<string, { score: number; samples: number; segment: string }>();
  for (const row of rows) {
    const current = best.get(row.recommendation_family);
    const rowSpecificity = specificity.get(row.segment_key) ?? -1;
    const currentSpecificity = current ? specificity.get(current.segment) ?? -1 : -1;
    if (!current || rowSpecificity > currentSpecificity) {
      best.set(row.recommendation_family, {
        score: Number(row.smoothed_score) || 0,
        samples: Number(row.matured_exposures) || 0,
        segment: row.segment_key,
      });
    }
  }
  return best;
}

async function aiBaseRanking(
  candidates: Candidate[],
): Promise<{ orderedCandidateKeys: string[]; rationaleByKey: Record<string, string>; model: string } | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || candidates.length < 2) return null;

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
            content:
              "Rank only the supplied founder action keys. Prefer deadlines, waiting human replies, commitments, stage blockers, stale signals, then optional growth. Return JSON with orderedCandidateKeys and rationaleByKey. Never invent or omit a key.",
          },
          { role: "user", content: JSON.stringify({ candidates }) },
        ],
      }),
    });
    if (!response.ok) return null;
    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    const ranking = validateRanking(parsed, candidates);
    return ranking ? { ...ranking, model } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await supabase.auth.getUser(authHeader.slice("Bearer ".length));
  if (authError || !authData.user) return jsonResponse({ error: "Invalid authentication" }, 401);

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const snapshotHash = typeof body.snapshotHash === "string" ? body.snapshotHash.slice(0, 128) : "";
  const allowAi = body.allowAi === true;
  const originalCandidates = parseCandidates(body.candidates);
  if (!snapshotHash || originalCandidates.length < 1) {
    return jsonResponse({ error: "snapshotHash and at least one valid candidate are required" }, 400);
  }

  const [{ data: configRow }, { data: contextRow }, { data: suppressions }] = await Promise.all([
    supabase.from("recommendation_policy_config").select("*").eq("singleton", true).maybeSingle(),
    supabase.rpc("get_recommendation_context_v1", { p_user: authData.user.id }),
    supabase
      .from("recommendation_user_suppressions")
      .select("scope_key,recommendation_key,recommendation_family,reason,suppressed_until")
      .eq("user_id", authData.user.id)
      .gt("suppressed_until", new Date().toISOString()),
  ]);

  const config: PolicyConfig = {
    active_policy_version: configRow?.active_policy_version || DEFAULT_POLICY,
    status: configRow?.status === "active" || configRow?.status === "paused" ? configRow.status : "collecting",
    holdout_percent: Number(configRow?.holdout_percent) || 10,
    exploration_percent: Number(configRow?.exploration_percent) || 5,
    min_segment_samples: Number(configRow?.min_segment_samples) || 20,
  };
  const context = contextRow && typeof contextRow === "object" && !Array.isArray(contextRow)
    ? contextRow as Record<string, unknown>
    : {};
  const suppressedScopes = new Set((suppressions ?? []).map((row) => row.scope_key));
  const suppressedKeys = originalCandidates
    .filter((candidate) =>
      suppressedScopes.has(`key:${candidate.key}`)
      || suppressedScopes.has(`family:${candidate.toolKey}`)
    )
    .map((candidate) => candidate.key);
  const unsuppressed = originalCandidates.filter((candidate) => !suppressedKeys.includes(candidate.key));
  const candidatePool = unsuppressed.length > 0 ? unsuppressed : [originalCandidates[0]];
  const urgencyWeight = { high: 3, medium: 2, low: 1 } as const;
  const highestUrgency = Math.max(...candidatePool.map((candidate) => urgencyWeight[candidate.urgency]));
  const candidates = candidatePool.filter((candidate) => urgencyWeight[candidate.urgency] === highestUrgency);
  const deterministicKey = candidates[0].key;
  const assignment = resolveAssignment(authData.user.id, snapshotHash, config);
  const segmentKeys = contextSegmentKeys(context);

  const { data: cached } = await supabase
    .from("dashboard_ranking_cache")
    .select("snapshot_hash,ordered_candidate_keys,rationale_by_key,model,generated_at,expires_at,policy_version,assignment,deterministic_key,score_diagnostics,context_segments,suppressed_keys")
    .eq("user_id", authData.user.id)
    .eq("snapshot_hash", snapshotHash)
    .eq("policy_version", config.active_policy_version)
    .eq("assignment", assignment)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  const cachedSuppressedKeys = Array.isArray(cached?.suppressed_keys)
    ? cached.suppressed_keys.filter((key): key is string => typeof key === "string")
    : [];
  const suppressionStateMatches = cachedSuppressedKeys.length === suppressedKeys.length
    && cachedSuppressedKeys.every((key, index) => key === suppressedKeys[index]);

  if (cached && suppressionStateMatches) {
    return jsonResponse({
      orderedCandidateKeys: cached.ordered_candidate_keys,
      rationaleByKey: cached.rationale_by_key,
      model: cached.model,
      generatedAt: cached.generated_at,
      cached: true,
      policyVersion: cached.policy_version,
      assignment: cached.assignment,
      deterministicKey: cached.deterministic_key,
      scoreDiagnostics: cached.score_diagnostics,
      contextSegments: cached.context_segments,
      suppressedKeys: cached.suppressed_keys,
    });
  }

  const aiRanking = assignment === "control" || !allowAi ? null : await aiBaseRanking(candidates);
  const baseOrder = aiRanking?.orderedCandidateKeys ?? candidates.map((candidate) => candidate.key);
  const rationaleByKey = aiRanking?.rationaleByKey ?? {};
  const families = [...new Set(candidates.map((candidate) => candidate.toolKey))];
  const { data: priorRows } = config.status === "active" && assignment !== "control"
    ? await supabase
      .from("recommendation_segment_priors")
      .select("segment_key,recommendation_family,matured_exposures,smoothed_score")
      .eq("policy_version", config.active_policy_version)
      .eq("eligible", true)
      .in("segment_key", segmentKeys)
      .in("recommendation_family", families)
    : { data: [] as PriorRow[] };
  const priorByFamily = bestPriorByFamily((priorRows ?? []) as PriorRow[], segmentKeys);
  const diagnostics: Record<string, unknown> = {};

  let orderedCandidateKeys = [...baseOrder];
  if (config.status === "active" && assignment === "learned" && priorByFamily.size > 0) {
    orderedCandidateKeys = [...candidates]
      .map((candidate) => {
        const baseIndex = baseOrder.indexOf(candidate.key);
        const baseScore = 1 - Math.max(0, baseIndex) / Math.max(1, candidates.length);
        const prior = priorByFamily.get(candidate.toolKey);
        const score = baseScore * 0.35 + (prior?.score ?? 0) * 0.65;
        diagnostics[candidate.key] = {
          score: Number(score.toFixed(6)),
          baseScore: Number(baseScore.toFixed(6)),
          learnedScore: prior?.score ?? null,
          samples: prior?.samples ?? 0,
          segment: prior?.segment ?? null,
        };
        return { key: candidate.key, score };
      })
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.key);
  } else {
    for (const [index, key] of baseOrder.entries()) {
      diagnostics[key] = { baseRank: index + 1, learnedScore: null, samples: 0 };
    }
  }

  if (assignment === "explore" && orderedCandidateKeys.length > 1) {
    const alternateIndex = 1 + stableHash(`${authData.user.id}:${snapshotHash}:alternate`) % Math.min(2, orderedCandidateKeys.length - 1);
    const [alternate] = orderedCandidateKeys.splice(alternateIndex, 1);
    orderedCandidateKeys.unshift(alternate);
    diagnostics.exploration = { selectedAlternateRank: alternateIndex + 1, cappedPercent: config.exploration_percent };
  }

  const generatedAt = new Date();
  const expiresAt = new Date(generatedAt.getTime() + 24 * 60 * 60 * 1000);
  const model = aiRanking?.model ?? (config.status === "active" ? "collective-priors-v1" : "deterministic-v1");
  await supabase.from("dashboard_ranking_cache").upsert({
    user_id: authData.user.id,
    snapshot_hash: snapshotHash,
    ordered_candidate_keys: orderedCandidateKeys,
    rationale_by_key: rationaleByKey,
    model,
    generated_at: generatedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    policy_version: config.active_policy_version,
    assignment,
    deterministic_key: deterministicKey,
    score_diagnostics: diagnostics,
    context_segments: context,
    suppressed_keys: suppressedKeys,
  });

  return jsonResponse({
    orderedCandidateKeys,
    rationaleByKey,
    model,
    generatedAt: generatedAt.toISOString(),
    cached: false,
    policyVersion: config.active_policy_version,
    assignment,
    deterministicKey,
    scoreDiagnostics: diagnostics,
    contextSegments: context,
    suppressedKeys,
  });
});
