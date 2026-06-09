import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";
import { resolveCreditIdempotencyKey } from "../_shared/request-idempotency.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

type Mode = "full_kit" | "storyboard" | "vsl_scripts" | "launch_copy";

interface DemoStudioGeneratorRequest {
  mode?: Mode;
  project?: {
    id?: string;
    name?: string;
    tagline?: string | null;
    category?: string | null;
  };
  brief?: {
    audience?: string | null;
    problem?: string | null;
    product_promise?: string | null;
    aha_moment?: string | null;
    primary_cta_label?: string | null;
    primary_cta_url?: string | null;
    tone?: string | null;
    product_stage?: string | null;
    demo_goal?: string | null;
  };
}

const forbiddenCopyTerms = [
  "revolutionary",
  "game-changing",
  "innovative",
  "powerful",
  "seamless",
  "effortless",
  "cutting-edge",
  "next-level",
  "disruptive",
  "world-class",
  "best-in-class",
  "synergy",
];

function cleanString(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function walkStrings(value: unknown, visitor: (text: string, path: string) => void, path = "kit") {
  if (typeof value === "string") {
    visitor(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, visitor, `${path}.${index}`));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => walkStrings(item, visitor, `${path}.${key}`));
  }
}

function validateRequest(body: DemoStudioGeneratorRequest): { mode: Mode; errors: string[] } {
  const mode = body.mode || "full_kit";
  const errors: string[] = [];
  if (!["full_kit", "storyboard", "vsl_scripts", "launch_copy"].includes(mode)) {
    errors.push("mode is invalid");
  }
  if (!cleanString(body.project?.name, 80)) errors.push("project.name is required");
  if (!cleanString(body.brief?.audience, 180)) errors.push("brief.audience is required");
  if (!cleanString(body.brief?.problem, 240)) errors.push("brief.problem is required");
  if (!cleanString(body.brief?.product_promise, 240)) errors.push("brief.product_promise is required");
  if (!cleanString(body.brief?.aha_moment, 240)) errors.push("brief.aha_moment is required");
  return { mode: mode as Mode, errors };
}

function validateKitOutput(kit: any, mode: Mode): string[] {
  const errors: string[] = [];
  if (!kit || typeof kit !== "object") return ["output must be an object"];

  if (mode === "full_kit" || mode === "storyboard") {
    if (!Array.isArray(kit.storyboard) || kit.storyboard.length < 3 || kit.storyboard.length > 7) {
      errors.push("storyboard must contain 3-7 steps");
    }
    kit.storyboard?.forEach((step: any, index: number) => {
      if (!cleanString(step?.title, 80)) errors.push(`storyboard.${index}.title is required`);
      if (!cleanString(step?.caption, 220)) errors.push(`storyboard.${index}.caption is required`);
      if (!cleanString(step?.speaker_notes, 700)) errors.push(`storyboard.${index}.speaker_notes is required`);
      if (!cleanString(step?.hotspot_label, 80)) errors.push(`storyboard.${index}.hotspot_label is required`);
      if (!["next", "goto", "url"].includes(step?.suggested_action || "next")) errors.push(`storyboard.${index}.suggested_action is invalid`);
    });
  }

  if (mode === "full_kit" || mode === "vsl_scripts") {
    if (!Array.isArray(kit.vsl_scripts) || kit.vsl_scripts.length !== 3) {
      errors.push("vsl_scripts must contain A/B/C scripts");
    }
    kit.vsl_scripts?.forEach((script: any, index: number) => {
      if (!["A", "B", "C"].includes(script?.variation)) errors.push(`vsl_scripts.${index}.variation is invalid`);
      if (!cleanString(script?.title, 80)) errors.push(`vsl_scripts.${index}.title is required`);
      if (!cleanString(script?.hook, 220)) errors.push(`vsl_scripts.${index}.hook is required`);
      if (!Array.isArray(script?.outline) || script.outline.length < 3) errors.push(`vsl_scripts.${index}.outline is required`);
      if (!cleanString(script?.script, 2200)) errors.push(`vsl_scripts.${index}.script is required`);
      const target = Number(script?.target_duration_seconds);
      if (!Number.isFinite(target) || target < 30 || target > 180) errors.push(`vsl_scripts.${index}.target_duration_seconds is invalid`);
    });
  }

  if (mode === "full_kit" || mode === "launch_copy") {
    const copy = kit.launch_copy;
    if (!copy || typeof copy !== "object") errors.push("launch_copy is required");
    if (!Array.isArray(copy?.headlines) || copy.headlines.length < 3) errors.push("launch_copy.headlines must contain 3 variants");
    copy?.headlines?.forEach((headline: any, index: number) => {
      if (!cleanString(headline?.headline, 90)) errors.push(`launch_copy.headlines.${index}.headline is required`);
      if (!cleanString(headline?.subheadline, 180)) errors.push(`launch_copy.headlines.${index}.subheadline is required`);
      if (!cleanString(headline?.rationale, 160)) errors.push(`launch_copy.headlines.${index}.rationale is required`);
    });
    if (!cleanString(copy?.subheadline, 180)) errors.push("launch_copy.subheadline is required");
    if (!cleanString(copy?.cta_label, 36)) errors.push("launch_copy.cta_label is required");
    if (!Array.isArray(copy?.proof_bullets) || copy.proof_bullets.length < 3) errors.push("launch_copy.proof_bullets must contain at least 3 bullets");
  }

  walkStrings(kit, (text, path) => {
    if (/\{\{|\[YOUR|\[INSERT|\[.*?\]/i.test(text)) errors.push(`${path} contains placeholder copy`);
    const lower = text.toLowerCase();
    if (forbiddenCopyTerms.some((term) => lower.includes(term))) errors.push(`${path} contains forbidden term`);
  });

  return errors;
}

function buildSystemPrompt(mode: Mode): string {
  return `You are a senior product marketer and demo strategist for early-stage startup founders.

Create Demo Studio assets that are specific, honest, useful, and immediately usable.

Rules:
- Return one valid JSON object and no markdown.
- Do not use placeholders.
- Avoid hype and generic marketing language.
- Keep copy concrete enough that a founder can paste it into a product demo, Loom script, and launch page.
- The selected mode is ${mode}. Return only the keys needed for that mode, except full_kit must return all keys.`;
}

function buildUserPrompt(body: DemoStudioGeneratorRequest, mode: Mode): string {
  const project = body.project || {};
  const brief = body.brief || {};
  return `Generate Demo Studio assets.

PROJECT
Name: ${cleanString(project.name, 80)}
Tagline: ${cleanString(project.tagline, 180) || "Not provided"}
Category: ${cleanString(project.category, 80) || "Not provided"}

BRIEF
Audience: ${cleanString(brief.audience, 180)}
Problem: ${cleanString(brief.problem, 240)}
Product promise: ${cleanString(brief.product_promise, 240)}
Aha moment: ${cleanString(brief.aha_moment, 240)}
CTA label: ${cleanString(brief.primary_cta_label, 40) || "Get early access"}
CTA URL: ${cleanString(brief.primary_cta_url, 200) || "Not provided"}
Tone: ${cleanString(brief.tone, 40) || "conversational"}
Product stage: ${cleanString(brief.product_stage, 40) || "prototype"}
Demo goal: ${cleanString(brief.demo_goal, 80) || "collect_signups"}

OUTPUT SCHEMA
{
  "storyboard": [
    { "title": "string", "caption": "string", "speaker_notes": "string", "hotspot_label": "string", "suggested_action": "next" }
  ],
  "vsl_scripts": [
    { "variation": "A", "title": "string", "hook": "string", "outline": ["string"], "script": "string", "target_duration_seconds": 75 },
    { "variation": "B", "title": "string", "hook": "string", "outline": ["string"], "script": "string", "target_duration_seconds": 75 },
    { "variation": "C", "title": "string", "hook": "string", "outline": ["string"], "script": "string", "target_duration_seconds": 75 }
  ],
  "launch_copy": {
    "headlines": [
      { "variant": "A", "headline": "string", "subheadline": "string", "rationale": "string" },
      { "variant": "B", "headline": "string", "subheadline": "string", "rationale": "string" },
      { "variant": "C", "headline": "string", "subheadline": "string", "rationale": "string" }
    ],
    "subheadline": "string",
    "cta_label": "string",
    "proof_bullets": ["string", "string", "string"],
    "success_message": "string"
  }
}

Mode: ${mode}
For storyboard mode return only storyboard.
For vsl_scripts mode return only vsl_scripts.
For launch_copy mode return only launch_copy.
For full_kit mode return all three keys.`;
}

async function generateKit(openaiApiKey: string, body: DemoStudioGeneratorRequest, mode: Mode) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt(mode) },
        { role: "user", content: buildUserPrompt(body, mode) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.65,
      max_tokens: mode === "full_kit" ? 5000 : 2400,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Demo Studio generator OpenAI error:", errorText);
    const status = response.status === 429 ? 429 : 502;
    throw Object.assign(new Error(`OpenAI API error: ${response.status}`), { status });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw Object.assign(new Error("No content returned from model"), { status: 502 });
  const parsed = JSON.parse(content);
  const validationErrors = validateKitOutput(parsed, mode);
  if (validationErrors.length) {
    throw Object.assign(new Error(`Demo Studio validation failed: ${validationErrors.join("; ")}`), { status: 422 });
  }
  return parsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: DemoStudioGeneratorRequest = await req.json();
    const validation = validateRequest(body);
    if (validation.errors.length) {
      return new Response(JSON.stringify({ success: false, error: "Invalid Demo Studio brief", errorCode: "VALIDATION_FAILED", details: validation.errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creditCost = CREDIT_COSTS.WAITLIST_GENERATION;
    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: "WAITLIST_GENERATION",
      requestFingerprint: {
        mode: validation.mode,
        project: body.project,
        brief: body.brief,
      },
    });
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      "Demo Studio AI Drafts",
      undefined,
      {
        projectName: cleanString(body.project?.name, 80),
        mode: validation.mode,
        idempotencyKey,
        entitlementFeature: "WAITLIST_GENERATION",
      },
    );
    const chargedCredits = (creditResult.usedFromQuota ?? 0) + (creditResult.usedFromBalance ?? 0);

    if (!creditResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: creditResult.error || "Insufficient credits",
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredTier: creditResult.requiredTier,
        requiredCredits: creditResult.requiredCredits ?? creditCost,
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error("OpenAI API key not configured");

    try {
      const kit = await generateKit(openaiApiKey, body, validation.mode);
      return new Response(JSON.stringify({
        success: true,
        mode: validation.mode,
        kit,
        creditsUsed: chargedCredits,
        newBalance: creditResult.newBalance,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (aiError) {
      const err = aiError instanceof Error ? aiError : new Error(String(aiError));
      if (chargedCredits > 0) {
        await refundCredits(
          user.id,
          chargedCredits,
          "Demo Studio AI Drafts",
          "Refund: Demo Studio AI processing failed",
          { error: err.message, mode: validation.mode },
        );
      }
      const status = (aiError as { status?: number })?.status === 429 ? 429 : 500;
      const errorCode = status === 429 ? "RATE_LIMIT" : (aiError as { status?: number })?.status === 422 ? "VALIDATION_FAILED" : "GENERATION_FAILED";
      return new Response(JSON.stringify({
        success: false,
        error: "We couldn't generate your Demo Studio drafts. Try again in a moment.",
        errorCode,
      }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Demo Studio generator error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
