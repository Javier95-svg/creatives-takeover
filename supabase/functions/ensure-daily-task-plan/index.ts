import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: corsHeaders });

type PlanItem = {
  rank: number;
  task: {
    id: string;
    is_completed?: boolean | null;
    recommendation_key?: string | null;
    task_text: string;
    recommendation_reason?: string | null;
    priority?: string | null;
    source_tool?: string | null;
    estimated_minutes?: number | null;
    business_impact_score?: number | null;
    stage_alignment_score?: number | null;
  };
};

type PlanPayload = {
  plan: {
    id: string;
    plan_date: string;
    context_hash?: string | null;
    context_snapshot?: Record<string, unknown> | null;
    model?: string | null;
    fallback_used?: boolean | null;
    user_reordered_at?: string | null;
  };
  items: PlanItem[];
};

function parseOrder(value: unknown, items: PlanItem[]): string[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const order = (value as Record<string, unknown>).orderedTaskIds;
  if (!Array.isArray(order)) return null;
  const allowed = new Set(items.map((item) => item.task.id));
  const ids = order.filter((id): id is string => typeof id === "string" && allowed.has(id));
  return new Set(ids).size === items.length ? ids : null;
}

// Work the founder does not need to wait for runs after the response is sent.
function afterResponse(work: Promise<unknown>) {
  const edgeRuntime = (globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
  }).EdgeRuntime;
  const settled = work.catch((error) => console.error("ensure-daily-task-plan background work failed", error));
  if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(settled);
}

async function rankWithAi(items: PlanItem[], context: Record<string, unknown>) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key || items.length < 2) return null;
  const model = Deno.env.get("TASK_PLAN_RANKING_MODEL") || "gemini-3.1-flash-lite";
  const controller = new AbortController();
  // Ranking runs after the response, so it can wait for a slow model reply.
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Rank only the supplied founder task IDs by urgent human commitments, impact, current goal/stage relevance, then effort fit. Never invent, remove, or alter a task. Return JSON: {orderedTaskIds:[...]}",
          },
          {
            role: "user",
            content: JSON.stringify({
              context,
              tasks: items.map(({ task }) => ({
                id: task.id,
                key: task.recommendation_key,
                title: task.task_text,
                reason: task.recommendation_reason,
                priority: task.priority,
                tool: task.source_tool,
                minutes: task.estimated_minutes,
                impact: task.business_impact_score,
                stageAlignment: task.stage_alignment_score,
              })),
            }),
          },
        ],
      }),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const content = body?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    const orderedTaskIds = parseOrder(parsed, items);
    return orderedTaskIds ? { orderedTaskIds, model } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(authorization.slice(7));
  if (authError || !authData.user) return json({ error: "Invalid authentication" }, 401);

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const timezone = typeof body.timezone === "string" ? body.timezone.slice(0, 80) : "UTC";
  const additional = body.additional === true;
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data, error } = await userClient.rpc("get_today_task_plan_v1", {
    p_timezone: timezone,
    p_additional: additional,
  });
  if (error || !data) return json({ error: error?.message || "Unable to prepare task plan" }, 500);

  const payload = data as unknown as PlanPayload;
  // Rank each plan once, after the response: the founder gets today's plan in
  // its deterministic order straight away and the ranked order on their next
  // load. Production calls took 5 to 9 seconds while the ranking (up to 2.5s)
  // and the bookkeeping below ran first. A new plan is "deterministic-v1";
  // the attempt marks it "+ai-pending" so a second load does not start another,
  // then records the ranking model or that the AI was unavailable. A plan the
  // founder reordered by hand is never re-ranked.
  const needsRanking = !additional
    && !payload.plan.user_reordered_at
    && (payload.plan.model ?? "deterministic-v1") === "deterministic-v1"
    && payload.items.length >= 2;
  if (needsRanking) {
    const planId = payload.plan.id;
    const items = payload.items;
    const context = payload.plan.context_snapshot ?? {};
    afterResponse((async () => {
      await admin.from("daily_task_plans").update({ model: "deterministic-v1+ai-pending" }).eq("id", planId);
      const ranked = await rankWithAi(items, context);
      const reordered = ranked
        ? await userClient.rpc("reorder_today_task_plan_v1", {
          p_task_ids: ranked.orderedTaskIds,
          p_timezone: timezone,
          p_record_user_action: false,
        })
        : null;
      const applied = Boolean(ranked && reordered && !reordered.error && reordered.data);
      await admin.from("daily_task_plans").update({
        model: applied ? ranked!.model : "deterministic-v1+ai-unavailable",
        ...(applied ? { fallback_used: false } : {}),
        updated_at: new Date().toISOString(),
      }).eq("id", planId);
    })());
  }

  const candidates = payload.items.map((item) => ({
    key: item.task.recommendation_key || item.task.id,
    toolKey: item.task.source_tool || "tasks",
    urgency: item.task.priority || "medium",
    estimatedMinutes: item.task.estimated_minutes || 15,
  }));
  const aiRanked = !String(payload.plan.model ?? "deterministic-v1").startsWith("deterministic-v1");
  const decisionKeys = payload.items.map((item) => `task_plan:${String(payload.plan.plan_date)}:${item.task.id}`);
  // Exposure bookkeeping for the recommendation log; nothing in the response
  // depends on it.
  afterResponse((async () => {
    const existingDecisions = await admin.from("recommendation_decisions")
      .select("decision_key,exposure_count")
      .eq("user_id", authData.user.id)
      .in("decision_key", decisionKeys);
    const exposureCounts = new Map((existingDecisions.data ?? []).map((decision) => [
      decision.decision_key,
      Number(decision.exposure_count ?? 0),
    ]));
    await Promise.all(payload.items.map((item) => admin.from("recommendation_decisions").upsert({
      user_id: authData.user.id,
      decision_key: `task_plan:${String(payload.plan.plan_date)}:${item.task.id}`,
      surface: "task_plan",
      snapshot_hash: String(payload.plan.context_hash ?? ""),
      candidate_set: candidates,
      selected_key: item.task.recommendation_key || item.task.id,
      selected_tool_key: item.task.source_tool || "tasks",
      deterministic_key: payload.items[0]?.task.recommendation_key || payload.items[0]?.task.id,
      policy_version: "task_plan_hybrid_v1",
      assignment: aiRanked ? "learned" : "baseline",
      model: payload.plan.model || "deterministic-v1",
      context_segments: payload.plan.context_snapshot || {},
      score_diagnostics: { taskCount: payload.items.length, aiRanked, rank: item.rank },
      last_shown_at: new Date().toISOString(),
      exposure_count: (exposureCounts.get(`task_plan:${String(payload.plan.plan_date)}:${item.task.id}`) ?? 0) + 1,
    }, { onConflict: "user_id,decision_key" })));
  })());

  return json(payload);
});
