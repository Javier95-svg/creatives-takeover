/**
 * check-dormant-users — Daily cron job (run via pg_cron or Supabase scheduler)
 *
 * Fires three retention email sequences:
 *   1. activation_nudge  — signed up 24h ago, never started BizMap
 *   2. progress_nudge    — started BizMap 48h ago, never saved a report
 *   3. reengagement      — no session in 7 days
 *
 * Call daily: POST /functions/v1/check-dormant-users  (service-role auth)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results = { activation_nudge: 0, progress_nudge: 0, reengagement: 0, errors: 0 };

  // Helper: invoke send-retention-email for a user
  const sendRetentionEmail = async (
    userId: string,
    email: string,
    fullName: string | null,
    niche: string | null,
    sequence: string
  ) => {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-retention-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ userId, email, fullName, niche: niche ?? "", sequence }),
      });
      const json = await res.json();
      if (!json.ok && !json.skipped) {
        console.error("send-retention-email failed", { userId, sequence, json });
        results.errors++;
      }
    } catch (err) {
      console.error("send-retention-email fetch error", err);
      results.errors++;
    }
  };

  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const h25ago = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
  const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const h49ago = new Date(now.getTime() - 49 * 60 * 60 * 1000).toISOString();
  const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d8ago = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();

  // ── Sequence 1: activation_nudge ─────────────────────────────────────────
  // Users who signed up 24–25h ago and have never tracked any chatbot activity
  const { data: activationTargets } = await supabase
    .from("profiles")
    .select("id, email:auth_users(email), full_name, startup_industry, user_preferences")
    .gte("created_at", h25ago)
    .lte("created_at", h24ago)
    .eq("onboarding_completed", true);

  if (activationTargets) {
    // Filter out users who have already sent a first message in BizMap (tracked via page_analytics)
    for (const profile of activationTargets) {
      const email = (profile as any).email?.[0]?.email ?? null;
      if (!email) continue;

      const { count } = await supabase
        .from("activity_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .in("event_name", ["bizmap_first_message_sent", "chatbot:first_use"]);

      if ((count ?? 0) === 0) {
        const niche = Array.isArray((profile as any).startup_industry)
          ? (profile as any).startup_industry[0] ?? null
          : (profile as any).startup_industry ?? null;

        await sendRetentionEmail(profile.id, email, profile.full_name, niche, "activation_nudge");
        results.activation_nudge++;
      }
    }
  }

  // ── Sequence 2: progress_nudge ────────────────────────────────────────────
  // Users who started BizMap 48–49h ago but never saved a report
  const { data: progressTargets } = await supabase
    .from("activity_events")
    .select("user_id")
    .eq("event_name", "bizmap_first_message_sent")
    .gte("created_at", h49ago)
    .lte("created_at", h48ago);

  if (progressTargets) {
    const uniqueUserIds = [...new Set(progressTargets.map((r: any) => r.user_id))];

    for (const userId of uniqueUserIds) {
      if (!userId) continue;

      // Check if they ever saved an output
      const { count: savedCount } = await supabase
        .from("activity_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_name", "bizmap_output_saved");

      if ((savedCount ?? 0) > 0) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email:auth_users(email), full_name, startup_industry")
        .eq("id", userId)
        .maybeSingle();

      const email = (profile as any)?.email?.[0]?.email ?? null;
      if (!email) continue;

      const niche = Array.isArray((profile as any)?.startup_industry)
        ? (profile as any).startup_industry[0] ?? null
        : (profile as any)?.startup_industry ?? null;

      await sendRetentionEmail(userId, email, profile?.full_name ?? null, niche, "progress_nudge");
      results.progress_nudge++;
    }
  }

  // ── Sequence 3: reengagement ──────────────────────────────────────────────
  // Users whose last page_analytics event was 7–8 days ago
  const { data: reengageTargets } = await supabase
    .from("page_analytics")
    .select("user_id")
    .gte("created_at", d8ago)
    .lte("created_at", d7ago)
    .not("user_id", "is", null);

  if (reengageTargets) {
    const uniqueUserIds = [...new Set(reengageTargets.map((r: any) => r.user_id))];

    for (const userId of uniqueUserIds) {
      if (!userId) continue;

      // Confirm no more-recent activity
      const { count: recentCount } = await supabase
        .from("page_analytics")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", d7ago);

      if ((recentCount ?? 0) > 0) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email:auth_users(email), full_name, startup_industry")
        .eq("id", userId)
        .maybeSingle();

      const email = (profile as any)?.email?.[0]?.email ?? null;
      if (!email) continue;

      const niche = Array.isArray((profile as any)?.startup_industry)
        ? (profile as any).startup_industry[0] ?? null
        : (profile as any)?.startup_industry ?? null;

      await sendRetentionEmail(userId, email, profile?.full_name ?? null, niche, "reengagement");
      results.reengagement++;
    }
  }

  console.log("check-dormant-users: complete", results);

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
