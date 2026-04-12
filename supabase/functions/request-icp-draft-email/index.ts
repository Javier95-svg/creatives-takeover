import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EntryMode = "fast" | "guided";

interface GuidedInput {
  seed: string;
  persona: {
    role: string;
    industry: string;
    experience: string;
  };
  specificity: string;
  pain: string;
  workaround: string;
  solutionCompletion: string;
  marketContext: "different_customer" | "too_expensive_or_complex" | "manual_or_no_product" | "new_problem_recently";
  founderEdge: string;
}

interface FastInput {
  description: string;
}

interface EmailDraftRequest {
  email: string;
  entryMode: EntryMode;
  fastInput?: FastInput | null;
  guidedInput?: GuidedInput | null;
  personaEditedSignificantly?: boolean;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmpty = (value: unknown, min = 12) => typeof value === "string" && value.trim().length >= min;

function validateGuidedInput(input: GuidedInput | null | undefined) {
  const issues: string[] = [];
  if (!input) {
    issues.push("guidedInput is required");
    return issues;
  }

  if (!isNonEmpty(input.seed, 8)) issues.push("seed must be at least 8 characters");
  if (!isNonEmpty(input.persona?.role, 2)) issues.push("persona.role is required");
  if (!isNonEmpty(input.persona?.industry, 2)) issues.push("persona.industry is required");
  if (!isNonEmpty(input.persona?.experience, 2)) issues.push("persona.experience is required");
  if (!isNonEmpty(input.specificity, 8)) issues.push("specificity must be at least 8 characters");
  if (!isNonEmpty(input.pain, 12)) issues.push("pain must be at least 12 characters");
  if (!isNonEmpty(input.workaround, 6)) issues.push("workaround must be at least 6 characters");
  if (!isNonEmpty(input.solutionCompletion, 6)) issues.push("solutionCompletion must be at least 6 characters");
  if (!isNonEmpty(input.founderEdge, 12)) issues.push("founderEdge must be at least 12 characters");
  if (!input.marketContext) issues.push("marketContext is required");

  return issues;
}

function validatePayload(payload: Partial<EmailDraftRequest>) {
  const issues: string[] = [];

  if (!payload.email || !emailRegex.test(payload.email.trim())) {
    issues.push("A valid email is required");
  }

  if (payload.entryMode === "fast") {
    if (!isNonEmpty(payload.fastInput?.description, 40)) {
      issues.push("fastInput.description must be at least 40 characters");
    }
    return issues;
  }

  if (payload.entryMode === "guided") {
    issues.push(...validateGuidedInput(payload.guidedInput));
    return issues;
  }

  issues.push("entryMode must be fast or guided");
  return issues;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildDashboardContext(draftDocument: Record<string, any>) {
  const level = draftDocument?.confidence?.level ?? "medium";
  const nextActions = Array.isArray(draftDocument?.nextActions) ? draftDocument.nextActions : [];
  const defaultRoute = level === "low" ? "/pmf-lab" : "/waitlist";

  return {
    message: "We know who you’re building for — here’s what to do next.",
    suggestedStage: "IDENTITY",
    prioritizedTasks: nextActions.slice(0, 5).map((action: any, index: number) => ({
      id: `icp-draft-task-${index + 1}`,
      title: typeof action?.title === "string" ? action.title : `Next action ${index + 1}`,
      description:
        typeof action?.description === "string"
          ? action.description
          : "Use the ICP Draft to move from analysis into execution.",
      priority: index === 0 ? "high" : index < 3 ? "medium" : "low",
      route: defaultRoute,
    })),
    recommendations: [],
  };
}

function buildDraftPrompt(request: EmailDraftRequest) {
  const guidedContext =
    request.entryMode === "guided" && request.guidedInput
      ? `Startup idea: ${request.guidedInput.seed}
Confirmed persona role: ${request.guidedInput.persona.role}
Confirmed persona industry: ${request.guidedInput.persona.industry}
Confirmed persona experience: ${request.guidedInput.persona.experience}
Specific segment: ${request.guidedInput.specificity}
Emotional pain: ${request.guidedInput.pain}
Current workaround: ${request.guidedInput.workaround}
Product sentence completion: ${request.guidedInput.solutionCompletion}
Competitive landscape: ${request.guidedInput.marketContext}
Founder edge: ${request.guidedInput.founderEdge}
Founder substantially revised the suggested persona: ${request.personaEditedSignificantly ? "yes" : "no"}`
      : "";

  const fastContext =
    request.entryMode === "fast" && request.fastInput
      ? `Founder description:
${request.fastInput.description}`
      : "";

  return `You are generating a founder-ready ICP Draft document.
This is not a template fill. It must feel specific, grounded, and usable.
Use the founder's wording wherever possible.
Do not ask clarifying questions.
Do not output generic startup language.
Return valid JSON only in this shape:
{
  "status":"draft_ready",
  "draftDocument":{
    "gatePreview":{"personaName":"string","roleLine":"string","painLine":"string"},
    "customer":{"personaName":"string","roleLine":"string","metaLine":"string","summary":"string","whereToFind":["string"]},
    "pain":{"quote":"string","rootCause":"string","whyItHurts":"string","triggerMoment":"string"},
    "build":{"valueProposition":"string","replaces":["string"],"coreFeatures":[{"title":"string","description":"string"}],"outcome":"string"},
    "moat":{"moatType":"string","edge":"string","incumbentGap":"string","startupsToStudy":[{"name":"string","url":"string|null"}]},
    "confidence":{"level":"high|medium|low","summary":"string","missingSignals":["string"]},
    "nextActions":[{"title":"string","description":"string","route":"waitlist|pmf|mvp|gtm|mentor"}]
  }
}

Rules:
- The customer section must read like one person with one context, not a vague market.
- pain.quote must feel like a line the founder could repeat to a cofounder or designer.
- build.valueProposition must define the first product or service clearly.
- coreFeatures must be exactly 3 items.
- moat.moatType should be a concise badge-style phrase.
- confidence must admit missing evidence instead of faking precision.
- nextActions must be concrete and usable in the next week.

Entry mode: ${request.entryMode}
${guidedContext}
${fastContext}`;
}

function buildEmailHtml(args: {
  appUrl: string;
  resumeToken: string;
  artifact: Record<string, any>;
}) {
  const draft = args.artifact.draftDocument;
  const resumeUrl = `${args.appUrl}/icp-builder?resume=${encodeURIComponent(args.resumeToken)}`;
  const personaName = escapeHtml(draft.customer.personaName);
  const roleLine = escapeHtml(draft.customer.roleLine);
  const painLine = escapeHtml(draft.pain.quote);
  const buildLine = escapeHtml(draft.build.valueProposition);

  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">Your ICP Draft is ready.</h1>
      <p style="margin: 0 0 16px; color: #334155;">
        We finished building your founder-specific ICP Draft. Open it to unlock the full folio and keep building from the same state.
      </p>
      <div style="border: 1px solid #e2e8f0; border-radius: 20px; background: #f8fafc; padding: 20px; margin: 0 0 20px;">
        <p style="margin: 0; font-size: 18px; font-weight: 700;">${personaName}</p>
        <p style="margin: 8px 0 0; color: #475569;">${roleLine}</p>
        <p style="margin: 16px 0 0; color: #0f172a;"><strong>Core pain:</strong> "${painLine}"</p>
        <p style="margin: 10px 0 0; color: #0f172a;"><strong>What to build:</strong> ${buildLine}</p>
      </div>
      <div style="margin: 24px 0;">
        <a href="${escapeHtml(resumeUrl)}" style="background: #32b8c6; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Unlock my ICP Draft
        </a>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 13px;">This link restores the exact draft we generated for you.</p>
    </div>
  `;
}

async function processEmailDraftRequest(payload: EmailDraftRequest) {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = (Deno.env.get("APP_URL") || "https://www.creativestakeover.com").replace(/\/$/, "");

  if (!openaiApiKey || !supabaseUrl || !supabaseKey) {
    throw new Error("Missing required environment configuration");
  }

  const serviceClient = createClient(supabaseUrl, supabaseKey);
  const completion = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.45,
      max_tokens: 2000,
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: buildDraftPrompt(payload) },
      ],
    }),
  });

  if (!completion.ok) {
    throw new Error(`OpenAI API Error: ${completion.status}`);
  }

  const aiData = await completion.json();
  const parsed = JSON.parse(aiData.choices[0].message.content);
  const draftDocument = parsed.draftDocument;

  const artifact = {
    version: 3,
    generatedAt: new Date().toISOString(),
    founderInputs: {
      mode: payload.entryMode,
      fastDescription: payload.entryMode === "fast" ? payload.fastInput?.description ?? null : null,
      guided: payload.entryMode === "guided" ? payload.guidedInput ?? null : null,
    },
    draftDocument,
    dashboardContext: buildDashboardContext(draftDocument),
    enrichment: null,
  };

  const resumeToken = crypto.randomUUID();
  const { error: insertError } = await serviceClient.from("icp_guest_drafts").insert({
    email: payload.email.trim().toLowerCase(),
    resume_token: resumeToken,
    artifact,
    builder_payload: payload,
  });

  if (insertError) {
    throw new Error(`Failed to store ICP guest draft: ${insertError.message}`);
  }

  await resend.emails.send({
    from: "Creatives Takeover <noreply@updates.creativestakeover.com>",
    to: [payload.email.trim()],
    subject: "Your ICP Draft is ready",
    html: buildEmailHtml({ appUrl, resumeToken, artifact }),
  });

  await serviceClient
    .from("icp_guest_drafts")
    .update({ delivered_at: new Date().toISOString() })
    .eq("resume_token", resumeToken);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json() as EmailDraftRequest;
    const validationIssues = validatePayload(payload);
    if (validationIssues.length > 0) {
      return new Response(JSON.stringify({ success: false, error: "Validation failed", validationIssues }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    EdgeRuntime.waitUntil(
      processEmailDraftRequest(payload).catch((error) => {
        console.error("request-icp-draft-email background task failed", error);
      }),
    );

    return new Response(JSON.stringify({ success: true, queued: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("request-icp-draft-email failed", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
