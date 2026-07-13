import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";

// Turns raw interview notes / call transcripts into structured PMF Lab
// interview-log entries. Free (no credit charge): it removes the biggest
// friction point in front of the paid scoring step, so charging here would
// defeat its purpose. Uses gpt-4o-mini to keep cost negligible.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_NOTES_CHARS = 24000;
const MAX_INTERVIEWS = 25;

interface ExtractedInterview {
  intervieweeName: string;
  basicProfile: string;
  segment: string;
  mainFeedback: string;
  objections: string;
  missingFeatures: string;
  interestLevel: number;
  buyingIntent: "low" | "medium" | "high" | "ready_to_pay";
  landingPageShown: boolean;
  solutionPitched: boolean;
  askedAboutPricing: boolean;
  joinedWaitlist: boolean;
  referredSomeone: boolean;
  offeredToPay: boolean;
}

const BUYING_INTENTS = new Set(["low", "medium", "high", "ready_to_pay"]);

function clampText(value: unknown, max: number, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function normalizeInterview(raw: Record<string, unknown>, index: number): ExtractedInterview | null {
  const mainFeedback = clampText(raw.mainFeedback, 900);
  if (!mainFeedback) return null;

  const interestLevel = Number(raw.interestLevel);
  const buyingIntent = typeof raw.buyingIntent === "string" && BUYING_INTENTS.has(raw.buyingIntent)
    ? (raw.buyingIntent as ExtractedInterview["buyingIntent"])
    : "medium";

  return {
    intervieweeName: clampText(raw.intervieweeName, 80, `Interviewee ${index + 1}`),
    basicProfile: clampText(raw.basicProfile, 200, "Profile not stated in notes"),
    segment: clampText(raw.segment, 80, "Unspecified"),
    mainFeedback,
    objections: clampText(raw.objections, 600, "None captured in notes"),
    missingFeatures: clampText(raw.missingFeatures, 600, "None captured in notes"),
    interestLevel: Number.isFinite(interestLevel) ? Math.min(5, Math.max(1, Math.round(interestLevel))) : 3,
    buyingIntent,
    landingPageShown: asBool(raw.landingPageShown),
    solutionPitched: asBool(raw.solutionPitched),
    askedAboutPricing: asBool(raw.askedAboutPricing),
    joinedWaitlist: asBool(raw.joinedWaitlist),
    referredSomeone: asBool(raw.referredSomeone),
    offeredToPay: asBool(raw.offeredToPay),
  };
}

const SYSTEM_PROMPT = `You extract structured customer-interview records from a founder's raw notes or call transcripts.

Rules:
- Return valid JSON only: { "interviews": [ ... ] }.
- One entry per distinct real person interviewed. Never invent people, quotes, or signals that are not in the notes.
- If the notes clearly describe one conversation, return one entry. Split into multiple entries only when distinct interviewees are identifiable.
- Booleans (askedAboutPricing, joinedWaitlist, referredSomeone, offeredToPay, landingPageShown, solutionPitched) must be true ONLY when the notes explicitly support them. Default to false.
- interestLevel is 1-5. buyingIntent is one of: low, medium, high, ready_to_pay. Infer conservatively from what was said, not from optimism.
- intervieweeName: use the name in the notes; if none, use a short descriptor like "Ops manager (call 2)".
- mainFeedback should keep the interviewee's strongest verbatim phrases in quotes where available.
- objections and missingFeatures: what THIS person pushed back on or said was missing; write "None captured in notes" if absent.

Each entry shape:
{
  "intervieweeName": "string",
  "basicProfile": "string — role/company/context",
  "segment": "string — short segment label",
  "mainFeedback": "string",
  "objections": "string",
  "missingFeatures": "string",
  "interestLevel": 1-5,
  "buyingIntent": "low" | "medium" | "high" | "ready_to_pay",
  "landingPageShown": boolean,
  "solutionPitched": boolean,
  "askedAboutPricing": boolean,
  "joinedWaitlist": boolean,
  "referredSomeone": boolean,
  "offeredToPay": boolean
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    if (notes.length < 80) {
      return new Response(JSON.stringify({ success: false, error: "Paste at least a few sentences of interview notes." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error("OpenAI API key not configured");

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 4000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `FOUNDER'S RAW INTERVIEW NOTES:\n\n${notes.slice(0, MAX_NOTES_CHARS)}` },
        ],
      }),
    });

    if (!completion.ok) {
      const errBody = await completion.text().catch(() => "");
      throw new Error(`OpenAI API Error: ${completion.status} ${errBody.slice(0, 200)}`.trim());
    }

    const aiData = await completion.json();
    const content = aiData?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Extraction returned no content");
    }

    let parsed: { interviews?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse extraction result as JSON");
    }

    const rawInterviews = Array.isArray(parsed.interviews) ? parsed.interviews : [];
    const interviews = rawInterviews
      .slice(0, MAX_INTERVIEWS)
      .map((item, index) => normalizeInterview((item ?? {}) as Record<string, unknown>, index))
      .filter((item): item is ExtractedInterview => item !== null);

    if (interviews.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Could not find any interview records in these notes. Add who you spoke to and what they said, then try again.",
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, interviews }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in pmf-interview-extract:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
