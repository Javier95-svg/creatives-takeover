import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WaitlistGeneratorRequest {
  productName: string;
  pitch: string;
  audience: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { productName, pitch, audience }: WaitlistGeneratorRequest = await req.json();

    if (!productName?.trim() || !pitch?.trim()) {
      return new Response(JSON.stringify({ error: 'productName and pitch are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const creditCost = CREDIT_COSTS.WAITLIST_GENERATION;
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      'Waitlist Page Generation',
      undefined,
      { productName: productName.substring(0, 80) }
    );

    if (!creditResult.success) {
      return new Response(JSON.stringify({
        error: creditResult.error || 'Insufficient credits',
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredCredits: creditCost,
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    try {
      const prompt = `You are a conversion copywriter who specialises in early-stage startup waitlist landing pages. Your job is to write punchy, benefit-driven copy that makes visitors feel they'd miss out if they don't sign up.

Product name: ${productName}
One-line pitch: ${pitch}
Target audience: ${audience || 'startup founders'}

Write copy for a waitlist landing page. Rules:
- Headline: A single bold claim (NOT a question). Maximum 10 words. Must make the visitor feel the outcome is attainable.
- Subheadline: Clarify who this is for and the specific outcome they get. Maximum 20 words.
- Benefits: Exactly 3. Each benefit is a specific, tangible result — not a generic feature. 10-15 words each. Start each with a strong verb.
- Social proof: One short sentence (max 15 words) that conveys momentum or credibility. Can reference the audience joining, a result achieved, or a compelling stat.
- CTA text: Button label. Action-oriented. 2-5 words. Not "Sign Up" — something more specific to what they get.
- Email placeholder: Friendly, conversational placeholder for the email input. 3-6 words. Example: "Your best email address".

Return ONLY valid JSON with this exact structure:
{
  "headline": "string",
  "subheadline": "string",
  "benefits": ["string", "string", "string"],
  "socialProof": "string",
  "ctaText": "string",
  "emailPlaceholder": "string"
}`;

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a world-class conversion copywriter for tech startups. Always return valid JSON exactly as specified.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.75,
          max_tokens: 600,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI error:', errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const aiData = await openaiResponse.json();
      const content = aiData.choices[0].message.content;
      const result = JSON.parse(content);

      return new Response(JSON.stringify({
        success: true,
        content: result,
        creditsUsed: creditCost,
        newBalance: creditResult.newBalance,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      const err = aiError instanceof Error ? aiError : new Error(String(aiError));
      await refundCredits(user.id, creditCost, 'Waitlist Page Generation', 'Refund: AI processing failed', { error: err.message });
      throw aiError;
    }

  } catch (error) {
    console.error('waitlist-generator error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
