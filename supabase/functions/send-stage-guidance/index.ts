import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { requireWorker } from "../_shared/guards.ts";
import { appLink } from "../_shared/retention-cta-url.ts";
import { eligibleStage, hasStageGuidanceConsent, STAGE_KEYS, STAGE_TOPICS, STAGE_SUBJECTS } from "../_shared/selective-email-eligibility.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
const appUrl = "https://creatives-takeover.com";
const db = createClient(url, key);
const resend = resendKey ? new Resend(resendKey) : null;

function html(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const refused = await requireWorker(req);
  if (refused) return refused;
  if (!url || !key) return json({ error: "Worker not configured" }, 503);
  const body = await req.json().catch(() => ({})) as { preview?: boolean };
  const preview = body.preview === true;
  if (!preview && !resend) return json({ error: "Email provider not configured" }, 503);

  const counts: Record<string, number> = { considered: 0, eligible: 0, sent: 0 };
  const skip = (reason: string) => { counts[reason] = (counts[reason] ?? 0) + 1; };
  let offset = 0;
  while (true) {
    const { data: choices, error } = await db.from("notification_preferences")
      .select("user_id,stage_guidance_emails,stage_guidance_opted_in_at")
      .eq("stage_guidance_emails", true).not("stage_guidance_opted_in_at", "is", null)
      .order("user_id").range(offset, offset + 99);
    if (error) return json({ error: "Could not load email choices" }, 500);
    if (!choices?.length) break;
    offset += choices.length;
    for (const choice of choices) {
      counts.considered++;
      const { data: profile } = await db.from("profiles")
        .select("id,user_type,assigned_stage,full_name")
        .eq("id", choice.user_id).maybeSingle();
      if (!profile) { skip("profile_missing"); continue; }
      if (!hasStageGuidanceConsent(choice.stage_guidance_emails, choice.stage_guidance_opted_in_at)) {
        skip("no_explicit_consent"); continue;
      }
      const stage = eligibleStage(profile?.user_type ?? null, profile?.assigned_stage ?? null);
      if (!stage) { skip("wrong_type_or_missing_stage"); continue; }
      const { data: tasks } = await db.from("daily_tasks")
        .select("recommendation_key,task_text,source_route")
        .eq("user_id", choice.user_id).eq("is_completed", false)
        .like("recommendation_key", `stage:${STAGE_KEYS[stage - 1]}:%`)
        .order("task_date", { ascending: false }).limit(1);
      const task = tasks?.[0];
      if (!task?.recommendation_key || !task.task_text) {
        skip("no_unfinished_stage_action"); continue;
      }
      const { data: userResult } = await db.auth.admin.getUserById(choice.user_id);
      const recipient = userResult.user?.email;
      if (!recipient || !userResult.user?.email_confirmed_at) {
        skip("unconfirmed_or_missing_email"); continue;
      }
      if (preview) { counts.eligible++; continue; }
      const { data: claimId, error: claimError } = await db.rpc("claim_account_engagement_email", {
        p_user_id: choice.user_id, p_campaign: "stage_guidance", p_action_key: task.recommendation_key,
      });
      if (claimError || !claimId) { skip("claim_denied_or_frequency_cap"); continue; }
      counts.eligible++;
      const [{ data: latestChoice }, { data: latestTask }] = await Promise.all([
        db.from("notification_preferences").select("stage_guidance_emails")
          .eq("user_id", choice.user_id).maybeSingle(),
        db.from("daily_tasks").select("is_completed")
          .eq("user_id", choice.user_id).eq("recommendation_key", task.recommendation_key).maybeSingle(),
      ]);
      if (latestChoice?.stage_guidance_emails !== true || !latestTask || latestTask.is_completed) {
        await db.rpc("finish_account_engagement_email", { p_claim_id: claimId });
        skip("opted_out_or_task_done"); continue;
      }
      const actionUrl = appLink(task.source_route || "/dashboard/tasks", appUrl);
      const name = (profile.full_name || "there").split(" ")[0];
      const message = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
        <p>Hi ${html(name)},</p><h2>${html(STAGE_TOPICS[stage - 1])}</h2>
        <p>Your next open action is: <strong>${html(task.task_text)}</strong></p>
        <p><a href="${html(actionUrl)}">Open your action</a></p>
        <p style="color:#64748b;font-size:12px">You enabled Stage guidance emails. <a href="${appUrl}/account#notification-preferences">Turn them off in notification settings</a>.</p>
      </div>`;
      try {
        const { data: sent, error: sendError } = await resend!.emails.send({
          from: Deno.env.get("FROM_EMAIL") || "Creatives Takeover <noreply@creatives-takeover.com>",
          to: [recipient], subject: STAGE_SUBJECTS[stage - 1], html: message,
        });
        if (sendError || !sent?.id) {
          await db.rpc("finish_account_engagement_email", { p_claim_id: claimId });
          skip("provider_failed"); continue;
        }
        await db.rpc("finish_account_engagement_email", { p_claim_id: claimId, p_resend_id: sent.id });
        counts.sent++;
      } catch {
        // Leave claim pending: Resend might have accepted the message.
        skip("provider_outcome_unknown");
      }
    }
    if (choices.length < 100) break;
  }
  return json({ ok: true, preview, counts });
});
