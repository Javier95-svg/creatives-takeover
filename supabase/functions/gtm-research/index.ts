/**
 * GTM Strategist "Find customers": the founder-facing actions of the research
 * agent (docs/gtm-research-agent-plan.md). The work itself runs in
 * gtm-research-worker.
 *
 * Actions (POST JSON, signed-in founder):
 *   analyze      { websiteUrl?, description?, projectId? }  free; reads the site, proposes segments
 *   retry        { runId }                                   resumes a failed (free) analysis from its failed step
 *   edit         { runId, profile?, removeCompetitors? }     founder corrections before research
 *   start        { runId, segment, targetCount? }            holds credits, starts research (Idempotency-Key)
 *   cancel       { runId }                                   stops; charges only for what was found
 *   more         { runId }                                   +10 companies, same search (Idempotency-Key)
 *   similar      { runId, seedDomains? }                     companies like the shortlisted ones (Idempotency-Key)
 *   rerun        { runId }                                   free once, when most results were rejected with a reason
 *   branch       { runId }                                   another target group from the same analysis
 *   auto_refresh { runId, enabled }                          weekly check for new companies
 *   find_contact { prospectId }                              a named decision-maker (contact-data provider; Idempotency-Key)
 *   find_contacts { runId }                                  named people for up to 10 strong and good fits (Idempotency-Key)
 *
 * Service only (cron): refresh_due — starts the weekly checks that are due.
 *
 * Nothing here sends anything to anyone. Prospect status and draft edits are
 * written by the app directly under row level security.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";
import { checkPublicUrl } from "../_shared/public-url-guard.ts";
import { isServiceRoleToken } from "../_shared/service-caller.ts";
import { sendAdminEmail } from "../_shared/admin-alert.ts";
import { kickResearchWorker } from "../_shared/gtm-research-kick.ts";
import { finalizeRun, type ResearchRun } from "../_shared/gtm-research-pipeline.ts";
import {
  CONTACT_FIND_CREDITS, emailStatusFromVerifier, FOLLOW_UP_TARGET, parseDomainSearchPeople, pickDecisionMaker, RESEARCH_RUN_CREDITS,
  registrableDomain, rerunEligible, runPrice, sanitizeSegment, type BusinessProfile, type FitTier, type ResearchRunKind,
} from "../../../src/lib/gtmResearch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ANALYSES_PER_DAY = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFRESH_EVERY_MS = 6.5 * 86_400_000;
const REFRESHES_PER_SWEEP = 25;
// Rough cost of one decision-maker lookup (domain search + verification) for
// the spend ledger; refine from the provider's invoices.
const CONTACT_LOOKUP_COST_USD = 0.06;
const monthlyBudgetUsd = () => Number(Deno.env.get("GTM_RESEARCH_MONTHLY_BUDGET_USD") ?? "80") || 80;
const PLAN_REQUIRED = {
  error: "Contact details are on the Rising plan (the best half of each search) and the Pro plan (every lead).",
  errorCode: "PLAN_UPGRADE_REQUIRED",
};
const PAUSED = { error: "Customer research is paused for the rest of the month while we add capacity. Nothing was charged.", errorCode: "BUDGET_PAUSED" };

type Run = ResearchRun & { gtm_plan_id: string | null; play_id: string | null; rerun_used: boolean; last_refreshed_at: string | null };

/**
 * Third-party spend this month across all founders: research pauses before it
 * passes the budget. The team gets one email at 80% and one when it pauses.
 */
async function withinBudget(db: SupabaseClient): Promise<boolean> {
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const { data } = await db.from("provider_spend_ledger").select("est_cost_usd").eq("feature", "GTM_RESEARCH").gte("created_at", month.toISOString());
  const spent = (data ?? []).reduce((sum, row) => sum + Number(row.est_cost_usd ?? 0), 0);
  const budget = monthlyBudgetUsd();
  const kind = spent >= budget ? "paused" : spent >= budget * 0.8 ? "warning" : null;
  if (kind) {
    const { data: fresh } = await db.from("provider_spend_alerts")
      .upsert({ feature: "GTM_RESEARCH", month: month.toISOString().slice(0, 10), kind }, { onConflict: "feature,month,kind", ignoreDuplicates: true })
      .select("kind");
    if (fresh?.length) {
      await sendAdminEmail(kind === "paused" ? "Customer research paused: monthly budget reached" : "Customer research at 80% of its monthly budget", [
        `Estimated third-party spend this month: $${spent.toFixed(2)} of $${budget.toFixed(2)} (GTM_RESEARCH_MONTHLY_BUDGET_USD).`,
        kind === "paused"
          ? "New analyses, research runs and contact lookups are refused until the 1st, or until the budget is raised. Runs already started finish."
          : "Research keeps running. It pauses new work at 100%.",
        "Source: provider_spend_ledger (estimates, not invoices).",
      ]).catch((error) => console.error("gtm-research budget alert failed", error));
    }
  }
  return spent < budget;
}

async function ledger(db: SupabaseClient, runId: string | null, provider: string, estCostUsd: number) {
  await db.from("provider_spend_ledger").insert({ feature: "GTM_RESEARCH", provider, run_id: runId, est_cost_usd: estCostUsd });
}

async function hold(db: SupabaseClient, userId: string, feature: string, amount: number, key: string, metadata: Record<string, unknown>) {
  const { data, error } = await db.rpc("reserve_credits_v1", {
    p_user_id: userId, p_feature: feature, p_amount: amount, p_idempotency_key: key, p_metadata: metadata, p_ttl_minutes: 30,
  });
  if (error) throw new Error(error.message);
  return data as { success: boolean; reservationId?: string; errorCode?: string };
}

const release = (db: SupabaseClient, reservationId: string, reason: string) =>
  db.rpc("finalize_credit_reservation_v1", { p_reservation_id: reservationId, p_charge: 0, p_metadata: { reason } });

const creditFailure = (errorCode: string | undefined, credits: number) => json({
  error: errorCode === "INSUFFICIENT_CREDITS" ? `This needs ${credits} credit${credits === 1 ? "" : "s"}.` : "Credits could not be held.",
  creditError: true, errorCode: errorCode ?? "DEDUCTION_FAILED", requiredCredits: credits,
}, 402);

/** A run that adds companies to an earlier search, reusing its analysis and target group. */
async function createFollowUp(db: SupabaseClient, root: Run, kind: ResearchRunKind, options: {
  reservationId: string | null; gifted: boolean; targetCount: number; seedDomains?: string[]; idempotencyKey?: string | null;
}): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await db.from("gtm_research_runs").insert({
    user_id: root.user_id, project_id: root.project_id, gtm_plan_id: root.gtm_plan_id, play_id: root.play_id,
    status: "queued", kind, parent_run_id: root.id, input: root.input, business_profile: root.business_profile,
    competitors: root.competitors, segments: root.segments, selected_segment: root.selected_segment,
    target_count: options.targetCount, counts: { ownDomain: root.counts.ownDomain ?? null },
    reservation_id: options.reservationId, credits_reserved: options.reservationId ? runPrice(kind).credits : 0,
    gifted: options.gifted, seed_domains: options.seedDomains ?? [], idempotency_key: options.idempotencyKey ?? null,
    started_at: now, updated_at: now,
  }).select("id").single();
  if (error || !data) {
    if (options.reservationId) await release(db, options.reservationId, "follow_up_failed");
    throw new Error(error?.message ?? "Could not create the follow-up run");
  }
  await db.from("gtm_research_steps").insert({ run_id: data.id, user_id: root.user_id, key: "discover_companies", batch: 0 });
  return data.id as string;
}

interface ProspectForContact { id: string; run_id: string | null; domain: string; suggested_roles: string[] | null }
type ContactOutcome = { status: "found"; contact: Record<string, unknown>; charged: number } | { status: "none" } | { status: "credits"; errorCode?: string };

/**
 * One named decision-maker at a company from the contact-data provider:
 * people at the organisation's main domain (staff of innovate.umd.edu write
 * from umd.edu), the closest job title, then a deliverability check. One
 * credit is held and charged only when a deliverable address is found.
 */
async function findContactFor(db: SupabaseClient, userId: string, prospect: ProspectForContact, idempotencyKey: string, apiKey: string): Promise<ContactOutcome> {
  const { data: existing } = await db.from("gtm_prospect_contacts").select("*").eq("prospect_id", prospect.id).limit(1);
  if (existing?.length) return { status: "found", contact: existing[0], charged: 0 };
  const reserved = await hold(db, userId, "GTM_CONTACT_FIND", CONTACT_FIND_CREDITS, `gtm-contact:${prospect.id}:${idempotencyKey}`, { prospectId: prospect.id });
  if (!reserved?.success) return { status: "credits", errorCode: reserved?.errorCode };
  const reservationId = reserved.reservationId!;
  try {
    const lookup = async (path: string) => {
      const response = await fetch(`https://api.hunter.io/v2/${path}&api_key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`contact provider ${response.status}`);
      return response.json();
    };
    await ledger(db, prospect.run_id, "contacts:hunter", CONTACT_LOOKUP_COST_USD);
    const mainDomain = registrableDomain(prospect.domain);
    const people = parseDomainSearchPeople(await lookup(`domain-search?domain=${encodeURIComponent(mainDomain)}&type=personal&limit=20`), prospect.domain);
    const { data: suppressed } = people.length
      ? await db.from("gtm_suppressions").select("email").not("email", "is", null).in("email", people.map((person) => person.email))
      : { data: [] };
    const blockedEmails = new Set((suppressed ?? []).map((row) => String(row.email).toLowerCase()));
    const person = pickDecisionMaker(people.filter((candidate) => !blockedEmails.has(candidate.email)), prospect.suggested_roles ?? []);
    const emailStatus = person ? emailStatusFromVerifier(await lookup(`email-verifier?email=${encodeURIComponent(person.email)}`)) : null;
    if (!person || !emailStatus) {
      await release(db, reservationId, "no_contact_found");
      return { status: "none" };
    }
    const { data: contact, error } = await db.from("gtm_prospect_contacts").insert({
      prospect_id: prospect.id, user_id: userId, full_name: `${person.firstName} ${person.lastName}`.trim(), role: person.position || null,
      email: person.email, email_status: emailStatus, provider: "hunter", sources: person.sources,
    }).select("*").single();
    if (error) throw new Error(error.message);
    const { data: charged } = await db.rpc("finalize_credit_reservation_v1", { p_reservation_id: reservationId, p_charge: CONTACT_FIND_CREDITS, p_metadata: { prospectId: prospect.id } });
    if (!charged?.success) console.error("gtm-research contact charge failed", charged);
    return { status: "found", contact, charged: CONTACT_FIND_CREDITS };
  } catch (error) {
    await release(db, reservationId, "contact_lookup_failed");
    console.error("gtm-research contact lookup failed", { prospectId: prospect.id, message: error instanceof Error ? error.message : error });
    return { status: "none" };
  }
}

/** Starts the weekly checks that are due. Called by pg_cron with the service key. */
async function refreshDue(db: SupabaseClient): Promise<Response> {
  const cutoff = new Date(Date.now() - REFRESH_EVERY_MS).toISOString();
  const { data: due } = await db.from("gtm_research_runs").select("*")
    .eq("auto_refresh", true).eq("kind", "initial").in("status", ["completed", "partial"])
    .or(`last_refreshed_at.is.null,last_refreshed_at.lt.${cutoff}`).limit(REFRESHES_PER_SWEEP);
  let started = 0;
  for (const root of (due ?? []) as Run[]) {
    if (!(await withinBudget(db))) break;
    const { count: active } = await db.from("gtm_research_runs").select("id", { count: "exact", head: true })
      .eq("parent_run_id", root.id).in("status", ["queued", "running"]);
    if (active) continue;
    const now = new Date().toISOString();
    await db.from("gtm_research_runs").update({ last_refreshed_at: now }).eq("id", root.id);
    const week = now.slice(0, 10);
    const reserved = await hold(db, root.user_id, "GTM_RESEARCH_MORE", runPrice("refresh").credits, `gtm-refresh:${root.id}:${week}`, { runId: root.id, kind: "refresh" });
    if (!reserved?.success) {
      await db.from("gtm_research_runs").update({ auto_refresh: false }).eq("id", root.id);
      await db.from("community_notifications").insert({
        user_id: root.user_id, actor_id: root.user_id, notification_type: "customer_research_ready",
        metadata: { message: "Your weekly check for new companies is paused: not enough credits.", route: "/go-to-market?workspace=find-customers", runId: root.id, tool: "gtm_strategist" },
      });
      continue;
    }
    await createFollowUp(db, root, "refresh", { reservationId: reserved.reservationId ?? null, gifted: false, targetCount: FOLLOW_UP_TARGET, idempotencyKey: `refresh:${root.id}:${week}` });
    started += 1;
  }
  if (started) kickResearchWorker();
  return json({ started });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const action = body.action;
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  if (action === "refresh_due") {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!isServiceRoleToken(token, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")) return json({ error: "Forbidden" }, 403);
    try { return await refreshDue(db); } catch (error) {
      console.error("gtm-research refresh failed", error instanceof Error ? error.message : error);
      return json({ error: "Refresh failed" }, 500);
    }
  }

  const user = await getUserFromAuth(req);
  if (!user) return json({ error: "Sign in to research customers." }, 401);
  // The caller's own client, for RPCs that act as the signed-in founder.
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const idempotencyHeader = (req.headers.get("Idempotency-Key") ?? "").trim().slice(0, 200);

  const loadRun = async (runId: unknown) => {
    if (typeof runId !== "string" || !UUID.test(runId)) return null;
    const { data } = await db.from("gtm_research_runs").select("*").eq("id", runId).eq("user_id", user.id).maybeSingle();
    return data as Run | null;
  };
  /** The search a run belongs to: itself, or the run it adds companies to. */
  const loadRoot = async (runId: unknown) => {
    const run = await loadRun(runId);
    if (!run) return null;
    return run.kind === "initial" || !run.parent_run_id ? run : await loadRun(run.parent_run_id);
  };
  /** The leads whose contact data this founder's plan includes (gtm_prospect_contact_access_v1). */
  const unlockedIds = async (ids: string[]): Promise<Set<string>> => {
    if (!ids.length) return new Set();
    const { data, error } = await asUser.rpc("gtm_prospect_contact_access_v1", { p_prospect_ids: ids });
    if (error) { console.error("gtm-research contact access failed", error.message); return new Set(); }
    return new Set(((data ?? []) as Array<{ prospect_id: string; unlocked: boolean }>).filter((row) => row.unlocked).map((row) => row.prospect_id));
  };
  const familyProspects = async (root: Run) => {
    const { data: runs } = await db.from("gtm_research_runs").select("id").eq("user_id", user.id).or(`id.eq.${root.id},and(parent_run_id.eq.${root.id},kind.neq.initial)`);
    const ids = (runs ?? []).map((row) => row.id as string);
    const { data } = await db.from("gtm_prospect_companies").select("domain, fit_tier, status, feedback").in("run_id", ids.length ? ids : [root.id]);
    return (data ?? []) as Array<{ domain: string; fit_tier: FitTier; status: string; feedback: { reason?: string } | null }>;
  };
  const followUpBlocked = async (root: Run): Promise<Response | null> => {
    if (!["completed", "partial"].includes(root.status)) return json({ error: "Finish this search first." }, 409);
    const { data: active } = await db.from("gtm_research_runs").select("id").eq("parent_run_id", root.id).in("status", ["queued", "running"]).limit(1);
    if (active?.length) return json({ runId: active[0].id, replayed: true });
    return null;
  };
  const replayed = async (): Promise<Response | null> => {
    if (!idempotencyHeader) return json({ error: "Missing Idempotency-Key." }, 400);
    const { data } = await db.from("gtm_research_runs").select("id").eq("user_id", user.id).eq("idempotency_key", idempotencyHeader).maybeSingle();
    return data ? json({ runId: data.id, replayed: true }) : null;
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
      const { count } = await db.from("gtm_research_runs").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("kind", "initial").is("parent_run_id", null).gte("created_at", since);
      if ((count ?? 0) >= ANALYSES_PER_DAY) return json({ error: `You can start ${ANALYSES_PER_DAY} analyses a day. Try again tomorrow.`, errorCode: "RATE_LIMITED" }, 429);
      if (!(await withinBudget(db))) return json(PAUSED, 503);

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

    // A free analysis that failed resumes from the step that failed, keeping
    // the pages read and everything understood so far. Three resumes a run.
    if (action === "retry") {
      const run = await loadRun(body.runId);
      if (!run) return json({ error: "Research not found." }, 404);
      if (run.status !== "failed" || (run as Run & { started_at?: string | null }).started_at) return json({ error: "Only a reading of your business that failed can be resumed." }, 409);
      const retries = Number(run.counts.retries) || 0;
      if (retries >= 3) return json({ error: "This reading failed several times. Start a new search, or add a short description of your product.", errorCode: "RETRY_LIMIT" }, 409);
      if (!(await withinBudget(db))) return json(PAUSED, 503);
      const now = new Date().toISOString();
      const { count: failedSteps } = await db.from("gtm_research_steps").select("id", { count: "exact", head: true }).eq("run_id", run.id).eq("status", "failed");
      if (!failedSteps) return json({ error: "Nothing to resume. Start a new search." }, 409);
      // The run is live again before its step is queued, so the worker never
      // sees a queued step on a failed run and skips it.
      await db.from("gtm_research_runs").update({
        status: "analyzing", error_code: null, error_detail: null, completed_at: null, counts: { ...run.counts, retries: retries + 1 }, updated_at: now,
      }).eq("id", run.id);
      await db.from("gtm_research_steps").update({
        status: "queued", attempt: 0, error: null, lease_until: null, finished_at: null, next_attempt_at: now, log: "Trying again",
      }).eq("run_id", run.id).eq("status", "failed");
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
      if (!idempotencyHeader) return json({ error: "Missing Idempotency-Key." }, 400);
      const run = await loadRun(body.runId);
      if (!run) return json({ error: "Research not found." }, 404);
      if (["queued", "running", "partial", "completed"].includes(run.status)) return json({ runId: run.id, replayed: true });
      if (run.status !== "needs_review") return json({ error: "Read your business first." }, 409);
      const segment = sanitizeSegment(body.segment);
      if (!segment) return json({ error: "Choose who to target, with at least one must-have criterion." }, 400);
      const targetCount = Math.max(5, Math.min(Number(body.targetCount) || 20, 20));
      if (!(await withinBudget(db))) return json(PAUSED, 503);

      // The first research run on an account is free; so are runs a founder's
      // program includes. Every other run holds the full price and is charged
      // only for what it delivers.
      const { data: gifted } = await asUser.rpc("claim_first_use_gift", { p_feature: "GTM_RESEARCH_RUN" });
      let cohortId: string | null = null;
      if (gifted !== true) {
        const { data: allowance } = await db.rpc("cohort_research_allowance_v1", { p_user_id: user.id });
        const row = (Array.isArray(allowance) ? allowance[0] : allowance) as { cohort_id?: string; remaining?: number } | null;
        if (row?.cohort_id && Number(row.remaining) > 0) cohortId = row.cohort_id;
      }
      const free = gifted === true || Boolean(cohortId);
      let reservationId: string | null = null;
      if (!free) {
        const reserved = await hold(db, user.id, "GTM_RESEARCH_RUN", RESEARCH_RUN_CREDITS, `gtm-research:${idempotencyHeader}`, { runId: run.id });
        if (!reserved?.success) return creditFailure(reserved?.errorCode, RESEARCH_RUN_CREDITS);
        reservationId = reserved.reservationId ?? null;
      }
      const now = new Date().toISOString();
      const { error: updateError } = await db.from("gtm_research_runs").update({
        status: "queued", selected_segment: segment, target_count: targetCount, reservation_id: reservationId,
        credits_reserved: reservationId ? RESEARCH_RUN_CREDITS : 0, gifted: free, cohort_id: cohortId, idempotency_key: idempotencyHeader,
        started_at: now, updated_at: now,
      }).eq("id", run.id).eq("status", "needs_review");
      if (updateError) {
        if (reservationId) await release(db, reservationId, "start_failed");
        throw new Error(updateError.message);
      }
      await db.from("gtm_research_steps").upsert({ run_id: run.id, user_id: user.id, key: "discover_companies", batch: 0 }, { onConflict: "run_id,key,batch", ignoreDuplicates: true });
      kickResearchWorker();
      return json({ runId: run.id, gifted: free, fromProgram: Boolean(cohortId), creditsHeld: reservationId ? RESEARCH_RUN_CREDITS : 0 });
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

    if (action === "more" || action === "similar") {
      const early = await replayed();
      if (early) return early;
      const root = await loadRoot(body.runId);
      if (!root) return json({ error: "Research not found." }, 404);
      const blocked = await followUpBlocked(root);
      if (blocked) return blocked;
      let seeds: string[] = [];
      if (action === "similar") {
        const prospects = await familyProspects(root);
        const requested = Array.isArray(body.seedDomains) ? new Set(body.seedDomains.filter((value): value is string => typeof value === "string")) : null;
        seeds = prospects.filter((prospect) => (requested ? requested.has(prospect.domain) : ["shortlisted", "in_pipeline", "contacted"].includes(prospect.status)) && prospect.fit_tier !== "C")
          .map((prospect) => prospect.domain).slice(0, 10);
        if (!seeds.length) return json({ error: "Shortlist the companies you like best first." }, 400);
      }
      if (!(await withinBudget(db))) return json(PAUSED, 503);
      const price = runPrice(action);
      const reserved = await hold(db, user.id, price.feature!, price.credits, `gtm-${action}:${idempotencyHeader}`, { runId: root.id, kind: action });
      if (!reserved?.success) return creditFailure(reserved?.errorCode, price.credits);
      const runId = await createFollowUp(db, root, action, { reservationId: reserved.reservationId ?? null, gifted: false, targetCount: FOLLOW_UP_TARGET, seedDomains: seeds, idempotencyKey: idempotencyHeader });
      kickResearchWorker();
      return json({ runId, creditsHeld: price.credits });
    }

    if (action === "rerun") {
      const root = await loadRoot(body.runId);
      if (!root) return json({ error: "Research not found." }, 404);
      const blocked = await followUpBlocked(root);
      if (blocked) return blocked;
      if (!rerunEligible(await familyProspects(root), root.rerun_used)) {
        return json({ error: "A free new search is offered once, after you mark at least half of the matches as off with a reason." }, 409);
      }
      if (!(await withinBudget(db))) return json(PAUSED, 503);
      const { data: claimed } = await db.from("gtm_research_runs").update({ rerun_used: true }).eq("id", root.id).eq("rerun_used", false).select("id");
      if (!claimed?.length) return json({ error: "The free new search for this list was already used." }, 409);
      const runId = await createFollowUp(db, root, "rerun", { reservationId: null, gifted: true, targetCount: 20, idempotencyKey: `rerun:${root.id}` });
      kickResearchWorker();
      return json({ runId, gifted: true });
    }

    if (action === "branch") {
      const root = await loadRoot(body.runId);
      if (!root?.business_profile || !root.segments.length) return json({ error: "Research not found." }, 404);
      const now = new Date().toISOString();
      const { data: run, error } = await db.from("gtm_research_runs").insert({
        user_id: user.id, project_id: root.project_id, gtm_plan_id: root.gtm_plan_id, play_id: root.play_id, status: "needs_review",
        kind: "initial", parent_run_id: root.id, input: root.input, business_profile: root.business_profile, competitors: root.competitors,
        segments: root.segments, counts: { ownDomain: root.counts.ownDomain ?? null }, updated_at: now,
      }).select("id").single();
      if (error || !run) throw new Error(error?.message ?? "Could not copy the analysis");
      return json({ runId: run.id });
    }

    if (action === "auto_refresh") {
      const root = await loadRoot(body.runId);
      if (!root) return json({ error: "Research not found." }, 404);
      const enabled = body.enabled === true;
      if (enabled && !["completed", "partial"].includes(root.status)) return json({ error: "Finish this search first." }, 409);
      await db.from("gtm_research_runs").update({ auto_refresh: enabled, ...(enabled ? { last_refreshed_at: new Date().toISOString() } : {}) }).eq("id", root.id);
      return json({ autoRefresh: enabled });
    }

    if (action === "find_contact") {
      const apiKey = Deno.env.get("HUNTER_API_KEY");
      if (!apiKey) return json({ error: "Finding named contacts isn't switched on yet.", errorCode: "NOT_AVAILABLE" }, 503);
      if (!idempotencyHeader) return json({ error: "Missing Idempotency-Key." }, 400);
      const prospectId = typeof body.prospectId === "string" && UUID.test(body.prospectId) ? body.prospectId : null;
      const { data: prospect } = prospectId
        ? await db.from("gtm_prospect_companies").select("id, run_id, domain, suggested_roles, fit_tier").eq("id", prospectId).eq("user_id", user.id).maybeSingle()
        : { data: null };
      if (!prospect) return json({ error: "Company not found." }, 404);
      if (!(await unlockedIds([prospect.id as string])).has(prospect.id as string)) return json(PLAN_REQUIRED, 403);
      if (!(await withinBudget(db))) return json(PAUSED, 503);
      const outcome = await findContactFor(db, user.id, prospect as ProspectForContact, idempotencyHeader, apiKey);
      if (outcome.status === "credits") return creditFailure(outcome.errorCode, CONTACT_FIND_CREDITS);
      if (outcome.status === "none") return json({ contact: null, message: "No one matching the roles to contact was found with a deliverable email. You were not charged." });
      return json({ contact: outcome.contact, creditsCharged: outcome.charged, ...(outcome.charged ? {} : { replayed: true }) });
    }

    // Named people for every strong and good fit in a search that has none yet,
    // best first, at most 10 per click. 1 credit each, only when found.
    if (action === "find_contacts") {
      const apiKey = Deno.env.get("HUNTER_API_KEY");
      if (!apiKey) return json({ error: "Finding named contacts isn't switched on yet.", errorCode: "NOT_AVAILABLE" }, 503);
      if (!idempotencyHeader) return json({ error: "Missing Idempotency-Key." }, 400);
      const root = await loadRoot(body.runId);
      if (!root) return json({ error: "Research not found." }, 404);
      if (!(await withinBudget(db))) return json(PAUSED, 503);
      const { data: runs } = await db.from("gtm_research_runs").select("id").eq("user_id", user.id).or(`id.eq.${root.id},and(parent_run_id.eq.${root.id},kind.neq.initial)`);
      const { data: candidates } = await db.from("gtm_prospect_companies").select("id, run_id, domain, suggested_roles, fit_tier, gtm_prospect_contacts(id)")
        .eq("user_id", user.id).in("run_id", (runs ?? []).map((row) => row.id as string)).in("fit_tier", ["A", "B"]).neq("status", "dismissed")
        .order("fit_score", { ascending: false }).limit(40);
      const withoutPerson = (candidates ?? []).filter((row) => !(row.gtm_prospect_contacts as unknown[] | null)?.length);
      // Contact data follows the plan: Pro every lead, Rising the best half of the search.
      const allowed = await unlockedIds(withoutPerson.map((row) => row.id as string));
      if (withoutPerson.length && !allowed.size) return json(PLAN_REQUIRED, 403);
      const pending = withoutPerson.filter((row) => allowed.has(row.id as string)).slice(0, 10);
      let found = 0;
      let charged = 0;
      for (const prospect of pending) {
        const outcome = await findContactFor(db, user.id, prospect as ProspectForContact, `${idempotencyHeader}:${prospect.id}`, apiKey);
        if (outcome.status === "credits") {
          return json({ found, checked: pending.indexOf(prospect), creditsCharged: charged, stoppedForCredits: true, error: `Out of credits after ${found} ${found === 1 ? "person" : "people"}.` });
        }
        if (outcome.status === "found") { found += 1; charged += outcome.charged; }
      }
      return json({ found, checked: pending.length, creditsCharged: charged });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("gtm-research failed", { action, message: error instanceof Error ? error.message : error });
    return json({ error: "Something went wrong. Nothing was charged for this action." }, 500);
  }
});
