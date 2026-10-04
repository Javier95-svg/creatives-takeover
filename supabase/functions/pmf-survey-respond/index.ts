import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { emitBusinessEvent } from "../_shared/analytics.ts";
import { fixedFollowUp } from "../_shared/pmf-follow-up.ts";

// Public endpoint: a logged-out visitor submits a PMF survey response.
// verify_jwt stays true — supabase-js attaches the anon JWT for anonymous callers,
// same as demo-studio-lead. The insert runs with the service role so it never
// depends on the caller's RLS context, but only for surveys that are published.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_PER_MIN = 10;
const PMF_REQUIRED_SIGNALS = 25;
const VALID_ANSWERS = ["very", "somewhat", "not"];
// "used": answered the Sean Ellis question and counts toward the 40% metric.
// "concept_only": has only seen the idea, so their feedback is kept but the
// Sean Ellis answer is not asked (the table enforces this pairing).
const VALID_USAGE = ["used", "concept_only"];

interface RespondRequest {
  /** 'follow_up' returns the "why?" question for an answer; nothing is stored. */
  action?: string;
  slug?: string;
  followUpQuestion?: string;
  followUpAnswer?: string;
  seanEllisAnswer?: string;
  productUsage?: string;
  mainBenefit?: string;
  wouldUseInstead?: string;
  role?: string;
  feedback?: string;
  email?: string;
  honeypot?: string;
  sessionId?: string;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || "unknown";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function participantHash(req: Request, surveyId: string, email: string) {
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const identity = email || `${ip}:${req.headers.get("user-agent") || "unknown"}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${surveyId}:${identity}`));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const clean = (value: string | undefined, max: number): string | null => {
  const v = (value || "").trim();
  return v ? v.slice(0, max) : null;
};

// AI-written follow-up questions per survey; after this the fixed question is
// used, so a popular survey never costs the founder anything.
const FOLLOW_UP_AI_CAP = 100;

async function writeFollowUp(answer: string, productName: string, audience: string | null): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;
  const meaning = answer === "very" ? "would be very disappointed without it"
    : answer === "somewhat" ? "would be somewhat disappointed without it"
      : answer === "not" ? "would not be disappointed without it"
        : "has not used it yet";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 60,
        messages: [
          { role: "system", content: "You write one short follow-up question for a product survey. Plain words, under 18 words, no leading or yes/no questions, no emoji, no quotes. Return only the question." },
          { role: "user", content: `Product: ${productName}. Audience: ${audience || "unknown"}. The respondent ${meaning}. Ask why, in a way that gets a concrete answer in their own words.` },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");
    return text && text.length <= 200 && text.endsWith("?") ? text : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RespondRequest = await req.json();

    // Honeypot: a bot filled the hidden field — accept silently, store nothing.
    if ((body.honeypot || "").trim().length > 0) {
      return json({ success: true, filtered: true });
    }

    const slug = (body.slug || "").trim();
    const answer = (body.seanEllisAnswer || "").trim();

    if (body.action === "follow_up") {
      if (!slug) return json({ success: false, error: "Missing survey." }, 400);
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { error: rlError } = await admin.rpc("assert_rate_limit", {
        p_key: `pmf_survey_follow_up:${getClientIp(req)}`,
        p_user_id: null,
        p_max_per_minute: RATE_LIMIT_PER_MIN,
      });
      if (rlError && /rate_limit_exceeded/i.test(rlError.message || "")) {
        return json({ success: true, question: fixedFollowUp(answer, ""), source: "fixed" });
      }
      const { data: survey } = await admin
        .from("pmf_surveys")
        .select("id, status, product_name, audience")
        .eq("slug", slug)
        .maybeSingle();
      if (!survey || survey.status !== "published") {
        return json({ success: false, error: "This survey is not accepting responses." }, 404);
      }
      const productName = (survey.product_name || "").trim();
      const fixed = fixedFollowUp(answer, productName);
      const { data: claimed } = await admin.rpc("claim_pmf_follow_up_slot", { p_survey_id: survey.id, p_cap: FOLLOW_UP_AI_CAP });
      if (claimed !== true) return json({ success: true, question: fixed, source: "fixed" });
      const written = await writeFollowUp(answer, productName || "this product", survey.audience ?? null);
      return json({ success: true, question: written ?? fixed, source: written ? "ai" : "fixed" });
    }
    // Older survey links do not send productUsage; those keep the previous
    // behaviour (an answer is required and usage is stored as unknown).
    const usage = VALID_USAGE.includes((body.productUsage || "").trim()) ? (body.productUsage || "").trim() : null;
    const conceptOnly = usage === "concept_only";
    if (!slug) return json({ success: false, error: "Missing survey." }, 400);
    if (!conceptOnly && !VALID_ANSWERS.includes(answer)) {
      return json({ success: false, error: "Please choose how you would feel." }, 400);
    }

    const email = (body.email || "").trim().toLowerCase();
    if (email && !isValidEmail(email)) {
      return json({ success: false, error: "That email looks invalid." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit per IP. Only block on a genuine breach; any other RPC error
    // (infra hiccup) must not cost the founder a real response.
    const { error: rlError } = await admin.rpc("assert_rate_limit", {
      p_key: `pmf_survey_respond:${getClientIp(req)}`,
      p_user_id: null,
      p_max_per_minute: RATE_LIMIT_PER_MIN,
    });
    if (rlError) {
      if (/rate_limit_exceeded/i.test(rlError.message || "")) {
        return json({ success: false, error: "Too many responses right now. Try again in a moment." }, 429);
      }
      console.error("pmf-survey-respond: rate-limit check failed (continuing):", rlError.message);
    }

    const { data: survey, error: surveyError } = await admin
      .from("pmf_surveys")
      .select("id, user_id, status, validation_context_id, originating_handoff_id")
      .eq("slug", slug)
      .maybeSingle();
    if (surveyError) throw surveyError;
    if (!survey || survey.status !== "published") {
      return json({ success: false, error: "This survey is not accepting responses." }, 404);
    }

    const verifiedParticipantHash = await participantHash(req, survey.id, email);
    const responseRow: Record<string, unknown> = {
      survey_id: survey.id,
      sean_ellis_answer: conceptOnly ? null : answer,
      ...(usage ? { product_usage: usage } : {}),
      main_benefit: clean(body.mainBenefit, 2000),
      would_use_instead: clean(body.wouldUseInstead, 2000),
      role: clean(body.role, 200),
      feedback: clean(body.feedback, 4000),
      email: email || null,
      session_id: clean(body.sessionId, 100),
      participant_hash: verifiedParticipantHash,
      verified: true,
    };
    const followUp = clean(body.followUpAnswer, 2000)
      ? { follow_up_question: clean(body.followUpQuestion, 300), follow_up_answer: clean(body.followUpAnswer, 2000) }
      : null;
    let { error: insertError } = await admin
      .from("pmf_survey_responses")
      .insert(followUp ? { ...responseRow, ...followUp } : responseRow);
    // Before the follow-up migration (20261005120000) the columns do not exist;
    // keep the response rather than lose it.
    if (insertError && followUp && (insertError.code === "42703" || /follow_up/i.test(insertError.message || ""))) {
      ({ error: insertError } = await admin.from("pmf_survey_responses").insert(responseRow));
    }
    // A repeat email for the same survey is a no-op, not an error.
    if (insertError && !/duplicate key|unique/i.test(insertError.message || "")) {
      throw insertError;
    }
    const responseInserted = !insertError;

    if (responseInserted) {
      await emitBusinessEvent({
        eventName: "pmf_survey_response_received",
        userId: survey.user_id,
        properties: {
          survey_slug: slug,
          sean_ellis_answer: conceptOnly ? null : answer,
          product_usage: usage ?? "unknown",
          has_email: Boolean(email),
          has_main_benefit: Boolean(clean(body.mainBenefit, 2000)),
          has_feedback: Boolean(clean(body.feedback, 4000)),
        },
      });
    }

    const { data: responseRows, error: responseCountError } = await admin
      .from("pmf_survey_responses")
      .select("sean_ellis_answer")
      .eq("survey_id", survey.id)
      .eq("verified", true);

    if (responseCountError) {
      console.error("pmf-survey-respond: response count sync failed:", responseCountError.message);
    } else {
      let very = 0;
      let somewhat = 0;
      let notDisappointed = 0;
      for (const row of responseRows || []) {
        if (row.sean_ellis_answer === "very") very++;
        else if (row.sean_ellis_answer === "somewhat") somewhat++;
        else if (row.sean_ellis_answer === "not") notDisappointed++;
      }
      const total = very + somewhat + notDisappointed;
      const { error: evidenceError } = await admin
        .from("pmf_context_evidence")
        .upsert({
          user_id: survey.user_id,
          validation_context_id: survey.validation_context_id,
          originating_handoff_id: survey.originating_handoff_id,
          survey_results_count: total,
          required_signals: PMF_REQUIRED_SIGNALS,
          sean_ellis_very_disappointed: very,
          sean_ellis_somewhat_disappointed: somewhat,
          sean_ellis_not_disappointed: notDisappointed,
          sean_ellis_updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,validation_context_id" });
      if (evidenceError) {
        console.error("pmf-survey-respond: evidence sync failed:", evidenceError.message);
      }
    }

    return json({ success: true });
  } catch (error) {
    console.error("pmf-survey-respond error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
