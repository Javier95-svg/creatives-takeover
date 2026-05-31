import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAndDeductCredits, refundCredits, getUserFromAuth } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

type ProjectFile = {
  filename?: string;
  path?: string;
  content?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "mvp";
}

function normalizePath(file: ProjectFile) {
  const value = file.filename || file.path || "index.html";
  return value.replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function getLatestFiles(project: Record<string, any>): Array<{ file: string; data: string }> {
  const versions = Array.isArray(project.versions) ? project.versions : [];
  const latestVersion = [...versions].sort((a, b) => Number(b.version_number || 0) - Number(a.version_number || 0))[0];
  const rawFiles = Array.isArray(latestVersion?.files)
    ? latestVersion.files
    : Array.isArray(project.project_files)
      ? project.project_files
      : [];

  return rawFiles
    .map((file: ProjectFile) => ({
      file: normalizePath(file),
      data: typeof file.content === "string" ? file.content : "",
    }))
    .filter((file) => file.file && file.data.trim());
}

function inferProjectType(project: Record<string, any>, files: Array<{ file: string; data: string }>) {
  if (project.project_type === "react_vite" || project.project_type === "react_multi") return "react_vite";
  if (files.some((file) => file.file === "package.json") && files.some((file) => /^src\/main\.(tsx|jsx|ts|js)$/.test(file.file))) {
    return "react_vite";
  }
  return "html_single";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vercelToken = Deno.env.get("VERCEL_TOKEN");
  const vercelTeamId = Deno.env.get("VERCEL_TEAM_ID");
  const baseDomain = Deno.env.get("MVP_BUILDER_BASE_DOMAIN") || "ct.app";
  const posthogKey = Deno.env.get("POSTHOG_PROJECT_KEY") || "POSTHOG_KEY";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Supabase configuration missing", errorCode: "CONFIGURATION_ERROR" }, 500);
  }
  if (!vercelToken) {
    return jsonResponse({ ok: false, error: "VERCEL_TOKEN is not configured", errorCode: "CONFIGURATION_ERROR" }, 500);
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
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError || !project) {
    return jsonResponse({ ok: false, error: "Project not found", errorCode: "NOT_FOUND" }, 404);
  }

  const files = getLatestFiles(project);
  if (files.length === 0) {
    return jsonResponse({ ok: false, error: "Project has no deployable files", errorCode: "NO_FILES" }, 400);
  }

  const creditFeature = "APP_BUILDER_DEPLOY";
  const creditCost = CREDIT_COSTS[creditFeature];
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined;
  const creditCheck = await checkAndDeductCredits(user.id, creditCost, "MVP Builder Deploy", undefined, {
    idempotencyKey,
    entitlementFeature: creditFeature,
    featureCode: creditFeature,
    allowPartialMvpSpend: true,
    mvpBuilderActionType: "deploy",
    projectId,
  });

  if (!creditCheck.success) {
    return jsonResponse({
      ok: false,
      error: creditCheck.error || "Unable to process credits",
      errorCode: creditCheck.errorCode || "CREDIT_FAILURE",
      requiredCredits: creditCost,
    }, creditCheck.errorCode === "INSUFFICIENT_CREDITS" ? 402 : 400);
  }

  const chargedCredits = (creditCheck.usedFromQuota ?? 0) + (creditCheck.usedFromBalance ?? 0);
  const baseSlug = slugify(typeof project.title === "string" ? project.title : projectId);
  const deploymentSlug = `${baseSlug}-${projectId.slice(0, 8)}`;
  const desiredUrl = `https://${deploymentSlug}.${baseDomain}`;
  const projectType = inferProjectType(project, files);
  const deployedFiles = files.map((file) => ({
    file: file.file,
    data: file.data.replaceAll("POSTHOG_KEY", posthogKey),
  }));

  await supabase
    .from("mvp_projects")
    .update({ deployment_status: "deploying", deployment_slug: deploymentSlug })
    .eq("id", projectId)
    .eq("user_id", user.id);

  try {
    const query = vercelTeamId ? `?teamId=${encodeURIComponent(vercelTeamId)}` : "";
    const response = await fetch(`https://api.vercel.com/v13/deployments${query}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: deploymentSlug,
        project: deploymentSlug,
        target: "production",
        files: deployedFiles,
        buildCommand: projectType === "react_vite" ? "npm run build" : null,
        outputDirectory: projectType === "react_vite" ? "dist" : ".",
        projectSettings: projectType === "react_vite"
          ? {
              framework: "vite",
              buildCommand: "npm run build",
              outputDirectory: "dist",
              installCommand: "npm install",
            }
          : {
              framework: null,
              outputDirectory: ".",
            },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Vercel deployment failed with ${response.status}`);
    }

    const deployment = await response.json();
    const vercelUrl = typeof deployment?.url === "string" ? `https://${deployment.url}` : desiredUrl;

    await supabase
      .from("mvp_projects")
      .update({
        deployment_status: "deployed",
        deployment_url: vercelUrl,
        deployment_slug: deploymentSlug,
        metadata: {
          ...(project.metadata || {}),
          deployment: {
            provider: "vercel",
            projectType,
            vercelDeploymentId: deployment?.id ?? null,
            desiredUrl,
            deployedAt: new Date().toISOString(),
          },
        },
      })
      .eq("id", projectId)
      .eq("user_id", user.id);

    return jsonResponse({
      ok: true,
      deploymentUrl: vercelUrl,
      desiredUrl,
      deploymentSlug,
      creditsUsed: chargedCredits,
    });
  } catch (error) {
    await supabase
      .from("mvp_projects")
      .update({ deployment_status: "failed" })
      .eq("id", projectId)
      .eq("user_id", user.id);
    if (chargedCredits > 0) {
      await refundCredits(user.id, chargedCredits, "MVP Builder Deploy", "MVP Builder deploy failed", {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      }).catch(() => {});
    }
    return jsonResponse({
      ok: false,
      error: "Deployment failed. Credits have been refunded.",
      errorCode: "DEPLOY_FAILED",
    }, 500);
  }
});
