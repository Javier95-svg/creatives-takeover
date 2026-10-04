import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";
import {
  finalizeMVPBuilderCredits,
  releaseMVPBuilderCredits,
} from "../_shared/mvp-builder-credit-reservations.ts";

// MVP Builder "Publish" — reserves a clean, globally-unique public subdomain for
// a project and returns {slug}.creatives-takeover.com. Runs with the service role
// so the uniqueness check spans all users (client RLS only sees the user's own
// rows). The slug is locked on first publish (see lock-on-rename note below).
// Each distinct checked release is charged the APP_BUILDER_DEPLOY credit cost (5). On publish the
// subdomain is auto-registered on the Vercel project (one platform-owned token), so
// users never touch Vercel — the edge middleware/rewrite then serves their site.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

const BASE_DOMAIN = Deno.env.get("MVP_PUBLISH_BASE_DOMAIN") || "creatives-takeover.com";
const MAX_SLUG_LENGTH = 48;
const MAX_ASSIGN_ATTEMPTS = 5;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugifyProjectName(value: string): string {
  const slug = (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return slug || "project";
}

// deno-lint-ignore no-explicit-any
function isUniqueViolation(error: any): boolean {
  return error?.code === "23505";
}

// Vercel project that serves *.creatives-takeover.com (env-overridable).
const VERCEL_PROJECT_ID = Deno.env.get("VERCEL_PROJECT_ID") || "prj_EAuYf0WriL9QmoV47QpDZXuPsNgf";
const VERCEL_TEAM_ID = Deno.env.get("VERCEL_TEAM_ID") || "team_LJzh7TuGo84R7r86GqqszhWy";

type VercelDomainResult = { registered: boolean; skipped?: boolean; status?: number; error?: string };

// Attach {slug}.creatives-takeover.com to the Vercel project so it routes + gets
// HTTPS automatically. Idempotent (a slug already on the project counts as success).
// Verify attachment to this project before activating or charging for a release.
async function ensureVercelDomain(domain: string): Promise<VercelDomainResult> {
  const token = Deno.env.get("VERCEL_TOKEN");
  if (!token) return { registered: false, skipped: true, error: "VERCEL_TOKEN not configured" };

  const query = VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}` : "";
  const endpoint = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${query}`;

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: domain }),
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
      // deno-lint-ignore no-explicit-any
      const data: any = await resp.json().catch(() => ({}));
      const code = data?.error?.code;
      if (resp.ok || resp.status === 409 || code === "domain_already_in_use" || code === "domain_already_exists") {
        const check = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}${query}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000), redirect:'error',
        });
        const actual=await check.json().catch(()=>({}));
        if(check.ok && actual.name===domain && actual.verified===true)return {registered:true,status:check.status};
        return {registered:false,error:'The public address is not verified on the publishing project yet.'};
      }
      lastError = data?.error?.message || `Vercel API ${resp.status}`;
      // 4xx (other than 409) won't fix on retry; bail out.
      if (resp.status < 500) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { registered: false, error: lastError || "Vercel domain registration failed" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Supabase configuration missing", errorCode: "CONFIGURATION_ERROR" }, 500);
  }

  const user = await getUserFromAuth(req);
  if (!user) {
    return jsonResponse({ ok: false, error: "Authentication required", errorCode: "UNAUTHORIZED" }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request body", errorCode: "BAD_REQUEST" }, 400);
  }

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!projectId) {
    return jsonResponse({ ok: false, error: "projectId is required", errorCode: "BAD_REQUEST" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: project, error: projectError } = await supabase
    .from("mvp_projects")
    .select("id, title, subdomain_slug, project_files, versions, metadata")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError || !project) {
    return jsonResponse({ ok: false, error: "Project not found", errorCode: "NOT_FOUND" }, 404);
  }

  const testRunId = typeof body.testRunId === 'string' ? body.testRunId : '';
  if (!/^[0-9a-f-]{36}$/i.test(testRunId)) return jsonResponse({ok:false,error:'Run the customer workflow test before publishing.',errorCode:'TEST_REQUIRED'},409);
  const {data: verified, error: testError} = await supabase.rpc('inspect_mvp_workflow_test',{p_project_id:projectId,p_user_id:user.id,p_test_id:testRunId});
  if (testError || !verified) return jsonResponse({ok:false,error:'The current saved revision needs a passing customer workflow test.',errorCode:'TEST_REQUIRED'},409);
  if (verified.alreadyPublished && project.subdomain_slug) {
    try { const live=await fetch('https://'+project.subdomain_slug+'.'+BASE_DOMAIN+'/',{signal:AbortSignal.timeout(15000),redirect:'error'}); if(!live.ok)return jsonResponse({ok:false,error:'The public release is saved but its address is unavailable. Retry later.',errorCode:'DOMAIN_PENDING'},503); } catch {return jsonResponse({ok:false,error:'The public release is saved but its address is unavailable. Retry later.',errorCode:'DOMAIN_PENDING'},503);}
    return jsonResponse({ok:true,slug:project.subdomain_slug,url:'https://' + project.subdomain_slug + '.' + BASE_DOMAIN,creditsUsed:0,reused:true});
  }

  const probeRelease = async (candidate:string) => {
    const domain=await ensureVercelDomain(candidate+'.'+BASE_DOMAIN);
    if(!domain.registered)throw Error('Public address setup is incomplete. The previous release remains active.');
    const {data:probe,error}=await supabase.from('mvp_release_probes').insert({project_id:projectId,test_id:testRunId,slug:candidate}).select('token').single();
    if(error||!probe)throw Error('Could not prepare the checked release.');
    try {
      const check=await fetch('https://'+candidate+'.'+BASE_DOMAIN+'/?ct-release-probe='+probe.token,{signal:AbortSignal.timeout(15000),redirect:'error',headers:{'Cache-Control':'no-cache'}});
      if(!check.ok||check.headers.get('x-ct-release-revision')!==verified.revision)throw Error('The public address could not serve this checked app. The previous release remains active.');
    } finally { await supabase.from('mvp_release_probes').delete().eq('token',probe.token); }
  };

  // Reserve once per checked revision; release failures and allow a safe retry.
  const creditFeature = "APP_BUILDER_DEPLOY";
  const creditCost = CREDIT_COSTS[creditFeature];
  const {data:creditCheck,error:reservationError}=await supabase.rpc('reserve_mvp_publication_credits',{p_user:user.id,p_project:projectId,p_test:testRunId,p_price:creditCost});
  if(reservationError||!creditCheck)return jsonResponse({ok:false,error:'Unable to reserve publication credits. Retry safely.',errorCode:'RESERVATION_FAILED'},503);

  if (!creditCheck.success) {
    return jsonResponse({
      ok: false,
      error: creditCheck.error || "Unable to process credits",
      errorCode: creditCheck.errorCode || "CREDIT_FAILURE",
      requiredCredits: creditCost,
    }, creditCheck.errorCode === "INSUFFICIENT_CREDITS" ? 402 : 400);
  }

  const reservationId = creditCheck.reservationId!;
  const heldCredits = Number(creditCheck.heldCredits ?? 0);

  try {
    // Lock-on-rename: once a project has a slug it is reused for every subsequent
    // publish regardless of later title changes, so already-shared links never break.
    let slug = typeof project.subdomain_slug === "string" && project.subdomain_slug
      ? project.subdomain_slug
      : null;
    let reused = Boolean(slug);

    if (slug) {
      const url = `https://${slug}.${BASE_DOMAIN}`;
      await probeRelease(slug);
      const { error: reuseError } = await supabase.rpc('publish_tested_mvp',{p_project_id:projectId,p_user_id:user.id,p_test_id:testRunId,p_slug:slug,p_url:url,p_reservation_id:reservationId});
      if (reuseError) throw new Error("Unable to update project");
    } else {
      const {data:managed}=await supabase.from('mvp_managed_apps').select('status').eq('project_id',projectId).eq('user_id',user.id).maybeSingle();
      const managedSlug=managed?.status==='ready' && project.metadata?.setupInput?.managedApp ? 'app-'+projectId : null;
      const base = managedSlug || slugifyProjectName(typeof project.title === "string" ? project.title : "");

      // Pull every slug that could collide with `base` or `base-N` so we can pick
      // the lowest free suffix. Service role => spans all users (global uniqueness).
      const { data: matches, error: matchError } = await supabase
        .from("mvp_projects")
        .select("subdomain_slug")
        .like("subdomain_slug", `${base}%`);
      if (matchError) throw new Error("Unable to check link availability");

      const taken = new Set(
        (matches ?? [])
          .map((row) => (typeof row.subdomain_slug === "string" ? row.subdomain_slug : null))
          .filter((value): value is string => Boolean(value))
      );

      const nextCandidate = (skip: Set<string>): string => {
        if(managedSlug){if(taken.has(base)||skip.has(base))throw new Error('Managed app address requires operator reconciliation');return base;}
        if (!taken.has(base) && !skip.has(base)) return base;
        let suffix = 2;
        while (taken.has(`${base}-${suffix}`) || skip.has(`${base}-${suffix}`)) suffix += 1;
        return `${base}-${suffix}`;
      };

      // Assign with a small retry loop: if two projects publish the same base name
      // at once, the unique index rejects the loser and we recompute the next slug.
      const attempted = new Set<string>();
      let assigned: string | null = null;
      for (let attempt = 0; attempt < MAX_ASSIGN_ATTEMPTS; attempt += 1) {
        const candidate = nextCandidate(attempted);
        attempted.add(candidate);
        const url = `https://${candidate}.${BASE_DOMAIN}`;
        await probeRelease(candidate);

        const { error: updateError } = await supabase.rpc('publish_tested_mvp',{p_project_id:projectId,p_user_id:user.id,p_test_id:testRunId,p_slug:candidate,p_url:url,p_reservation_id:reservationId});

        if (!updateError) {
          assigned = candidate;
          break;
        }
        if (!isUniqueViolation(updateError)) {
          throw new Error("Unable to publish");
        }
        taken.add(candidate);
      }

      if (!assigned) {
        throw new Error("Could not reserve a public link");
      }
      slug = assigned;
      reused = false;
    }

    const url = `https://${slug}.${BASE_DOMAIN}`;

    const domain: VercelDomainResult = {registered:true};

    // The publication RPC already committed both the artifact and the charge.
    // Follow-up metadata/telemetry must not turn a committed release into an error.
    const finalized = await finalizeMVPBuilderCredits(reservationId, {
      mvpBuilderActionType: "publish",
      projectId,
      publishUrl: url,
      slug,
      domainRegistered: domain.registered,
      completionBoundary: "publish_saved",
    }).catch(()=>null);

    return jsonResponse({
      ok: true,
      slug,
      url,
      reused,
      domainRegistered: domain.registered,
      domainPending: !domain.registered,
      domainError: domain.error ?? null,
      reservationId,
      reservationStatus: "finalized",
      listedCreditCost: creditCost,
      heldCredits,
      creditsUsed: finalized?.success ? finalized.creditsUsed : heldCredits,
      balanceAfter: finalized?.success ? finalized.balanceAfter : undefined,
    });
  } catch (error) {
    await releaseMVPBuilderCredits(reservationId, "MVP Builder publish failed", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    }).catch(() => {});
    return jsonResponse({
      ok: false,
      error: "Publication could not be confirmed. Check your current release, then retry. Any unspent credit hold has been released.",
      errorCode: "PUBLISH_FAILED",
    }, 500);
  }
});
