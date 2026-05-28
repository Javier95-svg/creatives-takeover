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
  mode?: "page_copy" | "launch_kit";
  productName: string;
  pitch: string;
  audience: string;
  inputs?: WaitlistLaunchKitInputs;
}

interface WaitlistLaunchKitInputs {
  product_name: string;
  one_line_description: string;
  target_audience: string;
  primary_benefit: string;
  secondary_benefits?: string[];
  product_category: string;
  tone_preference: string;
  launch_date?: string;
  referral_incentive?: string;
  existing_tagline?: string;
}

const launchKitCategories = new Set([
  "B2B SaaS",
  "Consumer App",
  "Marketplace",
  "Community",
  "Developer Tool",
  "Physical Product",
  "Other",
]);

const launchKitTones = new Set([
  "professional",
  "friendly",
  "bold",
  "conversational",
  "inspirational",
]);

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
  "journey",
  "ecosystem",
  "holistic",
  "empower",
  "leverage",
  "synergy",
];

function cleanString(value: unknown, max?: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  return max ? text.slice(0, max) : text;
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function validateLaunchKitInputs(raw: unknown): { inputs?: WaitlistLaunchKitInputs; errors: string[] } {
  const input = (raw ?? {}) as Record<string, unknown>;
  const secondaryBenefits = Array.isArray(input.secondary_benefits)
    ? input.secondary_benefits.map((item) => cleanString(item, 150)).filter(Boolean).slice(0, 2)
    : [];

  const inputs: WaitlistLaunchKitInputs = {
    product_name: cleanString(input.product_name, 60),
    one_line_description: cleanString(input.one_line_description, 200),
    target_audience: cleanString(input.target_audience, 150),
    primary_benefit: cleanString(input.primary_benefit, 150),
    product_category: cleanString(input.product_category),
    tone_preference: cleanString(input.tone_preference),
  };
  if (secondaryBenefits.length) inputs.secondary_benefits = secondaryBenefits;
  const launchDate = cleanString(input.launch_date);
  const referralIncentive = cleanString(input.referral_incentive, 150);
  const existingTagline = cleanString(input.existing_tagline, 100);
  if (launchDate) inputs.launch_date = launchDate;
  if (referralIncentive) inputs.referral_incentive = referralIncentive;
  if (existingTagline) inputs.existing_tagline = existingTagline;

  const errors: string[] = [];
  if (!inputs.product_name) errors.push("product_name is required");
  if (!inputs.one_line_description) errors.push("one_line_description is required");
  if (!inputs.target_audience) errors.push("target_audience is required");
  if (!inputs.primary_benefit) errors.push("primary_benefit is required");
  if (!launchKitCategories.has(inputs.product_category)) errors.push("product_category is invalid");
  if (!launchKitTones.has(inputs.tone_preference)) errors.push("tone_preference is invalid");
  if (inputs.one_line_description && inputs.one_line_description.length <= 20 && !/[.!?]$/.test(inputs.one_line_description)) {
    errors.push("one_line_description must be a complete sentence");
  }

  return { inputs, errors };
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

function validateLaunchKitOutput(kit: any): string[] {
  const errors: string[] = [];
  if (!kit || typeof kit !== "object") return ["output must be an object"];
  if (!Array.isArray(kit.headlines) || kit.headlines.length !== 3) errors.push("headlines must have 3 items");
  if (!Array.isArray(kit.value_props) || kit.value_props.length !== 3) errors.push("value_props must have 3 items");
  if (!kit.cta || typeof kit.cta !== "object") errors.push("cta is required");
  if (!Array.isArray(kit.email_sequence) || kit.email_sequence.length !== 3) errors.push("email_sequence must have 3 items");
  if (!kit.referral_hook || typeof kit.referral_hook !== "object") errors.push("referral_hook is required");
  if (!cleanString(kit.positioning_statement)) errors.push("positioning_statement is required");

  kit.headlines?.forEach((item: any, index: number) => {
    if (!["A", "B", "C"].includes(item?.variant)) errors.push(`headlines.${index}.variant is invalid`);
    if (!cleanString(item?.headline)) errors.push(`headlines.${index}.headline is required`);
    if (wordCount(item?.headline ?? "") > 10) errors.push(`headlines.${index}.headline too long`);
    if (!cleanString(item?.subheadline)) errors.push(`headlines.${index}.subheadline is required`);
    if (!cleanString(item?.rationale)) errors.push(`headlines.${index}.rationale is required`);
  });
  kit.value_props?.forEach((item: any, index: number) => {
    if (!cleanString(item?.bullet)) errors.push(`value_props.${index}.bullet is required`);
    if (wordCount(item?.bullet ?? "") > 20) errors.push(`value_props.${index}.bullet too long`);
  });
  ["primary", "alternative_soft", "alternative_urgency"].forEach((key) => {
    if (!cleanString(kit.cta?.[key])) errors.push(`cta.${key} is required`);
    if (wordCount(kit.cta?.[key] ?? "") > 5) errors.push(`cta.${key} too long`);
  });
  kit.email_sequence?.forEach((item: any, index: number) => {
    if (item?.email_number !== index + 1) errors.push(`email_sequence.${index}.email_number is invalid`);
    if (!cleanString(item?.trigger)) errors.push(`email_sequence.${index}.trigger is required`);
    if (!cleanString(item?.subject_line) || item.subject_line.length > 50) errors.push(`email_sequence.${index}.subject_line invalid`);
    if (!cleanString(item?.preview_text) || item.preview_text.length > 90) errors.push(`email_sequence.${index}.preview_text invalid`);
    if (!cleanString(item?.body)) errors.push(`email_sequence.${index}.body is required`);
    if (!cleanString(item?.in_email_cta) || wordCount(item.in_email_cta) > 5) errors.push(`email_sequence.${index}.in_email_cta invalid`);
  });
  if (kit.referral_hook) {
    if (!cleanString(kit.referral_hook.headline) || wordCount(kit.referral_hook.headline) > 10) errors.push("referral_hook.headline invalid");
    if (!cleanString(kit.referral_hook.copy)) errors.push("referral_hook.copy is required");
    if (!cleanString(kit.referral_hook.cta) || wordCount(kit.referral_hook.cta) > 5) errors.push("referral_hook.cta invalid");
  }
  walkStrings(kit, (text, path) => {
    if (/\{\{|\[YOUR|\[INSERT|\[.*?\]/i.test(text)) errors.push(`${path} contains placeholder copy`);
    if (/[“”]/.test(text)) errors.push(`${path} contains smart quotes`);
    const lower = text.toLowerCase();
    if (forbiddenCopyTerms.some((term) => lower.includes(term))) errors.push(`${path} contains forbidden term`);
  });

  return errors;
}

const LAUNCH_KIT_SYSTEM_PROMPT = `You are a world-class startup copywriter and launch strategist specializing in pre-launch marketing for early-stage founders. Your work has helped hundreds of startups build their waitlists from zero to thousands.

Your job is to generate a complete Waitlist Launch Kit — a set of copy assets that a founder can use immediately to launch their waitlist page and email sequence. The output must be:

1. SPECIFIC — every line should feel written for this exact product and audience. Never use generic phrases that could apply to any startup.
2. CONVERSION-FOCUSED — headlines, bullets, and CTAs are written to drive signups, not to impress. Clarity beats cleverness.
3. VOICE-CONSISTENT — all six components must read as if written by the same person with the same voice.
4. IMMEDIATELY USABLE — every piece of copy is complete. No placeholders like [YOUR COMPANY NAME] or [INSERT BENEFIT HERE]. The output is ready to deploy.
5. HONEST — do not make claims the product cannot back up. Do not use superlatives like "the best" or "the only" unless the founder explicitly stated a unique differentiator.

Output format: You must return a single valid JSON object. No markdown. No prose outside the JSON. No commentary. The JSON must match the schema defined in the user prompt exactly.

Tone calibration:
- "professional": polished, clear, confident. Suits B2B, fintech, legal tech. Avoids slang and emoji.
- "friendly": warm, approachable, encouraging. Suits consumer apps and community products. Light use of contractions.
- "bold": punchy, direct, energetic. Short sentences. Strong verbs. Suits productivity tools and disruptive products.
- "conversational": sounds like a smart friend talking to you. Casual, real, no corporate-speak. Suits lifestyle apps and solo-founder projects.
- "inspirational": vision-forward, motivating, future-focused. Suits mission-driven products and communities.

Apply the specified tone to all six components without exception.`;

const CATEGORY_PROMPT_AUGMENTATIONS: Record<string, string> = {
  "B2B SaaS": `This is a B2B product. All copy should speak to business outcomes: revenue, efficiency, risk reduction, team productivity. Avoid consumer-facing language like "life-changing" or "finally." Decision-makers read this copy — they care about ROI, not feelings. Use precise language. Quantify outcomes wherever possible (e.g., "save 6 hours per week," not "save time").`,
  "Consumer App": `This is a consumer product. Copy should feel personal, not corporate. Speak to the user's daily life and emotions — not abstract business value. Use "you" heavily. It's okay to be playful. Benefits should feel real and tangible (e.g., "stop dreading Sunday meal prep," not "improve dietary outcomes").`,
  "Marketplace": `This is a two-sided marketplace. The waitlist likely targets one side (buyers or sellers — infer from the product description). Write all copy from that side's perspective. If ambiguous, write for the side that benefits most from network effects being in place at launch (usually buyers). Mention the other side only to establish credibility ("thousands of [sellers] are already waiting").`,
  "Community": `This is a community product. The primary benefit is belonging, not a feature. Copy should emphasize who else is in the community, what kind of person belongs here, and what being a member unlocks. Use identity language ("you're the kind of person who...", "join [X] founders who..."). Urgency comes from exclusivity, not scarcity of a feature.`,
  "Developer Tool": `This is a developer tool. Developers are allergic to marketing language. Copy should be technical, specific, and honest. Don't oversell. Use concrete examples instead of vague outcomes. It's fine to use technical terms if they're accurate. Avoid phrases like "powerful," "robust," and "seamless" — show, don't tell. Headlines can reference specific use cases or integrations.`,
  "Physical Product": `This is a physical product. Copy should anchor to sensory and tactile outcomes — how it feels, looks, or changes the user's environment. Lead with the real-world outcome ("your desk stays clean all week"), not the product specification. Urgency is about limited production runs or availability, not software feature access.`,
  "Other": `The product category is unspecified. Infer the most appropriate voice and vocabulary from the product description and target audience. Default to a direct, benefit-led tone that avoids both corporate jargon and consumer hyperbole.`,
};

function buildLaunchKitSystemPrompt(category: string): string {
  const augmentation = CATEGORY_PROMPT_AUGMENTATIONS[category];
  return augmentation
    ? `${LAUNCH_KIT_SYSTEM_PROMPT}\n\nCategory-specific guidance:\n${augmentation}`
    : LAUNCH_KIT_SYSTEM_PROMPT;
}

function buildLaunchKitUserPrompt(inputs: WaitlistLaunchKitInputs): string {
  const secondary = inputs.secondary_benefits?.length
    ? `Secondary benefits:\n${inputs.secondary_benefits.map((item) => `- ${item}`).join("\n")}\n`
    : "";
  return `Generate a complete Waitlist Launch Kit for the following product. Return a single valid JSON object matching the schema at the end of this prompt. Do not include any text outside the JSON.

PRODUCT INFORMATION

Product name: ${inputs.product_name}
One-line description: ${inputs.one_line_description}
Target audience: ${inputs.target_audience}
Primary benefit: ${inputs.primary_benefit}
${secondary}Product category: ${inputs.product_category}
Tone: ${inputs.tone_preference}
${inputs.launch_date ? `Launch date: ${inputs.launch_date}\n` : ""}${inputs.referral_incentive ? `Referral incentive: ${inputs.referral_incentive}\n` : ""}${inputs.existing_tagline ? `Existing tagline (do not contradict this): ${inputs.existing_tagline}\n` : ""}

COMPONENT INSTRUCTIONS

Generate these six components in one JSON response:
1. Three headline + subheadline pairs for A/B/C testing. A leads with transformation, B leads with pain solved, C leads with audience identity. Headlines are under 10 words, do not start with product name, use different first words, avoid hyphens/colons, and avoid forbidden marketing terms. Subheadlines are 1-2 sentences, max 25 words, and explicitly name the target audience. Include a 1-sentence rationale for each.
2. Three value proposition bullets. Each is one sentence under 20 words, outcome-focused, no bullet formatting. Bullets 1 and 2 are rational benefits; bullet 3 is emotional.
3. CTA button copy: primary, softer lower-commitment alternative, and urgency-focused alternative. Each is 2-5 words in title case. Do not use Sign Up, Submit, Click Here, Get Started, or Learn More.
4. A three-email sequence: confirmation, anticipation, launch. Each email needs subject_line, preview_text, body with \\n\\n paragraph breaks, and in_email_cta. Subject lines under 50 characters, preview text under 90 characters. Write as the founder, never in third person about the product, and never use "I hope this email finds you well".
5. A referral hook with headline under 10 words, copy of 2-3 sentences, and CTA of 2-5 words. If no referral incentive is provided, use "move to the top of the list".
6. A positioning statement using this exact pattern: "For [target audience], [product name] is the [category] that [primary benefit], unlike [alternative/status quo] which [key limitation]."

Hard rules: no markdown inside JSON values; no placeholders; no unsubscribe copy, legal footer, or merge tags; no pricing or legal claims; avoid these words everywhere: revolutionary, game-changing, innovative, powerful, seamless, effortless, cutting-edge, next-level, disruptive, world-class, best-in-class, journey, ecosystem, holistic, empower, leverage as a verb, synergy.

OUTPUT SCHEMA
{
  "headlines": [
    { "variant": "A", "headline": "string", "subheadline": "string", "rationale": "string" },
    { "variant": "B", "headline": "string", "subheadline": "string", "rationale": "string" },
    { "variant": "C", "headline": "string", "subheadline": "string", "rationale": "string" }
  ],
  "value_props": [
    { "bullet": "string" },
    { "bullet": "string" },
    { "bullet": "string" }
  ],
  "cta": {
    "primary": "string",
    "alternative_soft": "string",
    "alternative_urgency": "string"
  },
  "email_sequence": [
    { "email_number": 1, "trigger": "Immediately on signup", "subject_line": "string", "preview_text": "string", "body": "string", "in_email_cta": "string" },
    { "email_number": 2, "trigger": "3-5 days before launch (or when manually triggered)", "subject_line": "string", "preview_text": "string", "body": "string", "in_email_cta": "string" },
    { "email_number": 3, "trigger": "Launch day", "subject_line": "string", "preview_text": "string", "body": "string", "in_email_cta": "string" }
  ],
  "referral_hook": { "headline": "string", "copy": "string", "cta": "string" },
  "positioning_statement": "string"
}`;
}

async function generateLaunchKit(openaiApiKey: string, inputs: WaitlistLaunchKitInputs, maxTokens: number) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: buildLaunchKitSystemPrompt(inputs.product_category),
        },
        { role: "user", content: buildLaunchKitUserPrompt(inputs) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI launch kit error:", errorText);
    const status = response.status === 429 ? 429 : 502;
    throw Object.assign(new Error(`OpenAI API error: ${response.status}`), { status });
  }

  const aiData = await response.json();
  const content = aiData?.choices?.[0]?.message?.content;
  if (!content) throw Object.assign(new Error("No content returned from model"), { status: 502 });
  const parsed = JSON.parse(content);
  const validationErrors = validateLaunchKitOutput(parsed);
  if (validationErrors.length) {
    throw Object.assign(new Error(`Launch kit validation failed: ${validationErrors.join("; ")}`), { status: 422 });
  }
  return parsed;
}

function buildInputHash(inputs: WaitlistLaunchKitInputs): string {
  const stable = JSON.stringify(inputs, Object.keys(inputs).sort());
  let hash = 0;
  for (let index = 0; index < stable.length; index += 1) {
    hash = (hash << 5) - hash + stable.charCodeAt(index);
    hash |= 0;
  }
  return `wlk_${Math.abs(hash).toString(36)}`;
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

    const requestBody: WaitlistGeneratorRequest = await req.json();

    if (requestBody.mode === "launch_kit") {
      const validation = validateLaunchKitInputs(requestBody.inputs);
      if (validation.errors.length || !validation.inputs) {
        return new Response(JSON.stringify({ success: false, error: "Invalid launch kit inputs", errorCode: "VALIDATION_FAILED", details: validation.errors }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const creditCost = CREDIT_COSTS.WAITLIST_GENERATION;
      const idempotencyKey = await resolveCreditIdempotencyKey(req, {
        userId: user.id,
        feature: "WAITLIST_GENERATION",
        requestFingerprint: { mode: "launch_kit", inputs: validation.inputs },
      });
      const creditResult = await checkAndDeductCredits(
        user.id,
        creditCost,
        "Waitlist Launch Kit Generation",
        undefined,
        { productName: validation.inputs.product_name.substring(0, 80), idempotencyKey, entitlementFeature: "WAITLIST_GENERATION" },
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
        let kit: unknown;
        try {
          kit = await generateLaunchKit(openaiApiKey, validation.inputs, 4000);
        } catch (firstError) {
          console.warn("Retrying launch kit generation with larger token budget", firstError);
          kit = await generateLaunchKit(openaiApiKey, validation.inputs, 6000);
        }

        return new Response(JSON.stringify({
          success: true,
          mode: "launch_kit",
          kit,
          inputs: validation.inputs,
          inputHash: buildInputHash(validation.inputs),
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
            "Waitlist Launch Kit Generation",
            "Refund: launch kit AI processing failed",
            { error: err.message },
          );
        }
        const status = (aiError as { status?: number })?.status === 429 ? 429 : 500;
        const errorCode = status === 429 ? "RATE_LIMIT" : (aiError as { status?: number })?.status === 422 ? "VALIDATION_FAILED" : "GENERATION_FAILED";
        return new Response(JSON.stringify({
          success: false,
          error: "We couldn't generate your kit. Try again in a moment.",
          errorCode,
        }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { productName, pitch, audience } = requestBody;

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
        requiredCredits: creditResult.requiredCredits ?? creditCost,
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
