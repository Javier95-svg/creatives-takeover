import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkPublicUrl } from "../_shared/public-url-guard.ts";
import { clientIp, rateLimit } from "../_shared/guards.ts";

// Public newspaper pages call this for guests too, so instead of a sign-in it
// only ever fetches LinkedIn: any other URL could point our server at internal
// addresses or other sites.
function isLinkedInHost(host: string): boolean {
  return host === 'linkedin.com' || host.endsWith('.linkedin.com');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const limited = await rateLimit(req, `fetch-linkedin-metadata:${clientIp(req)}`, 30);
    if (limited) return limited;

    const { linkedinUrl } = await req.json();
    const checked = typeof linkedinUrl === 'string' ? checkPublicUrl(linkedinUrl) : null;
    if (!checked?.ok || checked.url.protocol !== 'https:' || !isLinkedInHost(checked.url.hostname.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'A linkedin.com post URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!linkedinUrl) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the LinkedIn post page to extract Open Graph metadata
    // Follow at most three redirects, each of which must stay on LinkedIn.
    let target = checked.url;
    let response = await fetch(target, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    for (let hop = 0; hop < 3 && response.status >= 300 && response.status < 400; hop += 1) {
      const next = checkPublicUrl(new URL(response.headers.get('location') ?? '', target).toString());
      if (!next.ok || next.url.protocol !== 'https:' || !isLinkedInHost(next.url.hostname.toLowerCase())) break;
      await response.body?.cancel();
      target = next.url;
      response = await fetch(target, {
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch LinkedIn post: ${response.status}`);
    }

    const html = await response.text();

    // Extract Open Graph metadata
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);

    const metadata = {
      ogImage: ogImageMatch ? ogImageMatch[1] : null,
      ogTitle: ogTitleMatch ? ogTitleMatch[1] : null,
      ogDescription: ogDescriptionMatch ? ogDescriptionMatch[1] : null,
    };

    return new Response(
      JSON.stringify(metadata),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching LinkedIn metadata:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch LinkedIn metadata' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

