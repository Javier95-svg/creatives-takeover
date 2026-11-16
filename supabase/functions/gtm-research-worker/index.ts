/**
 * Drains the research agent's step queue (gtm_research_steps).
 *
 * Called by the one-minute sweeper (pg_cron) and by gtm-research and itself
 * right after work is queued. Service role only. Each step is claimed with a
 * lease, so a crashed or timed-out invocation's step becomes due again; three
 * failed attempts end the step, and a research run then charges only for what
 * it delivered (finalize).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isServiceRoleToken } from "../_shared/service-caller.ts";
import { FinalStepError, notifyRunFinished, STEP_HANDLERS, type ResearchRun, type ResearchStep } from "../_shared/gtm-research-pipeline.ts";
import { kickResearchWorker } from "../_shared/gtm-research-kick.ts";
import { ANALYSIS_STEPS } from "../../../src/lib/gtmResearch.ts";

// Keep claiming steps for about 25 s; a step itself may take up to ~60 s.
const CLAIM_WINDOW_MS = 25_000;
const LEASE_SECONDS = 120;
const BACKOFF_SECONDS = [15, 60, 240];
const MAX_STEPS_PER_RUN = 45;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function enqueue(db: SupabaseClient, run: ResearchRun, steps: Array<{ key: string; batch?: number }>) {
  if (!steps.length) return;
  await db.from("gtm_research_steps").upsert(
    steps.map((step) => ({ run_id: run.id, user_id: run.user_id, key: step.key, batch: step.batch ?? 0 })),
    { onConflict: "run_id,key,batch", ignoreDuplicates: true },
  );
}

async function processStep(db: SupabaseClient, step: ResearchStep): Promise<void> {
  const { data: runRow } = await db.from("gtm_research_runs").select("*").eq("id", step.run_id).single();
  const run = runRow as ResearchRun | null;
  if (!run || ["cancelled", "failed", "completed", "partial"].includes(run.status)) {
    await db.from("gtm_research_steps").update({ status: "skipped", lease_until: null, finished_at: new Date().toISOString() }).eq("id", step.id);
    return;
  }
  if (run.reservation_id) await db.rpc("extend_credit_reservation_v1", { p_reservation_id: run.reservation_id, p_minutes: 30 });
  const isAnalysis = ANALYSIS_STEPS.includes(step.key);

  const { count } = await db.from("gtm_research_steps").select("id", { count: "exact", head: true }).eq("run_id", run.id);
  if ((count ?? 0) > MAX_STEPS_PER_RUN && step.key !== "finalize") {
    await db.from("gtm_research_steps").update({ status: "skipped", log: "Step limit reached", lease_until: null, finished_at: new Date().toISOString() }).eq("id", step.id);
    await enqueue(db, run, [{ key: "finalize" }]);
    return;
  }

  try {
    const outcome = await STEP_HANDLERS[step.key](db, run, step);
    const now = new Date().toISOString();
    await db.from("gtm_research_steps").update({
      status: outcome.status ?? "done", log: outcome.log, detail: outcome.detail ?? {}, error: null,
      lease_until: null, finished_at: now,
    }).eq("id", step.id);
    const runPatch: Record<string, unknown> = { ...(outcome.runPatch ?? {}), updated_at: now };
    if (!isAnalysis && run.status === "queued" && !runPatch.status) runPatch.status = "running";
    await db.from("gtm_research_runs").update(runPatch).eq("id", run.id);
    await enqueue(db, run, outcome.next ?? []);
    if (step.key === "finalize") await notifyRunFinished(db, run, runPatch);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const final = error instanceof FinalStepError || step.attempt >= step.max_attempts;
    console.error("gtm-research step failed", { runId: run.id, key: step.key, batch: step.batch, attempt: step.attempt, final, message });
    if (!final) {
      await db.from("gtm_research_steps").update({
        status: "queued", lease_until: null, error: message.slice(0, 500),
        log: `Taking longer than expected · trying again (attempt ${step.attempt + 1} of ${step.max_attempts})`,
        next_attempt_at: new Date(Date.now() + BACKOFF_SECONDS[Math.min(step.attempt - 1, BACKOFF_SECONDS.length - 1)] * 1000).toISOString(),
      }).eq("id", step.id);
      return;
    }
    const now = new Date().toISOString();
    await db.from("gtm_research_steps").update({
      status: "failed", lease_until: null, finished_at: now, error: message.slice(0, 500),
      log: error instanceof FinalStepError ? message : "This step could not finish",
    }).eq("id", step.id);
    if (step.key === "finalize") {
      // Never keep credits for a run we could not close: release the hold.
      if (run.reservation_id) await db.rpc("finalize_credit_reservation_v1", { p_reservation_id: run.reservation_id, p_charge: 0, p_metadata: { runId: run.id, reason: "finalize_failed" } });
      await db.from("gtm_research_runs").update({ status: "failed", credits_charged: 0, error_code: "FINALIZE_FAILED", error_detail: "We couldn't finish this research. You were not charged.", completed_at: now, updated_at: now }).eq("id", run.id);
    } else if (isAnalysis) {
      await db.from("gtm_research_runs").update({
        status: "failed", error_code: error instanceof FinalStepError ? error.code : "ANALYSIS_FAILED",
        error_detail: error instanceof FinalStepError ? message : "We couldn't finish reading your business. Try again in a few minutes. This step is free.",
        completed_at: now, updated_at: now,
      }).eq("id", run.id);
    } else {
      // Research keeps what it found and charges only for that.
      await enqueue(db, run, [{ key: "finalize" }]);
    }
  }
}

serve(async (req) => {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!isServiceRoleToken(token, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")) return json({ error: "Forbidden" }, 403);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const started = Date.now();
  let processed = 0;
  while (Date.now() - started < CLAIM_WINDOW_MS) {
    const { data, error } = await db.rpc("claim_gtm_research_step_v1", { p_lease_seconds: LEASE_SECONDS });
    if (error) { console.error("gtm-research claim failed", error.message); break; }
    const step = (Array.isArray(data) ? data[0] : data) as ResearchStep | undefined;
    if (!step) break;
    await processStep(db, step);
    processed += 1;
  }
  // More work may be queued: hand over to a fresh invocation instead of waiting a minute.
  if (processed > 0) kickResearchWorker();
  return json({ processed });
});
