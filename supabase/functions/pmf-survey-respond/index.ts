import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Public endpoint: a logged-out visitor submits a PMF survey response.
// verify_jwt stays true — supabase-js attaches the anon JWT for anonymous callers,
// same as demo-studio-lead. The insert runs with the service role so it never
// depends on the caller's RLS context, but only for surveys that are published.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_PER_MIN = 10;
const VALID_ANSWERS = ["very", "somewhat", "not"];

interface RespondRequest {
  slug?: string;
  seanEllisAnswer?: string;
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

const clean = (value: string | undefined, max: number): string | null => {
  const v = (value || "").trim();
  return v ? v.slice(0, max) : null;
};

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
    if (!slug) return json({ success: false, error: "Missing survey." }, 400);
    if (!VALID_ANSWERS.includes(answer)) {
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
      .select("id, status")
      .eq("slug", slug)
      .maybeSingle();
    if (surveyError) throw surveyError;
    if (!survey || survey.status !== "published") {
      return json({ success: false, error: "This survey is not accepting responses." }, 404);
    }

    const { error: insertError } = await admin
      .from("pmf_survey_responses")
      .insert({
        survey_id: survey.id,
        sean_ellis_answer: answer,
        main_benefit: clean(body.mainBenefit, 2000),
        would_use_instead: clean(body.wouldUseInstead, 2000),
        role: clean(body.role, 200),
        feedback: clean(body.feedback, 4000),
        email: email || null,
        session_id: clean(body.sessionId, 100),
      });
    // A repeat email for the same survey is a no-op, not an error.
    if (insertError && !/duplicate key|unique/i.test(insertError.message || "")) {
      throw insertError;
    }

    return json({ success: true });
  } catch (error) {
    console.error("pmf-survey-respond error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
