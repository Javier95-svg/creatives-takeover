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
// a project and returns {slug}.creativestakeover.app. Runs with the service role
// so the uniqueness check spans all users (client RLS only sees the user's own
// rows). The slug is locked on first publish (see lock-on-rename note below).
// Every publish is charged the APP_BUILDER_DEPLOY credit cost (5).

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
    .select("id, title, subdomain_slug")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError || !project) {
    return jsonResponse({ ok: false, error: "Project not found", errorCode: "NOT_FOUND" }, 404);
  }

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
        .update({ deployment_url: url, deployment_status: "deployed" })
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
          .update({ subdomain_slug: candidate, deployment_url: url, deployment_status: "deployed" })
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
    const finalized = await finalizeMVPBuilderCredits(reservationId, {
      mvpBuilderActionType: "publish",
      projectId,
      publishUrl: url,
      slug,
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
