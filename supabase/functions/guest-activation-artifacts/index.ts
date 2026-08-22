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

/** Short, unguessable slug suffix. Server-side so slugs cannot be squatted. */
function createSlugSuffix() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

/**
 * A readable slug, the way an article gets one.
 *
 * The link is the thing a founder pastes into a post, so it should say what it
 * is before anyone clicks. A random string reads like a tracking URL and gives
 * a reader no reason to open it. The random suffix stays because these pages
 * are shared by link and listed nowhere - the words make it legible, the
 * suffix keeps it unguessable.
 */
function buildScoreSlug(idea: unknown) {
  const words = typeof idea === "string"
    ? idea.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").filter(Boolean)
    : [];
  // Cap on words rather than characters so the slug never ends mid-word.
  const stem = words.slice(0, 8).join("-").slice(0, 60).replace(/-+$/g, "");
  return stem ? `${stem}-${createSlugSuffix().slice(0, 8)}` : `score-${createSlugSuffix()}`;
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

    /*
     * Publish a guest's score card, before they have an account.
     *
     * The distribution loop only runs if the founder can share the moment they
     * see their number; requiring signup first puts the ask at exactly the wrong
     * point. What gets published is only the score card, never the draft, so
     * giving this away costs nothing that the unlock gate was selling.
     *
     * Deliberately unauthenticated and IP-rate-limited, matching create_demo.
     * Possession of the resume token is the authorization: it is a 256-bit
     * value we only ever handed to this browser.
     */
    if (operation === "publish_score") {
      const { error: rateError } = await serviceClient.rpc("assert_rate_limit", {
        p_key: `guest_score_publish:${clientIp(req)}`,
        p_user_id: null,
        p_max_per_minute: 5,
      });
      if (rateError) {
        return json({ success: false, error: "Too many share attempts. Wait a minute and try again.", errorCode: "RATE_LIMITED" }, 429);
      }

      const resumeToken = typeof body.resumeToken === "string" ? body.resumeToken.trim() : "";
      const scoreCard = body.scoreCard;
      if (resumeToken.length < 32) {
        return json({ success: false, error: "The artifact share details are invalid." }, 422);
      }
      // Validate the shape we are about to serve publicly rather than trusting
      // the caller: this object is echoed to strangers and to the OG renderer.
      if (
        !scoreCard || typeof scoreCard !== "object" ||
        typeof scoreCard.displayScore !== "number" ||
        !Number.isFinite(scoreCard.displayScore) ||
        typeof scoreCard.verdict !== "string"
      ) {
        return json({ success: false, error: "The score card is invalid." }, 422);
      }

      const tokenHash = await hashToken(resumeToken);
      const { data: existing, error: readError } = await serviceClient
        .from("guest_activation_artifacts")
        .select("id, share_slug, deep_payload")
        .eq("resume_token_hash", tokenHash)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (readError) throw readError;
      if (!existing) return json({ success: false, error: "This artifact is unavailable." }, 404);

      // Reuse the slug on repeat shares so a link already posted keeps working.
      const shareSlug = existing.share_slug || buildScoreSlug(scoreCard.idea);

      /*
       * A published link has to outlive the 7-day guest TTL.
       * prune_expired_guest_activation_artifacts DELETEs on expiry every night,
       * so without this the founder's post would outlive the page it points at.
       */
      const publishedExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const nextPayload = {
        ...(existing.deep_payload && typeof existing.deep_payload === "object" ? existing.deep_payload : {}),
        publicScoreCard: scoreCard,
      };

      const { error: publishError } = await serviceClient
        .from("guest_activation_artifacts")
        .update({
          share_slug: shareSlug,
          deep_payload: nextPayload,
          expires_at: publishedExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (publishError) throw publishError;

      return json({ success: true, shareSlug });
    }

    /*
     * Read a published score card by slug.
     *
     * This function is the entire access control for it: RLS on
     * guest_activation_artifacts is enabled with no policies, so anon cannot
     * reach the table directly and cannot select deep_payload by any other
     * route. Only the card is returned - never the draft, the resume token
     * hash, or anything else on the row.
     */
    if (operation === "read_score") {
      const slug = typeof body.shareSlug === "string" ? body.shareSlug.trim().toLowerCase() : "";
      if (!/^[a-z0-9][a-z0-9-]{2,95}$/.test(slug)) {
        return json({ success: false, error: "Not found." }, 404);
      }
      const { data: row, error: readError } = await serviceClient
        .from("guest_activation_artifacts")
        .select("deep_payload")
        .eq("share_slug", slug)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (readError) throw readError;
      const card = row?.deep_payload?.publicScoreCard ?? null;
      if (!card) return json({ success: false, error: "Not found." }, 404);
      return json({ success: true, scoreCard: card });
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
