import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';
import { createRedditClient, type RedditPost, type RedditSubreddit } from '../_shared/reddit.ts';

// ─── CORS ──────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

interface DiscoveryRequest {
  productName?: string;
  targetAudience?: string;
  industry?: string;
  problem?: string;
}

interface WebSource { title?: string; url?: string; snippet?: string }

const hostOf = (u: string): string => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
};

const VALID_CATEGORIES = ['pain_point', 'solution_request', 'money_talk', 'seeking_alternatives', 'hot_discussion'];
const SKIP_AUTHORS = new Set(['', '[deleted]', 'automoderator']);

async function callOpenAIJson(apiKey: string, system: string, user: string, maxTokens = 3000): Promise<any> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI API Error: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  return JSON.parse(data.choices[0].message.content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: DiscoveryRequest = await req.json();
    const productName = (body.productName || '').trim();
    const targetAudience = (body.targetAudience || '').trim();
    const industry = (body.industry || '').trim();
    const problem = (body.problem || '').trim();

    if (!problem && !productName && !targetAudience) {
      return new Response(JSON.stringify({ error: 'Describe your product, audience, or the problem you solve.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Credits ───────────────────────────────────────────────────────────────
    const creditCost = CREDIT_COSTS.PMF_DISCOVERY;
    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: user.id, feature: 'PMF_DISCOVERY',
      requestFingerprint: { productName, targetAudience, industry, problem },
    });
    const creditResult = await checkAndDeductCredits(
      user.id, creditCost, 'PMF Customer Discovery', undefined,
      { entitlementFeature: 'PMF_DISCOVERY', idempotencyKey },
    );
    const chargedCredits = (creditResult.usedFromQuota ?? 0) + (creditResult.usedFromBalance ?? 0);
    if (!creditResult.success) {
      return new Response(JSON.stringify({
        error: creditResult.error || 'Credit deduction failed', creditError: true,
        errorCode: creditResult.errorCode, requiredTier: creditResult.requiredTier, requiredCredits: creditCost,
      }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) throw new Error('OpenAI API key not configured');

      const audience = targetAudience || 'the target customers';
      const topic = problem || productName || industry || 'this problem';
      const redditQuery = (problem || `${productName} ${targetAudience}`.trim() || topic).slice(0, 250);

      // ─── Perplexity helper (secondary source: non-Reddit communities + fallback) ─
      const runWebSearch = async (query: string): Promise<{ answer: string; sources: WebSource[] }> => {
        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/web-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey },
            body: JSON.stringify({ query, maxResults: 8, searchRecency: 'year', businessContext: industry ? { industry } : undefined }),
          });
          if (!resp.ok) return { answer: '', sources: [] };
          const json = await resp.json();
          if (!json?.success) return { answer: '', sources: [] };
          const rawSources: WebSource[] = Array.isArray(json.sources) ? json.sources : [];
          const citationUrls: string[] = Array.isArray(json.citations) ? json.citations : [];
          let sources = rawSources.slice(0, 8).map((s, i) => {
            const url = s.url || citationUrls[i] || undefined;
            const placeholder = !s.title || /^Source \d+$/.test(s.title || '');
            return { title: placeholder && url ? hostOf(url) : (s.title || hostOf(url || '')), url, snippet: s.snippet };
          }).filter((s) => Boolean(s.url) || Boolean(s.snippet));
          if (sources.length === 0 && citationUrls.length > 0) {
            sources = citationUrls.slice(0, 8).map((u) => ({ title: hostOf(u), url: u, snippet: undefined }));
          }
          return { answer: json.answer || '', sources };
        } catch { return { answer: '', sources: [] }; }
      };

      // ─── Reddit (primary, evidence-rich) ─────────────────────────────────────
      // Anonymous Reddit is blocked from our datacenter IPs, so we only attempt Reddit
      // when OAuth app credentials are configured. Without them we skip straight to the
      // Perplexity path (no wasted latency); adding the secrets later auto-upgrades this.
      const hasRedditCreds = Boolean(Deno.env.get('REDDIT_CLIENT_ID') && Deno.env.get('REDDIT_CLIENT_SECRET'));
      let posts: RedditPost[] = [];
      let topSubs: RedditSubreddit[] = [];
      if (hasRedditCreds) {
        const reddit = await createRedditClient();
        const subredditQuery = ([targetAudience, industry].filter(Boolean).join(' ') || topic).slice(0, 200);
        const discovered = await reddit.discoverSubreddits(subredditQuery, 12);
        topSubs = discovered.filter((s) => s.subscribers >= 1000).slice(0, 6);

        const searchTasks: Promise<RedditPost[]>[] = [
          reddit.searchReddit(redditQuery, { limit: 25, sort: 'relevance', time: 'year' }),
          ...topSubs.slice(0, 3).map((s) => reddit.searchReddit(redditQuery, { subreddit: s.name, limit: 10, sort: 'top', time: 'year' })),
        ];
        const postArrays = await Promise.all(searchTasks);
        const seen = new Set<string>();
        for (const arr of postArrays) {
          for (const p of arr) {
            if (!p.id || seen.has(p.id)) continue;
            seen.add(p.id);
            posts.push(p);
          }
        }
        posts.sort((a, b) => (b.upvotes + b.comments) - (a.upvotes + a.comments));
        posts = posts.slice(0, 30);
      }
      const redditAvailable = posts.length > 0;

      // Non-Reddit communities via Perplexity (always — complements Reddit).
      const webCommunitiesRes = await runWebSearch(
        `Where do ${audience} gather online OUTSIDE Reddit — Slack communities, Discord servers, LinkedIn or Facebook groups, and niche forums — to discuss ${topic}? Give specific names with URLs.`,
      );
      const webAllowedUrls = new Set(webCommunitiesRes.sources.map((s) => s.url).filter(Boolean) as string[]);
      const webSourceList = webCommunitiesRes.sources
        .map((s, i) => `(${i + 1}) ${s.title || hostOf(s.url || '')}${s.url ? ` — ${s.url}` : ''}`)
        .join('\n');

      let communities: any[] = [];
      let threads: any[] = [];
      let painPoints: any[] = [];
      let people: any[] = [];
      let dmTemplate = '';

      if (redditAvailable) {
        // ── Reddit-first structuring: LLM returns ID references only (no fabricated URLs/usernames) ──
        const byId = new Map(posts.map((p) => [p.id, p]));
        const postsDigest = posts
          .map((p) => `[${p.id}] r/${p.subreddit} ▲${p.upvotes} 💬${p.comments}${p.ageDays >= 0 ? ` ${p.ageDays}d` : ''} — ${p.title}${p.body ? `\n     ${p.body.slice(0, 220)}` : ''}`)
          .join('\n');

        const system = `You are a customer-discovery analyst for an early founder. You are given REAL Reddit posts (with stable [id]s, upvotes, comments) and a list of non-Reddit community web sources. Turn them into an actionable discovery brief.

STRICT RULES:
- Reference Reddit posts ONLY by their exact [id]. Never invent ids, usernames, or URLs.
- For non-Reddit communities, the "url" MUST come from the WEB SOURCES list (omit url if unsure).
- "category" must be one of: pain_point, solution_request, money_talk, seeking_alternatives, hot_discussion.
- For peopleIds, pick posts that are clearly ONE person expressing a pain or seeking a solution (good interview targets) — not news, memes, mod posts, or announcements.
- Be specific and practical. No generic filler.

Return ONLY JSON:
{
  "threadEnrichments": [{ "id": "<post id>", "category": "<category>", "outreachAngle": "string — how the founder could respond/reach out to this specific thread" }],
  "painPoints": [{ "label": "short name", "summary": "1-2 sentences", "intensity": 1-5, "threadIds": ["<post id>", ...] }],
  "peopleIds": ["<post id>", ...],
  "communities": [{ "name": "string", "platform": "Slack|Discord|Forum|Facebook|LinkedIn|Other", "url": "string (from WEB SOURCES only, optional)", "whyRelevant": "string", "howToEngage": "string" }],
  "dmTemplate": "string — a short, respectful outreach message to someone who posted about this pain. Use placeholders {{subreddit}} and reference their problem. Ask to learn, do NOT pitch."
}
Produce 3-6 painPoints, 8-12 peopleIds, up to 6 non-Reddit communities.`;

        const userPrompt = `PRODUCT: ${productName || '(n/a)'}
TARGET AUDIENCE: ${targetAudience || '(n/a)'}
PROBLEM/PAIN: ${problem || '(n/a)'}

REDDIT POSTS:
${postsDigest}

WEB SOURCES (non-Reddit communities — use these URLs only):
${webSourceList || '(none)'}`;

        let parsed: any = {};
        try {
          parsed = await callOpenAIJson(openaiApiKey, system, userPrompt, 3500);
        } catch (e) {
          console.warn('Reddit structuring LLM failed, using raw posts:', e);
          parsed = {};
        }

        const enrichMap = new Map<string, { category: string; outreachAngle: string }>();
        for (const e of (Array.isArray(parsed.threadEnrichments) ? parsed.threadEnrichments : [])) {
          if (e && typeof e.id === 'string' && byId.has(e.id)) {
            enrichMap.set(e.id, {
              category: VALID_CATEGORIES.includes(e.category) ? e.category : 'hot_discussion',
              outreachAngle: typeof e.outreachAngle === 'string' ? e.outreachAngle : '',
            });
          }
        }

        // Threads: built from fetched posts (+ LLM enrichment). Never fabricated.
        threads = posts.map((p) => ({
          id: p.id,
          title: p.title,
          snippet: (p.body || '').slice(0, 280),
          url: p.permalink,
          subreddit: p.subreddit,
          upvotes: p.upvotes,
          comments: p.comments,
          ageDays: p.ageDays,
          author: p.author,
          category: enrichMap.get(p.id)?.category || 'hot_discussion',
          outreachAngle: enrichMap.get(p.id)?.outreachAngle || '',
        }));

        // Pain points: validate threadIds, compute engagement + example quote from real posts.
        painPoints = (Array.isArray(parsed.painPoints) ? parsed.painPoints : [])
          .map((pp: any) => {
            const ids = (Array.isArray(pp.threadIds) ? pp.threadIds : []).filter((id: string) => byId.has(id));
            const totalEngagement = ids.reduce((sum: number, id: string) => {
              const post = byId.get(id)!; return sum + post.upvotes + post.comments;
            }, 0);
            const example = ids.length ? byId.get(ids[0])! : null;
            return {
              label: String(pp.label || '').slice(0, 120),
              summary: String(pp.summary || '').slice(0, 400),
              intensity: Math.max(1, Math.min(5, Number(pp.intensity) || 3)),
              threadCount: ids.length,
              totalEngagement,
              exampleQuote: example ? example.title : '',
              threadIds: ids,
            };
          })
          .filter((pp: any) => pp.label && pp.threadCount > 0)
          .sort((a: any, b: any) => b.totalEngagement - a.totalEngagement);

        // People to contact: from peopleIds → real authors (deduped, filtered).
        const peopleIds: string[] = Array.isArray(parsed.peopleIds) ? parsed.peopleIds : [];
        const usedAuthors = new Set<string>();
        for (const id of peopleIds) {
          const post = byId.get(id);
          if (!post) continue;
          const author = (post.author || '').trim();
          if (SKIP_AUTHORS.has(author.toLowerCase())) continue;
          if (usedAuthors.has(author.toLowerCase())) continue;
          usedAuthors.add(author.toLowerCase());
          people.push({
            username: author,
            subreddit: post.subreddit,
            permalink: post.permalink,
            painQuote: post.title,
            category: enrichMap.get(post.id)?.category || 'pain_point',
          });
          if (people.length >= 12) break;
        }

        dmTemplate = typeof parsed.dmTemplate === 'string' ? parsed.dmTemplate : '';

        // Communities: real subreddits (deterministic URLs + subscriber counts) + non-Reddit (web).
        const redditCommunities = topSubs.map((s) => ({
          name: `r/${s.name}`,
          platform: 'Reddit',
          source: 'reddit',
          subscribers: s.subscribers,
          url: s.url,
          whyRelevant: s.description || `${s.subscribers.toLocaleString()} members discussing ${topic}.`,
          howToEngage: 'Search this subreddit for your problem, answer questions genuinely, and share useful resources before ever mentioning your product.',
        }));
        const webCommunities = (Array.isArray(parsed.communities) ? parsed.communities : [])
          .map((c: any) => {
            const url = typeof c.url === 'string' && webAllowedUrls.has(c.url) ? c.url : undefined;
            return {
              name: String(c.name || '').slice(0, 120),
              platform: String(c.platform || 'Other'),
              source: 'web',
              url,
              whyRelevant: String(c.whyRelevant || '').slice(0, 300),
              howToEngage: String(c.howToEngage || '').slice(0, 300),
            };
          })
          .filter((c: any) => c.name);
        communities = [...redditCommunities, ...webCommunities];
      } else {
        // ── Fallback: Reddit blocked/empty → Perplexity-only (honest, degraded) ──
        const webThreadsRes = await runWebSearch(
          `Find recent, real online threads or discussions where ${audience} complain about or look for solutions to: ${topic}. Include the exact URL of each discussion.`,
        );
        const allSources = [...webCommunitiesRes.sources, ...webThreadsRes.sources];
        const allowed = new Set(allSources.map((s) => s.url).filter(Boolean) as string[]);
        const sourceList = allSources
          .map((s, i) => `[${i + 1}] ${s.title || hostOf(s.url || '')}${s.url ? ` — ${s.url}` : ''}${s.snippet ? `\n     ${s.snippet.slice(0, 200)}` : ''}`)
          .join('\n');

        const system = `You turn raw web-search results into a customer-discovery brief. Use ONLY URLs from the SOURCES list (omit url if unsure). "category" must be one of: pain_point, solution_request, money_talk, seeking_alternatives, hot_discussion. Return ONLY JSON:
{
  "painPoints": [{ "label": "short name", "summary": "1-2 sentences", "intensity": 1-5, "exampleQuote": "a representative line of the pain (paraphrase ok)" }],
  "communities": [{ "name": "string", "platform": "Reddit|Slack|Discord|Forum|Facebook|LinkedIn|Other", "url": "string (from SOURCES)", "whyRelevant": "string", "howToEngage": "string" }],
  "threads": [{ "title": "string", "url": "string (from SOURCES)", "source": "string", "snippet": "string", "painQuote": "string", "outreachAngle": "string", "category": "<category>" }]
}
Return 3-5 painPoints, 5-8 communities, up to 12 threads.`;
        const userPrompt = `PRODUCT: ${productName || '(n/a)'}\nAUDIENCE: ${targetAudience || '(n/a)'}\nPROBLEM: ${problem || '(n/a)'}\n\nSEARCH SUMMARY:\n${webCommunitiesRes.answer || ''}\n${webThreadsRes.answer || ''}\n\nSOURCES:\n${sourceList || '(none)'}`;

        let parsed: any = {};
        try { parsed = await callOpenAIJson(openaiApiKey, system, userPrompt, 3000); } catch (e) { console.warn('Fallback LLM failed:', e); }
        painPoints = (Array.isArray(parsed.painPoints) ? parsed.painPoints : []).map((pp: any) => ({
          label: String(pp.label || '').slice(0, 120),
          summary: String(pp.summary || '').slice(0, 400),
          intensity: Math.max(1, Math.min(5, Number(pp.intensity) || 3)),
          threadCount: 0,
          totalEngagement: 0,
          exampleQuote: String(pp.exampleQuote || '').slice(0, 240),
          threadIds: [],
        })).filter((pp: any) => pp.label);
        communities = (Array.isArray(parsed.communities) ? parsed.communities : []).map((c: any) => {
          const url = typeof c.url === 'string' && allowed.has(c.url) ? c.url : undefined;
          return { name: c.name, platform: c.platform || 'Other', source: 'web', url, whyRelevant: c.whyRelevant || '', howToEngage: c.howToEngage || '' };
        }).filter((c: any) => c.name);
        threads = (Array.isArray(parsed.threads) ? parsed.threads : []).filter((t: any) => typeof t.url === 'string' && allowed.has(t.url))
          .map((t: any) => ({ title: t.title, url: t.url, source: t.source || hostOf(t.url), snippet: t.snippet || '', painQuote: t.painQuote || '', outreachAngle: t.outreachAngle || '', category: VALID_CATEGORIES.includes(t.category) ? t.category : 'hot_discussion' }));
      }

      const sourceMeta = {
        redditAvailable,
        redditThreads: redditAvailable ? threads.length : 0,
        subreddits: redditAvailable ? topSubs.length : 0,
        webCommunities: communities.filter((c) => c.source === 'web').length,
        peopleCount: people.length,
      };

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
            communities,
            threads,
            pain_points: painPoints,
            people,
            search_meta: { dmTemplate },
            source_meta: sourceMeta,
          })
          .select('id')
          .single();
        if (!storeError && stored) id = (stored as any).id;
        else console.warn('Failed to store discovery list:', storeError);
      } catch (storeError) {
        console.warn('Error storing discovery list:', storeError);
      }

      return new Response(JSON.stringify({
        success: true, id, communities, threads, painPoints, people, dmTemplate, sourceMeta,
        creditsUsed: chargedCredits, newBalance: creditResult.newBalance,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      success: false, error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
