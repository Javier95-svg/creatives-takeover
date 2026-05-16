import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";
import { resolveCreditIdempotencyKey } from "../_shared/request-idempotency.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

interface WaitlistGeneratorRequest {
  productName: string;
  pitch: string;
  audience: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { productName, pitch, audience }: WaitlistGeneratorRequest = await req.json();

    if (!productName?.trim() || !pitch?.trim()) {
      return new Response(JSON.stringify({ error: "productName and pitch are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creditCost = CREDIT_COSTS.WAITLIST_GENERATION;
    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: "WAITLIST_GENERATION",
      requestFingerprint: { productName, pitch, audience },
    });
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      "Waitlist Page Generation",
      undefined,
      { productName: productName.substring(0, 80), idempotencyKey, entitlementFeature: 'WAITLIST_GENERATION' },
    );
    const chargedCredits = (creditResult.usedFromQuota ?? 0) + (creditResult.usedFromBalance ?? 0);

    if (!creditResult.success) {
      return new Response(JSON.stringify({
        error: creditResult.error || "Insufficient credits",
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredTier: creditResult.requiredTier,
        requiredCredits: creditCost,
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error("OpenAI API key not configured");

    try {
      const prompt = `You are a conversion copywriter specialized in startup waitlist pages.

Product name: ${productName}
One-line pitch: ${pitch}
Target audience: ${audience || "startup founders"}

Write copy for a waitlist page.
Rules:
- Headline: single bold claim, not a question, max 10 words.
- Headline variant B: alternate angle for A/B test, max 10 words.
- Subheadline: who this is for + outcome, max 20 words.
- Problem statement: one short paragraph, max 30 words.
- Solution summary: one short paragraph, max 30 words.
- Benefits: exactly 3, specific outcomes.
- How it works: exactly 3 short steps.
- Trust items: exactly 3 short labels, 2-4 words each.
- FAQ: exactly 3 concise Q/A items.
- Testimonials: exactly 2 items with quote, author, role.
- Social proof: one short sentence, max 15 words.
- CTA text: action oriented, 2-5 words.
- Email placeholder: friendly phrase, 3-6 words.

Return only valid JSON using this exact shape:
{
  "headline": "string",
  "headlineVariantB": "string",
  "subheadline": "string",
  "problemStatement": "string",
  "solutionSummary": "string",
  "benefits": ["string", "string", "string"],
  "howItWorks": ["string", "string", "string"],
  "trustItems": ["string", "string", "string"],
  "faq": [
    { "question": "string", "answer": "string" },
    { "question": "string", "answer": "string" },
    { "question": "string", "answer": "string" }
  ],
  "testimonials": [
    { "quote": "string", "author": "string", "role": "string" },
    { "quote": "string", "author": "string", "role": "string" }
  ],
  "socialProof": "string",
  "ctaText": "string",
  "emailPlaceholder": "string"
}`;

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a world-class conversion copywriter for startup waitlist pages. Return only valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.75,
          max_tokens: 1000,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("OpenAI error:", errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const aiData = await openaiResponse.json();
      const content = aiData?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("No content returned from model");
      }

      const result = JSON.parse(content);

      return new Response(JSON.stringify({
        success: true,
        content: result,
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
          "Waitlist Page Generation",
          "Refund: AI processing failed",
          { error: err.message },
        );
      }
      throw aiError;
    }
  } catch (error) {
    console.error("waitlist-generator error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
