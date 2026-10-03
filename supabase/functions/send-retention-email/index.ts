import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import {
  buildAuthenticatedReturnUrl,
  INACTIVE_CAMPAIGN_KEY,
  isInactiveSequence,
} from "../_shared/inactive-retention-email.ts";
import { assignVariants, buildRoadmapEmail, CONTEXT_VERSION, resolveRetention } from "../_shared/roadmap-retention.ts";
import { loadRoadmapContext } from "../_shared/roadmap-retention-context.ts";
import { cleanCopy, renderPlainEmail } from "../_shared/email-voice.ts";
import { factKeys, loadProjectFacts, type ProjectFacts } from "../_shared/retention-project-facts.ts";
import {
  type ActivationIntent,
  buildSequenceCopy,
  finalizeCopy,
  type SequenceCopy,
  type SequenceHints,
  type SequenceType,
} from "../_shared/retention-sequence-copy.ts";
import { type CopySource, parseAiCopyMode, shouldUseAi } from "../_shared/retention-personalizer.ts";
import { generatePersonalizedCopy } from "../_shared/retention-personalizer-client.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RetentionEmailRequest {
  userId: string;
  email: string;
  fullName?: string | null;
  niche?: string | null;
  sequence: SequenceType;
  activationIntent?: ActivationIntent;
  mentorId?: string;
  mentorName?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  contextHeadline?: string;
  contextBody?: string;
  savedMentorCount?: number;
  unreadMessageCount?: number;
  weeklyCommitment?: string;
  weeklyOutcome?: string;
  weeklyOutcomeState?: "completed" | "missed" | "open";
  activeDaysLast14?: number;
  suggestedFocus?: string;
}

// The service client is used untyped here, as in the shared retention loaders.
// deno-lint-ignore no-explicit-any
type ServiceClient = { from: (table: string) => any };

interface InactiveClaimRow {
  claim_status: string;
  claimed_log_id: string | null;
  claimed_touch_index: number | null;
}

// Bumped from the roadmap-only context: every email now also reads project facts.
const PERSONALIZED_CONTEXT_VERSION = CONTEXT_VERSION + 1;
const TEMPLATE_VERSION = 3;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function signUnsubscribeToken(userId: string, serviceRoleKey: string) {
  const secret = Deno.env.get("EMAIL_SEQUENCE_UNSUBSCRIBE_SECRET")?.trim() || serviceRoleKey;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildPreferencesUrl(appUrl: string) {
  const login = new URL("/login", appUrl);
  login.searchParams.set("return", "/account#notification-preferences");
  return login.toString();
}

function normalizeAppUrl(value: string) {
  return value.replace(/\/$/, "");
}

function getDefaultCta(sequence: SequenceType, intent: ActivationIntent | undefined, appUrl: string) {
  if (sequence === "routine_reminder") return `${appUrl}/dashboard/routine`;
  switch (intent) {
    case "run_icp":
      return `${appUrl}/icp-builder`;
    case "save_mentor":
      return `${appUrl}/mentorship?mentorSource=retention-saved`;
    case "send_message":
      return `${appUrl}/messages`;
    case "book_call":
      return `${appUrl}/mentorship?mentorSource=retention-call`;
    case "build_demo":
      return `${appUrl}/demo-studio`;
    default:
      return `${appUrl}/dashboard`;
  }
}

/** Adds the log id and UTM tags the app uses to attribute a return to this email. */
function withReturnTracking(url: string, args: { logId: string; sequence: string; templateKey: string }) {
  try {
    const target = new URL(url);
    target.searchParams.set("retention_email_id", args.logId);
    target.searchParams.set("utm_source", "retention_email");
    target.searchParams.set("utm_medium", "email");
    target.searchParams.set("utm_campaign", args.sequence);
    target.searchParams.set("utm_content", args.templateKey);
    return target.toString();
  } catch {
    return url;
  }
}

async function unsubscribeLinks(appUrl: string, supabaseUrl: string, userId: string, serviceKey: string) {
  const token = await signUnsubscribeToken(userId, serviceKey);
  return {
    unsubscribeUrl: `${appUrl}/unsubscribe?user_id=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`,
    oneClickUnsubscribeUrl: `${supabaseUrl}/functions/v1/email-sequences?unsubscribe=1&user_id=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`,
  };
}

function personalSender(fromEmail: string) {
  return {
    from: `Javier from Creatives Takeover <${fromEmail}>`,
    replyTo: Deno.env.get("RETENTION_REPLY_TO")?.trim()
      || Deno.env.get("REPLY_TO_EMAIL")?.trim()
      || "javier@creatives-takeover.com",
  };
}

/**
 * Swaps the template subject and opening paragraph for model-written ones when
 * RETENTION_AI_COPY allows it for this founder and the result passes every
 * check. Any other outcome keeps the hand-written template.
 */
async function personalize(args: {
  userId: string;
  sequence: SequenceType;
  facts: ProjectFacts;
  hints: SequenceHints;
  template: SequenceCopy;
  ctaLabel: string;
}): Promise<{ copy: SequenceCopy; source: CopySource }> {
  const mode = parseAiCopyMode(Deno.env.get("RETENTION_AI_COPY"));
  if (!shouldUseAi(mode, args.userId, args)) return { copy: args.template, source: "template" };

  const outcome = await generatePersonalizedCopy(args.userId, args);
  if (!outcome.copy) {
    console.warn("send-retention-email: AI copy rejected, using template", {
      userId: args.userId,
      sequence: args.sequence,
      rejection: outcome.rejection,
    });
    return { copy: args.template, source: "ai_rejected" };
  }
  return {
    copy: { ...args.template, subject: outcome.copy.subject, opener: outcome.copy.paragraph },
    source: "ai",
  };
}

/** Resend's free tier allows 2 requests a second, so rate limits get a jittered retry. */
async function sendWithRetry(payload: Record<string, unknown>) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await resend.emails.send(payload as never);
    if (!error && data?.id) return { id: data.id as string, error: null };
    lastError = error;
    const errorRecord = asRecord(error);
    const message = `${stringValue(errorRecord.name) ?? ""} ${stringValue(errorRecord.message) ?? ""}`;
    const rateLimited = errorRecord.statusCode === 429 || /rate|too many/i.test(message);
    if (!rateLimited && attempt >= 1) break;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1) + Math.random() * 300));
  }
  return { id: null, error: lastError };
}

/**
 * Logs a delivered email. The personalization columns come from a migration
 * that may not be applied yet, so a failed insert retries with the base columns.
 */
async function logSentEmail(supabase: ServiceClient, row: Record<string, unknown>, extra: Record<string, unknown>) {
  const { error } = await supabase.from("retention_email_log").insert({ ...row, ...extra });
  if (!error) return;
  console.warn("send-retention-email: extended log insert failed, retrying base columns", error.message);
  const { error: baseError } = await supabase.from("retention_email_log").insert(row);
  if (baseError) console.error("send-retention-email: log insert failed", baseError.message);
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body: RetentionEmailRequest = await req.json();
    const {
      userId,
      email,
      fullName,
      sequence,
      activationIntent,
      mentorName,
      ctaUrl,
      ctaLabel,
      contextHeadline,
      savedMentorCount,
      unreadMessageCount,
      weeklyCommitment,
      weeklyOutcome,
      weeklyOutcomeState,
      activeDaysLast14,
      suggestedFocus,
    } = body;

    if (!email || !sequence || !userId) {
      return json({ error: "Missing required fields: userId, email, sequence" }, 400);
    }

    const appUrl = normalizeAppUrl(Deno.env.get("APP_URL") || "https://creatives-takeover.com");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const preferencesUrl = buildPreferencesUrl(appUrl);

    // Mentors are service providers offering their time on the platform, not
    // active founders. Exclude them from every retention sequence routed through
    // this sender (weekly scorecards, dormant/inactive nudges, ICP sprint,
    // routine reminders, lifecycle).
    const { data: mentorRow } = await supabase
      .from("mentors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (mentorRow) {
      return json({ ok: true, skipped: true, reason: "mentor_excluded" });
    }

    if (isInactiveSequence(sequence)) {
      const authorization = req.headers.get("Authorization") || "";
      const callerToken = authorization.replace(/^Bearer\s+/i, "").trim();
      if (callerToken !== supabaseServiceKey) {
        const caller = callerToken ? await supabase.auth.getUser(callerToken) : null;
        if (!caller?.data.user || caller.data.user.id !== userId) {
          return json({ ok: false, error: "Forbidden" }, 403);
        }
      }

      const { data: settings, error: settingsError } = await supabase.from("retention_roadmap_settings")
        .select("*").eq("singleton", true).single();

      // The roadmap campaign needs its own tables and an explicit switch. When
      // either is missing, the founder still gets the project-aware template
      // below instead of silently getting nothing.
      if (settingsError || !settings?.enabled) {
        console.warn("send-retention-email: roadmap campaign unavailable, using sequence copy", {
          userId,
          sequence,
          reason: settingsError ? "settings_unavailable" : "campaign_disabled",
        });
      } else {
        const authResult = await supabase.auth.admin.getUserById(userId);
        const canonicalEmail = authResult.data.user?.email?.trim();
        if (!canonicalEmail) {
          return json({ ok: true, skipped: true, reason: "missing_account_email" });
        }

        const { data: claimData, error: claimError } = await supabase.rpc("claim_inactive_retention_email", {
          p_user_id: userId,
          p_email: canonicalEmail,
          p_sequence: sequence,
          p_campaign_key: INACTIVE_CAMPAIGN_KEY,
        });
        if (claimError) throw claimError;

        const claim = (Array.isArray(claimData) ? claimData[0] : claimData) as InactiveClaimRow | null;
        if (!claim || claim.claim_status !== "claimed" || !claim.claimed_log_id || !claim.claimed_touch_index) {
          return json({ ok: true, skipped: true, reason: claim?.claim_status || "claim_unavailable" });
        }

        const logId = claim.claimed_log_id;
        let providerAccepted = false;

        try {
          // Fresh database context after the claim overrides all request personalization.
          const [context, facts] = await Promise.all([
            loadRoadmapContext(supabase, userId, authResult.data.user?.last_sign_in_at ?? null, settings),
            loadProjectFacts(supabase, userId, { fullName, email: canonicalEmail }),
          ]);
          const decision = resolveRetention(context);
          if (!decision) {
            const { error } = await supabase.rpc("fail_inactive_retention_email", { p_log_id: logId, p_error: "no_eligible_context" });
            if (error) throw error;
            return json({ ok: true, skipped: true, reason: "no_eligible_context" });
          }
          const { data: experiment, error: experimentError } = await supabase.from("retention_roadmap_experiments")
            .select("*").eq("segment", decision.segment).single();
          if (experimentError) throw experimentError;
          const variants = assignVariants(userId, decision.segment, {
            phase: experiment.phase, selectedSubject: experiment.selected_subject, version: experiment.version,
          });
          const { unsubscribeUrl, oneClickUnsubscribeUrl } = await unsubscribeLinks(appUrl, supabaseUrl, userId, supabaseServiceKey);
          const preview = buildRoadmapEmail(decision, variants, { ctaUrl: appUrl, preferencesUrl, unsubscribeUrl });
          const authenticatedCtaUrl = buildAuthenticatedReturnUrl({
            appUrl,
            targetPath: decision.path,
            logId,
            templateKey: preview.templateKey,
          });
          const roadmapEmail = buildRoadmapEmail(decision, variants, { ctaUrl: authenticatedCtaUrl, preferencesUrl, unsubscribeUrl });

          // The roadmap copy is the template; the model may rewrite its opening.
          const hints: SequenceHints = { lastStep: decision.signal };
          const { copy, source } = await personalize({
            userId,
            sequence,
            facts,
            hints,
            template: { subject: roadmapEmail.subject, opener: roadmapEmail.text, followUp: [], defaultCtaLabel: roadmapEmail.ctaLabel },
            ctaLabel: roadmapEmail.ctaLabel,
          });
          const rendered = source === "ai"
            ? renderPlainEmail({
              greeting: `Hi ${facts.firstName},`,
              paragraphs: [copy.opener, decision.action],
              ctaLabel: roadmapEmail.ctaLabel,
              ctaUrl: authenticatedCtaUrl,
              preferencesUrl,
              unsubscribeUrl,
            })
            : { html: roadmapEmail.html, text: roadmapEmail.text };

          const { error: metadataError } = await supabase.from("retention_email_log").update({
            segment: decision.segment, experiment_phase: experiment.phase, experiment_version: experiment.version,
            subject_variant: variants.subject, body_variant: variants.body, context_version: CONTEXT_VERSION,
          }).eq("id", logId).eq("delivery_status", "pending");
          if (metadataError) throw metadataError;
          // Separate update: these columns arrive in a later migration.
          const { error: personalizationError } = await supabase.from("retention_email_log").update({
            copy_source: source, context_keys: factKeys(facts), context_version: PERSONALIZED_CONTEXT_VERSION,
          }).eq("id", logId);
          if (personalizationError) console.warn("send-retention-email: personalization metadata not logged", personalizationError.message);

          const sendResult = await resend.emails.send({
            ...personalSender(fromEmail),
            to: [canonicalEmail],
            subject: copy.subject,
            html: rendered.html,
            text: source === "ai"
              ? rendered.text
              : `${roadmapEmail.text}\n\n${roadmapEmail.ctaLabel}: ${roadmapEmail.ctaUrl}\n\nManage preferences: ${preferencesUrl}\nUnsubscribe: ${unsubscribeUrl}`,
            headers: {
              "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          } as never);

          if (sendResult?.error || !sendResult?.data?.id) {
            const providerError = asRecord(sendResult?.error);
            throw new Error(stringValue(providerError.message) || "Resend did not accept the inactive email");
          }
          providerAccepted = true;

          const templateKey = source === "ai" ? `${roadmapEmail.templateKey}_ai` : roadmapEmail.templateKey;
          const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_inactive_retention_email", {
            p_log_id: logId,
            p_template_key: templateKey,
            p_template_version: roadmapEmail.templateVersion,
            p_cta_url: roadmapEmail.ctaUrl,
            p_resend_id: sendResult.data.id,
          });
          if (finalizeError || finalized !== true) {
            throw finalizeError || new Error("Inactive email delivery could not be finalized");
          }

          console.warn("send-retention-email: inactive email sent", {
            userId,
            sequence,
            templateKey,
            copySource: source,
            touchIndex: claim.claimed_touch_index,
            id: sendResult.data.id,
          });

          return json({
            ok: true,
            id: sendResult.data.id,
            templateKey,
            copySource: source,
            touchIndex: claim.claimed_touch_index,
          });
        } catch (inactiveError) {
          if (!providerAccepted) {
            await supabase.rpc("fail_inactive_retention_email", {
              p_log_id: logId,
              p_error: inactiveError instanceof Error ? inactiveError.message : "inactive_send_failed",
            });
          }
          throw inactiveError;
        }
      }
    }

    // routine_reminder cadence is governed upstream (per-day dedup + global weekly
    // cap in process_routine_reminder_emails), so it is exempt from the 6-day
    // per-sequence guard that protects the slower lifecycle sequences. The guard
    // runs before any model call so skipped sends cost nothing.
    if (sequence !== "routine_reminder" && sequence !== "task_plan_digest") {
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existingSend } = await supabase
        .from("retention_email_log")
        .select("id")
        .eq("user_id", userId)
        .eq("sequence", sequence)
        .gte("sent_at", sixDaysAgo)
        .limit(1)
        .maybeSingle();

      if (existingSend) {
        return json({ ok: true, skipped: true, reason: "already_sent_recently" });
      }
    }

    const facts = await loadProjectFacts(supabase, userId, { fullName, email });
    const hints: SequenceHints = {
      intent: activationIntent,
      mentorName,
      unreadMessageCount,
      savedMentorCount,
      headline: contextHeadline,
      weeklyCommitment,
      weeklyOutcome,
      weeklyOutcomeState,
      activeDaysLast14,
      suggestedFocus,
    };
    const template = finalizeCopy(buildSequenceCopy(sequence, facts, hints));
    const finalCtaLabel = cleanCopy(ctaLabel) || template.defaultCtaLabel;
    const { copy, source } = await personalize({ userId, sequence, facts, hints, template, ctaLabel: finalCtaLabel });
    const templateKey = `${sequence}_v${TEMPLATE_VERSION}${source === "ai" ? "_ai" : ""}`;

    // The log id is chosen before sending so the button can carry it. A signed-in
    // click then records the return (RetentionEmailAttribution), which is what
    // the template vs AI comparison measures.
    const logId = crypto.randomUUID();
    const finalCtaUrl = withReturnTracking(ctaUrl || getDefaultCta(sequence, activationIntent, appUrl), {
      logId,
      sequence,
      templateKey,
    });

    const { unsubscribeUrl, oneClickUnsubscribeUrl } = await unsubscribeLinks(appUrl, supabaseUrl, userId, supabaseServiceKey);
    const rendered = renderPlainEmail({
      greeting: `Hi ${facts.firstName},`,
      paragraphs: [copy.opener, ...copy.followUp],
      ctaLabel: finalCtaLabel,
      ctaUrl: finalCtaUrl,
      preferencesUrl,
      unsubscribeUrl,
    });

    const sent = await sendWithRetry({
      ...personalSender(fromEmail),
      to: [email],
      subject: copy.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    // Only a real send is logged. A logged failure would block the next attempt
    // through the six-day guard above.
    if (!sent.id) {
      const failure = asRecord(sent.error);
      console.error("send-retention-email: send failed, not logging", { userId, sequence, error: sent.error });
      return json({ ok: false, error: "send_failed", detail: stringValue(failure.message) ?? "unknown" }, 502);
    }

    await logSentEmail(
      supabase,
      { id: logId, user_id: userId, email, sequence, sent_at: new Date().toISOString(), resend_id: sent.id },
      {
        delivery_status: "sent",
        cta_url: finalCtaUrl,
        copy_source: source,
        context_keys: factKeys(facts),
        context_version: PERSONALIZED_CONTEXT_VERSION,
        template_key: templateKey,
        template_version: TEMPLATE_VERSION,
      },
    );

    console.warn("send-retention-email: sent", { userId, sequence, copySource: source, id: sent.id });

    return json({ ok: true, id: sent.id, copySource: source });
  } catch (error: unknown) {
    console.error("send-retention-email: error", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
