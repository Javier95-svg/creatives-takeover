/**
 * GTM Strategist "Find customers": the founder-facing actions of the research
 * agent (docs/gtm-research-agent-plan.md). The work itself runs in
 * gtm-research-worker.
 *
 * Actions (POST JSON, signed-in founder):
 *   analyze  { websiteUrl?, description?, projectId? }  free; reads the site, proposes segments
 *   edit     { runId, profile?, removeCompetitors? }     founder corrections before research
 *   start    { runId, segment, targetCount? }            holds credits, starts research (Idempotency-Key)
 *   cancel   { runId }                                   stops; charges only for what was found
 *
 * Nothing here sends anything to anyone. Prospect status and draft edits are
 * written by the app directly under row level security.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";
import { checkPublicUrl } from "../_shared/public-url-guard.ts";
import { kickResearchWorker } from "../_shared/gtm-research-kick.ts";
import { finalizeRun, type ResearchRun } from "../_shared/gtm-research-pipeline.ts";
import { RESEARCH_RUN_CREDITS, sanitizeSegment, type BusinessProfile } from "../../../src/lib/gtmResearch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ANALYSES_PER_DAY = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const monthlyBudgetUsd = () => Number(Deno.env.get("GTM_RESEARCH_MONTHLY_BUDGET_USD") ?? "80") || 80;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await getUserFromAuth(req);
  if (!user) return json({ error: "Sign in to research customers." }, 401);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  // The caller's own client, for RPCs that act as the signed-in founder.
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const action = body.action;

  // Third-party spend this month across all founders: research pauses before
  // it passes the budget, rather than after.
  const withinBudget = async () => {
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
    const { data } = await db.from("provider_spend_ledger").select("est_cost_usd").eq("feature", "GTM_RESEARCH").gte("created_at", monthStart);
    const spent = (data ?? []).reduce((sum, row) => sum + Number(row.est_cost_usd ?? 0), 0);
    return spent < monthlyBudgetUsd();
  };

  const loadRun = async (runId: unknown) => {
    if (typeof runId !== "string" || !UUID.test(runId)) return null;
    const { data } = await db.from("gtm_research_runs").select("*").eq("id", runId).eq("user_id", user.id).maybeSingle();
    return data as ResearchRun | null;
  };

  try {
    if (action === "analyze") {
      const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl.trim().slice(0, 500) : "";
      const description = typeof body.description === "string" ? body.description.trim().slice(0, 2_000) : "";
      if (!websiteUrl && description.length < 20) return json({ error: "Add your website, or describe your product in a sentence or two." }, 400);
      if (websiteUrl) {
        const check = checkPublicUrl(websiteUrl);
        if (!check.ok) return json({ error: check.reason }, 400);
      }
      const projectId = typeof body.projectId === "string" && UUID.test(body.projectId) ? body.projectId : null;
      if (projectId) {
        const { data: project } = await db.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
        if (!project) return json({ error: "That project was not found." }, 404);
      }
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { count } = await db.from("gtm_research_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
      if ((count ?? 0) >= ANALYSES_PER_DAY) return json({ error: `You can start ${ANALYSES_PER_DAY} analyses a day. Try again tomorrow.`, errorCode: "RATE_LIMITED" }, 429);
      if (!(await withinBudget())) return json({ error: "Customer research is paused for the rest of the month while we add capacity. Nothing was charged.", errorCode: "BUDGET_PAUSED" }, 503);

      const { data: run, error } = await db.from("gtm_research_runs").insert({
        user_id: user.id, project_id: projectId, status: "analyzing",
        input: { websiteUrl: websiteUrl || undefined, description: description || undefined },
        gtm_plan_id: typeof body.planId === "string" && UUID.test(body.planId) ? body.planId : null,
        play_id: typeof body.playId === "string" ? body.playId.slice(0, 100) : null,
      }).select("id").single();
      if (error || !run) throw new Error(error?.message ?? "Could not create the research run");
      await db.from("gtm_research_steps").insert({ run_id: run.id, user_id: user.id, key: "read_site" });
      kickResearchWorker();
      return json({ runId: run.id });
    }

    if (action === "edit") {
      const run = await loadRun(body.runId);
      if (!run) return json({ error: "Research not found." }, 404);
      if (run.status !== "needs_review") return json({ error: "This research can no longer be edited." }, 409);
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.profile && typeof body.profile === "object" && run.business_profile) {
        const edits = body.profile as Record<string, unknown>;
        const next: BusinessProfile = structuredClone(run.business_profile);
        for (const field of ["offering", "audience", "valueProposition"] as const) {
          if (typeof edits[field] === "string" && edits[field]) next[field] = { text: (edits[field] as string).slice(0, 400), sourceUrl: null };
        }
        if (typeof edits.geography === "string") next.geography = edits.geography.slice(0, 120);
        patch.business_profile = next;
      }
      if (Array.isArray(body.removeCompetitors)) {
        const remove = new Set(body.removeCompetitors.filter((value): value is string => typeof value === "string"));
        patch.competitors = run.competitors.filter((competitor) => !remove.has(competitor.domain));
      }
      await db.from("gtm_research_runs").update(patch).eq("id", run.id);
      return json({ ok: true });
    }

    if (action === "start") {
      const idempotencyKey = (req.headers.get("Idempotency-Key") ?? "").trim().slice(0, 200);
      if (!idempotencyKey) return json({ error: "Missing Idempotency-Key." }, 400);
      const run = await loadRun(body.runId);
      if (!run) return json({ error: "Research not found." }, 404);
      if (["queued", "running", "partial", "completed"].includes(run.status)) return json({ runId: run.id, replayed: true });
      if (run.status !== "needs_review") return json({ error: "Read your business first." }, 409);
      const segment = sanitizeSegment(body.segment);
      if (!segment) return json({ error: "Choose who to target, with at least one must-have criterion." }, 400);
      const targetCount = Math.max(5, Math.min(Number(body.targetCount) || 20, 20));
      if (!(await withinBudget())) return json({ error: "Customer research is paused for the rest of the month while we add capacity. Nothing was charged.", errorCode: "BUDGET_PAUSED" }, 503);

      // First research run on an account is free; every other run holds the
      // full price and is charged only for what it delivers.
      const { data: gifted } = await asUser.rpc("claim_first_use_gift", { p_feature: "GTM_RESEARCH_RUN" });
      let reservationId: string | null = null;
      if (gifted !== true) {
        const { data: hold, error: holdError } = await db.rpc("reserve_credits_v1", {
          p_user_id: user.id, p_feature: "GTM_RESEARCH_RUN", p_amount: RESEARCH_RUN_CREDITS,
          p_idempotency_key: `gtm-research:${idempotencyKey}`, p_metadata: { runId: run.id }, p_ttl_minutes: 30,
        });
        if (holdError) throw new Error(holdError.message);
        if (!hold?.success) {
          return json({
            error: hold?.errorCode === "INSUFFICIENT_CREDITS" ? `Research needs ${RESEARCH_RUN_CREDITS} credits.` : "Credits could not be held.",
            creditError: true, errorCode: hold?.errorCode ?? "DEDUCTION_FAILED", requiredCredits: RESEARCH_RUN_CREDITS,
          }, 402);
        }
        reservationId = hold.reservationId;
      }
      const now = new Date().toISOString();
      const { error: updateError } = await db.from("gtm_research_runs").update({
        status: "queued", selected_segment: segment, target_count: targetCount, reservation_id: reservationId,
        credits_reserved: reservationId ? RESEARCH_RUN_CREDITS : 0, gifted: gifted === true, idempotency_key: idempotencyKey,
        started_at: now, updated_at: now,
      }).eq("id", run.id).eq("status", "needs_review");
      if (updateError) {
        if (reservationId) await db.rpc("finalize_credit_reservation_v1", { p_reservation_id: reservationId, p_charge: 0, p_metadata: { reason: "start_failed" } });
        throw new Error(updateError.message);
      }
      await db.from("gtm_research_steps").upsert({ run_id: run.id, user_id: user.id, key: "discover_companies", batch: 0 }, { onConflict: "run_id,key,batch", ignoreDuplicates: true });
      kickResearchWorker();
      return json({ runId: run.id, gifted: gifted === true, creditsHeld: reservationId ? RESEARCH_RUN_CREDITS : 0 });
    }

    if (action === "cancel") {
      const run = await loadRun(body.runId);
      if (!run) return json({ error: "Research not found." }, 404);
      if (["cancelled", "failed", "partial", "completed"].includes(run.status)) return json({ status: run.status });
      await db.from("gtm_research_steps").update({ status: "skipped", lease_until: null, finished_at: new Date().toISOString() })
        .eq("run_id", run.id).in("status", ["queued", "running"]);
      let charged = 0;
      if (["queued", "running"].includes(run.status)) {
        const outcome = await finalizeRun(db, run);
        charged = Number(outcome.runPatch?.credits_charged ?? 0);
        await db.from("gtm_research_runs").update({ ...outcome.runPatch, status: "cancelled", updated_at: new Date().toISOString() }).eq("id", run.id);
      } else {
        await db.from("gtm_research_runs").update({ status: "cancelled", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", run.id);
      }
      return json({ status: "cancelled", creditsCharged: charged });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("gtm-research failed", { action, message: error instanceof Error ? error.message : error });
    return json({ error: "Something went wrong. Nothing was charged for this action." }, 500);
  }
});
