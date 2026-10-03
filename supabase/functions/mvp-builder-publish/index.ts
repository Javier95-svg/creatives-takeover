import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";
import {
  finalizeMVPBuilderCredits,
  releaseMVPBuilderCredits,
  reserveMVPBuilderCredits,
} from "../_shared/mvp-builder-credit-reservations.ts";

// MVP Builder "Publish" — reserves a clean, globally-unique public subdomain for
// a project and returns {slug}.creatives-takeover.com. Runs with the service role
// so the uniqueness check spans all users (client RLS only sees the user's own
// rows). The slug is locked on first publish (see lock-on-rename note below).
// Every publish is charged the APP_BUILDER_DEPLOY credit cost (5). On publish the
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
// Best-effort with a small retry; the caller never fails the publish over this.
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
      });
      if (resp.ok) return { registered: true, status: resp.status };

      // deno-lint-ignore no-explicit-any
      const data: any = await resp.json().catch(() => ({}));
      const code = data?.error?.code;
      // Already attached to this project => idempotent success.
      if (resp.status === 409 || code === "domain_already_in_use" || code === "domain_already_exists") {
        return { registered: true, status: resp.status };
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

  const validation = body.validation && typeof body.validation === "object" && !Array.isArray(body.validation)
    ? body.validation as Record<string, unknown>
    : {};
  const smokeTest = validation.smokeTest && typeof validation.smokeTest === "object" && !Array.isArray(validation.smokeTest)
    ? validation.smokeTest as Record<string, unknown>
    : {};
  const projectFiles = Array.isArray(project.project_files) ? project.project_files : [];
  const source = projectFiles
    .map((file) => file && typeof file === "object" && "content" in file ? String(file.content ?? "") : "")
    .join("\n");
  const hasPrimaryAction = /<(button|form)\b|<a\b[^>]*href=|onClick\s*=|type\s*=\s*["']submit["']/i.test(source);
  const hasResponsiveLayout = /name\s*=\s*["']viewport["']|@media\b|\b(sm|md|lg|xl):/i.test(source);
  const hasRollback = Array.isArray(project.versions) && project.versions.length > 0;
  const smokePassed = smokeTest.passed === true
    && smokeTest.primaryActionFound === true
    && smokeTest.primaryActionTriggered === true
    && Array.isArray(smokeTest.runtimeErrors)
    && smokeTest.runtimeErrors.length === 0;
  if (projectFiles.length === 0 || !hasPrimaryAction || !hasResponsiveLayout || !hasRollback || !smokePassed) {
    return jsonResponse({
      ok: false,
      error: "The MVP failed its server publication contract. Fix the primary flow, responsive layout, runtime errors, or rollback version and run the smoke test again.",
      errorCode: "PUBLICATION_CONTRACT_FAILED",
      checks: { projectFiles: projectFiles.length > 0, primaryFlow: hasPrimaryAction, responsive: hasResponsiveLayout, rollback: hasRollback, smokeTest: smokePassed },
    }, 409);
  }
  const currentMetadata = project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
    ? project.metadata as Record<string, unknown>
    : {};
  const nextMetadata = {
    ...currentMetadata,
    lastPublishValidation: {
      smokeTest,
      structuralChecks: { primaryFlow: hasPrimaryAction, responsive: hasResponsiveLayout, rollback: hasRollback },
      validatedAt: typeof validation.validatedAt === "string" ? validation.validatedAt : new Date().toISOString(),
    },
  };

  // Charge for the publish before doing any work. Held credits are released if
  // anything below fails. Every publish is a distinct charge (idempotency key per click).
  const creditFeature = "APP_BUILDER_DEPLOY";
  const creditCost = CREDIT_COSTS[creditFeature];
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? crypto.randomUUID();
  const creditCheck = await reserveMVPBuilderCredits(
    user.id,
    creditFeature,
    creditCost,
    idempotencyKey,
    {
      entitlementFeature: creditFeature,
      featureCode: creditFeature,
      mvpBuilderActionType: "publish",
      projectId,
    }
  );

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
      const { error: reuseError } = await supabase
        .from("mvp_projects")
        .update({ deployment_url: url, deployment_status: "deployed", metadata: nextMetadata })
        .eq("id", projectId)
        .eq("user_id", user.id);
      if (reuseError) throw new Error("Unable to update project");
    } else {
      const base = slugifyProjectName(typeof project.title === "string" ? project.title : "");

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

        const { error: updateError } = await supabase
          .from("mvp_projects")
          .update({ subdomain_slug: candidate, deployment_url: url, deployment_status: "deployed", metadata: nextMetadata })
          .eq("id", projectId)
          .eq("user_id", user.id);

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

    // Auto-register the subdomain on Vercel (idempotent, best-effort). The slug is
    // already reserved in the DB; we never fail the publish if this hiccups.
    const domain = await ensureVercelDomain(`${slug}.${BASE_DOMAIN}`);

    const finalized = await finalizeMVPBuilderCredits(reservationId, {
      mvpBuilderActionType: "publish",
      projectId,
      publishUrl: url,
      slug,
      domainRegistered: domain.registered,
      completionBoundary: "publish_saved",
    });
    if (!finalized.success) {
      throw new Error("Unable to finalize MVP Builder publish credits");
    }

    return jsonResponse({
      ok: true,
      slug,
      url,
      reused,
      domainRegistered: domain.registered,
      domainPending: !domain.registered,
      domainError: domain.error ?? null,
      reservationId,
      reservationStatus: finalized.reservationStatus,
      listedCreditCost: creditCost,
      heldCredits,
      creditsUsed: finalized.creditsUsed,
      balanceAfter: finalized.balanceAfter,
    });
  } catch (error) {
    await releaseMVPBuilderCredits(reservationId, "MVP Builder publish failed", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    }).catch(() => {});
    return jsonResponse({
      ok: false,
      error: "Publishing failed. Held credits have been released.",
      errorCode: "PUBLISH_FAILED",
    }, 500);
  }
});
