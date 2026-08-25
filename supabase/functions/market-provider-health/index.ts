import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { createRedditClient } from '../_shared/reddit.ts';

const headers = { 'Content-Type': 'application/json' };

serve(async (request) => {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!serviceRoleKey || bearer !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Release health check requires service-role authorization.' }), { status: 403, headers });
  }

  const retrievedAt = new Date().toISOString();
  const deadlineAt = Date.now() + 20_000;
  const reddit = await createRedditClient({ deadlineAt });
  const redditPosts = reddit.sourceState.status === 'available'
    ? await reddit.searchReddit('B2B SaaS customer acquisition', { sort: 'relevance', time: 'year', limit: 3 }).catch(() => [])
    : [];

  const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY')?.trim();
  let perplexityStatus: 'not_configured' | 'healthy' | 'unhealthy' | 'empty' = perplexityKey ? 'unhealthy' : 'not_configured';
  let perplexitySourceCount = 0;
  if (perplexityKey) {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${perplexityKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [{ role: 'user', content: 'Return one current primary source about B2B SaaS customer acquisition. Include its URL.' }],
          max_tokens: 120,
          temperature: 0,
          return_citations: true,
        }),
      });
      if (response.ok) {
        const payload = await response.json();
        const citations = Array.isArray(payload?.citations)
          ? payload.citations.filter((citation: unknown) => typeof citation === 'string' && /^https?:\/\//.test(citation))
          : [];
        perplexitySourceCount = citations.length;
        perplexityStatus = citations.length > 0 ? 'healthy' : 'empty';
      }
    } catch {
      perplexityStatus = 'unhealthy';
    }
  }

  const result = {
    retrievedAt,
    controlledQuery: true,
    providers: {
      reddit: {
        status: reddit.sourceState.status,
        sourceCount: redditPosts.filter((post) => /^https?:\/\//.test(post.permalink)).length,
        retrievalTimeMs: reddit.diagnostics.durationMs,
      },
      perplexity: {
        status: perplexityStatus,
        sourceCount: perplexitySourceCount,
      },
    },
  };
  const healthy = result.providers.reddit.status === 'available'
    && result.providers.reddit.sourceCount > 0
    && result.providers.perplexity.status === 'healthy'
    && result.providers.perplexity.sourceCount > 0;
  return new Response(JSON.stringify({ healthy, ...result }), { status: healthy ? 200 : 503, headers });
});
