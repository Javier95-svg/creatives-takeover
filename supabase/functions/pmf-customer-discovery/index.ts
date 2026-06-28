import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';

// ─── CORS ──────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DiscoveryRequest {
  productName?: string;
  targetAudience?: string;
  industry?: string;
  problem?: string;
}

interface WebSource {
  title?: string;
  url?: string;
  snippet?: string;
  relevanceScore?: number;
}

const hostOf = (u: string): string => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
};

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

    const body: DiscoveryRequest = await req.json();
    const productName = (body.productName || '').trim();
    const targetAudience = (body.targetAudience || '').trim();
    const industry = (body.industry || '').trim();
    const problem = (body.problem || '').trim();

    if (!problem && !productName && !targetAudience) {
      return new Response(JSON.stringify({ error: 'Describe your product, audience, or the problem you solve.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Credits ───────────────────────────────────────────────────────────────
    const creditCost = CREDIT_COSTS.PMF_DISCOVERY;
    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: 'PMF_DISCOVERY',
      requestFingerprint: { productName, targetAudience, industry, problem },
    });
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      'PMF Customer Discovery',
      undefined,
      { entitlementFeature: 'PMF_DISCOVERY', idempotencyKey },
    );
    const chargedCredits = (creditResult.usedFromQuota ?? 0) + (creditResult.usedFromBalance ?? 0);

    if (!creditResult.success) {
      return new Response(JSON.stringify({
        error: creditResult.error || 'Credit deduction failed',
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredTier: creditResult.requiredTier,
        requiredCredits: creditCost,
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) throw new Error('OpenAI API key not configured');

      const audience = targetAudience || 'the target customers';
      const topic = problem || productName || industry || 'this problem';

      // ─── Web search (reuse the shared web-search function; best-effort) ────────
      const runSearch = async (query: string): Promise<{ answer: string; sources: WebSource[] }> => {
        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/web-search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
            },
            body: JSON.stringify({
              query,
              maxResults: 8,
              searchRecency: 'year',
              businessContext: industry ? { industry } : undefined,
            }),
          });
          if (!resp.ok) {
            console.warn('web-search non-OK status:', resp.status);
            return { answer: '', sources: [] };
          }
          const json = await resp.json();
          if (!json?.success) return { answer: '', sources: [] };
          const rawSources: WebSource[] = Array.isArray(json.sources) ? json.sources : [];
          const citationUrls: string[] = Array.isArray(json.citations) ? json.citations : [];
          let sources: WebSource[] = rawSources
            .slice(0, 8)
            .map((s, i) => {
              const url = s.url || citationUrls[i] || undefined;
              const isPlaceholderTitle = !s.title || /^Source \d+$/.test(s.title);
              return {
                title: isPlaceholderTitle && url ? hostOf(url) : (s.title || hostOf(url || '')),
                url,
                snippet: s.snippet,
                relevanceScore: s.relevanceScore,
              };
            })
            .filter((s) => Boolean(s.url) || Boolean(s.snippet));
          if (sources.length === 0 && citationUrls.length > 0) {
            sources = citationUrls.slice(0, 8).map((u) => ({ title: hostOf(u), url: u }));
          }
          return { answer: json.answer || '', sources };
        } catch (err) {
          console.warn('web-search failed:', err);
          return { answer: '', sources: [] };
        }
      };

      const communitiesQuery = `Where do ${audience} gather online to discuss ${topic}? List specific subreddits, forums, Slack/Discord communities, Facebook/LinkedIn groups, and niche sites — with their URLs.`;
      const threadsQuery = `Find recent, real online threads, posts, or discussions where ${audience} complain about or look for solutions to: ${topic}. Include the exact URL of each discussion.`;

      const [communitiesRes, threadsRes] = await Promise.all([
        runSearch(communitiesQuery),
        runSearch(threadsQuery),
      ]);

      const allSources = [...communitiesRes.sources, ...threadsRes.sources];
      const sourceList = allSources
        .map((s, i) => `[${i + 1}] ${s.title || hostOf(s.url || '')}${s.url ? ` — ${s.url}` : ''}${s.snippet ? `\n     ${s.snippet.slice(0, 200)}` : ''}`)
        .join('\n');

      // ─── Structure the raw results with the LLM ──────────────────────────────
      const systemPrompt = `You are a customer-discovery researcher for early founders. Your job is to turn raw web-search results into a concrete, actionable list of WHERE the founder can find potential customers and WHO is already discussing their problem.

STRICT RULES:
- Use ONLY URLs that appear in the provided SOURCES list. Never invent or guess a URL. If you are unsure of a real URL, omit the "url" field rather than fabricating one.
- Prefer specific destinations (e.g. "r/smallbusiness", a named Slack community, a specific forum) over vague ones ("social media").
- Be practical and concrete. "howToEngage" and "outreachAngle" must be specific to this product/audience, not generic.
- Return 5–8 communities and up to 12 threads. Fewer high-quality items is better than padded low-quality ones.

Return ONLY valid JSON with this exact shape:
{
  "communities": [
    { "name": "string", "platform": "string (Reddit | Slack | Discord | Forum | Facebook | LinkedIn | Other)", "url": "string (optional, must come from SOURCES)", "whyRelevant": "string — why this community fits the audience/problem", "howToEngage": "string — a specific way to show up there without spamming" }
  ],
  "threads": [
    { "title": "string", "url": "string (must come from SOURCES)", "source": "string — the site/community name", "snippet": "string — what the thread is about", "painQuote": "string — a representative line of the pain expressed (paraphrase if needed)", "outreachAngle": "string — how the founder could respond or reach out" }
  ]
}`;

      const userPrompt = `PRODUCT: ${productName || '(not specified)'}
TARGET AUDIENCE: ${targetAudience || '(not specified)'}
INDUSTRY: ${industry || '(not specified)'}
PROBLEM / PAIN: ${problem || '(not specified)'}

WEB-SEARCH SUMMARY — communities:
${communitiesRes.answer || '(none)'}

WEB-SEARCH SUMMARY — live discussions:
${threadsRes.answer || '(none)'}

SOURCES (use these URLs only):
${sourceList || '(no sources returned)'}

Produce the customer-discovery JSON.`;

      let communities: unknown[] = [];
      let threads: unknown[] = [];

      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
            max_tokens: 2500,
          }),
        });
        if (!openaiResponse.ok) {
          const errText = await openaiResponse.text();
          throw new Error(`OpenAI API Error: ${openaiResponse.status} ${errText}`);
        }
        const aiData = await openaiResponse.json();
        const parsed = JSON.parse(aiData.choices[0].message.content);
        communities = Array.isArray(parsed.communities) ? parsed.communities : [];
        threads = Array.isArray(parsed.threads) ? parsed.threads : [];
      } catch (structErr) {
        console.warn('LLM structuring failed, falling back to raw sources:', structErr);
        // Graceful fallback: surface the raw threads so the founder still gets value.
        threads = threadsRes.sources.concat(communitiesRes.sources).slice(0, 12).map((s) => ({
          title: s.title || hostOf(s.url || ''),
          url: s.url,
          source: s.url ? hostOf(s.url) : '',
          snippet: s.snippet || '',
          painQuote: '',
          outreachAngle: '',
        }));
      }

      // Defensive: only keep URLs that were actually returned by web-search (no fabrication).
      const allowedUrls = new Set(allSources.map((s) => s.url).filter(Boolean) as string[]);
      const sanitizedThreads = (threads as Array<Record<string, unknown>>).filter((t) => {
        const url = typeof t.url === 'string' ? t.url : '';
        return url ? allowedUrls.has(url) : false;
      });
      const sanitizedCommunities = (communities as Array<Record<string, unknown>>).map((c) => {
        const url = typeof c.url === 'string' ? c.url : '';
        return url && !allowedUrls.has(url) ? { ...c, url: undefined } : c;
      });

      // ─── Persist ─────────────────────────────────────────────────────────────
      let id: string | null = null;
      try {
        const { data: stored, error: storeError } = await supabase
          .from('pmf_customer_discovery' as any)
          .insert({
            user_id: user.id,
            product_name: productName || null,
            target_audience: targetAudience || null,
            problem: problem || null,
            communities: sanitizedCommunities,
            threads: sanitizedThreads,
            search_meta: {
              communitySources: communitiesRes.sources.length,
              threadSources: threadsRes.sources.length,
            },
          })
          .select('id')
          .single();
        if (!storeError && stored) {
          id = (stored as any).id;
        } else {
          console.warn('Failed to store discovery list:', storeError);
        }
      } catch (storeError) {
        console.warn('Error storing discovery list:', storeError);
      }

      return new Response(JSON.stringify({
        success: true,
        id,
        communities: sanitizedCommunities,
        threads: sanitizedThreads,
        creditsUsed: chargedCredits,
        newBalance: creditResult.newBalance,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (genErr) {
      const err = genErr instanceof Error ? genErr : new Error(String(genErr));
      if (chargedCredits > 0) {
        await refundCredits(user.id, chargedCredits, 'PMF Customer Discovery', 'Refund: discovery generation failed', { error: err.message });
      }
      throw genErr;
    }
  } catch (error) {
    console.error('Error in pmf-customer-discovery:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
