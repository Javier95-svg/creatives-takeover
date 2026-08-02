import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";
import { emitBusinessEvent, resolveAnalyticsErrorCode } from "../_shared/analytics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// Matches the browser's compressed session draft ceiling closely enough for a
// three-frame storyboard while still bounding JSONB growth and request cost.
const MAX_DEMO_DRAFT_BYTES = 5_000_000;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as Record<string, any>;
    const operation = body.operation;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing required environment configuration");
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    if (operation === "publish") {
      const user = await getUserFromAuth(req);
      if (!user) return json({ success: false, error: "Authentication required" }, 401);
      const { error: publishRateError } = await serviceClient.rpc("assert_rate_limit", {
        p_key: `guest_artifact_publish:${clientIp(req)}`,
        p_user_id: user.id,
        p_max_per_minute: 20,
      });
      if (publishRateError) {
        return json({ success: false, error: "Too many share attempts. Wait a minute and try again.", errorCode: "RATE_LIMITED" }, 429);
      }

      const resumeToken = typeof body.resumeToken === "string" ? body.resumeToken.trim() : "";
      const nativeArtifactId = typeof body.nativeArtifactId === "string" ? body.nativeArtifactId.trim() : "";
      const shareSlug = typeof body.shareSlug === "string" ? body.shareSlug.trim().toLowerCase() : "";
      if (resumeToken.length < 32 || !nativeArtifactId || !/^[a-z0-9][a-z0-9-]{2,95}$/.test(shareSlug)) {
        return json({ success: false, error: "The artifact share details are invalid." }, 422);
      }
      const tokenHash = await hashToken(resumeToken);
      const { data: published, error: publishError } = await serviceClient
        .from("guest_activation_artifacts")
        .update({ share_slug: shareSlug, updated_at: new Date().toISOString() })
        .eq("resume_token_hash", tokenHash)
        .eq("claimed_by", user.id)
        .eq("claim_state", "claimed")
        .eq("native_artifact_id", nativeArtifactId)
        .gt("expires_at", new Date().toISOString())
        .select("id, artifact_type, native_artifact_id, share_slug")
        .maybeSingle();
      if (publishError) throw publishError;
      if (!published) return json({ success: false, error: "This claimed artifact is unavailable." }, 404);
      return json({
        success: true,
        artifactId: published.id,
        artifactType: published.artifact_type,
        nativeArtifactId: published.native_artifact_id,
        shareSlug: published.share_slug,
      });
    }

    if (operation === "create_demo") {
      const serialized = JSON.stringify(body.draft ?? null);
      if (!body.draft || serialized === "null" || new TextEncoder().encode(serialized).byteLength > MAX_DEMO_DRAFT_BYTES) {
        return json({ success: false, error: "Demo draft is missing or too large." }, 422);
      }
      const { error: rateError } = await serviceClient.rpc("assert_rate_limit", {
        p_key: `guest_demo_artifact:${clientIp(req)}`,
        p_user_id: null,
        p_max_per_minute: 5,
      });
      if (rateError) {
        const limited = /rate_limit_exceeded/i.test(rateError.message || "");
        return json({
          success: false,
          error: limited ? "You have hit the free demo limit. Wait a minute and try again." : "Demo saving is temporarily unavailable.",
          errorCode: limited ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE",
        }, limited ? 429 : 503);
      }

      const resumeToken = createToken();
      const tokenHash = await hashToken(resumeToken);
      const { data, error } = await serviceClient
        .from("guest_activation_artifacts")
        .insert({
          artifact_type: "demo",
          source: typeof body.source === "string" ? body.source.slice(0, 80) : "demo_try",
          input_payload: {},
          compact_payload: {
            productName: body.draft.productName ?? "Product concept",
            stepCount: Array.isArray(body.draft.steps) ? body.draft.steps.length : 0,
            assetMode: body.draft.assetMode ?? "generated_placeholders",
          },
          deep_payload: body.draft,
          generation_status: "deep_ready",
          resume_token_hash: tokenHash,
        })
        .select("id, expires_at")
        .single();
      if (error || !data) throw new Error(error?.message || "Could not preserve demo draft");
      return json({ success: true, artifactId: data.id, resumeToken, expiresAt: data.expires_at });
    }

    const { error: resumeRateError } = await serviceClient.rpc("assert_rate_limit", {
      p_key: `guest_demo_${operation === "claim_demo" ? "claim" : "resume"}:${clientIp(req)}`,
      p_user_id: null,
      p_max_per_minute: 30,
    });
    if (resumeRateError) {
      return json({ success: false, error: "Too many demo resume attempts. Wait a minute and try again.", errorCode: "RATE_LIMITED" }, 429);
    }

    const resumeToken = typeof body.resumeToken === "string" ? body.resumeToken.trim() : "";
    if (resumeToken.length < 32) return json({ success: false, error: "resumeToken is invalid" }, 422);
    const tokenHash = await hashToken(resumeToken);
    const { data: guest, error: loadError } = await serviceClient
      .from("guest_activation_artifacts")
      .select("*")
      .eq("resume_token_hash", tokenHash)
      .eq("artifact_type", "demo")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (loadError || !guest) return json({ success: false, error: "This demo result link is no longer valid." }, 404);

    if (operation === "load_demo") {
      return json({
        success: true,
        artifactId: guest.id,
        draft: guest.deep_payload,
        expiresAt: guest.expires_at,
        claimState: guest.claim_state,
        nativeArtifactId: guest.native_artifact_id,
      });
    }

    if (operation === "claim_demo") {
      const user = await getUserFromAuth(req);
      if (!user) return json({ success: false, error: "Authentication required" }, 401);
      const nativeArtifactId = typeof body.nativeArtifactId === "string" ? body.nativeArtifactId.trim() : "";
      if (!nativeArtifactId) return json({ success: false, error: "nativeArtifactId is required" }, 422);
      if (guest.claimed_by && guest.claimed_by !== user.id) {
        return json({ success: false, error: "This demo has already been claimed." }, 409);
      }
      if (guest.claim_state === "claimed" && guest.claimed_by === user.id) {
        return json({ success: true, artifactId: guest.id, nativeArtifactId: guest.native_artifact_id });
      }
      const { data: claimed, error } = await serviceClient
        .from("guest_activation_artifacts")
        .update({
          claimed_by: user.id,
          claim_state: "claimed",
          native_artifact_id: nativeArtifactId,
          claimed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", guest.id)
        .or(`claimed_by.is.null,claimed_by.eq.${user.id}`)
        .select("id, claimed_by, native_artifact_id")
        .maybeSingle();
      if (error) throw error;
      if (!claimed) {
        return json({ success: false, error: "This demo has already been claimed." }, 409);
      }
      await emitBusinessEvent({
        eventName: "artifact_claim_succeeded",
        userId: user.id,
        properties: { tool: "demo_studio", source: guest.source, artifact_type: "interactive_demo", artifact_id: nativeArtifactId },
      });
      return json({ success: true, artifactId: claimed.id, nativeArtifactId: claimed.native_artifact_id });
    }

    return json({ success: false, error: "operation is not supported" }, 422);
  } catch (error) {
    console.error("guest-activation-artifacts failed", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      errorCode: resolveAnalyticsErrorCode(error),
    }, 500);
  }
});
