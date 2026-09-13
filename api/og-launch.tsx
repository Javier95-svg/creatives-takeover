// Vercel Edge Function — generates a 1200×630 OG image for a published Demo
// Studio launch page.
//
// Served at /og/p/:slug via a vercel.json rewrite rather than at /api/og-launch
// directly: public/robots.txt carries `Disallow: /api/` in every user-agent
// block, and the LinkedIn and Facebook scrapers honour robots.txt, so an
// og:image under /api/ is liable to be skipped.
//
// The card is the founder's, not ours. Their logo and headline carry it; the CT
// mark sits small in the footer.

export const config = { runtime: 'edge' };

import { ImageResponse } from '@vercel/og';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

const MAX_LOGO_BYTES = 1_000_000;

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function monogram(name: string): string {
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : 'C';
}

/**
 * ImageResponse streams, so a try/catch around it will not reliably catch a bad
 * remote image — it emits a broken response and the founder's share card dies
 * silently. Validate the logo up front instead and fall back to a monogram.
 * Founders can paste arbitrary URLs, so this is not a theoretical case.
 */
async function isUsableImage(candidate: string | null | undefined): Promise<boolean> {
  if (!candidate) return false;
  if (!/^https:\/\//i.test(candidate)) return false;
  try {
    const res = await fetch(candidate);
    if (!res.ok) return false;
    const type = res.headers.get('content-type') ?? '';
    if (!type.toLowerCase().startsWith('image/')) return false;
    const length = Number(res.headers.get('content-length') ?? '0');
    if (length && length > MAX_LOGO_BYTES) return false;
    return true;
  } catch {
    return false;
  }
}

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase();

  let projectName = 'Creatives Takeover';
  let headline = '';
  let tagline = '';
  let logoUrl: string | null = null;

  if (slug && SUPABASE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/demo_studio_projects?slug=eq.${encodeURIComponent(slug)}`
        + '&launch_published=eq.true&limit=1'
        + '&select=name,tagline,logo_url,demo_studio_launch_pages(headline,subheadline)',
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      const rows = (await res.json()) as Array<Record<string, any>>;
      const project = rows?.[0];
      if (project) {
        projectName = String(project.name ?? projectName);
        tagline = String(project.tagline ?? '');
        headline = String(project.demo_studio_launch_pages?.[0]?.headline ?? '');
        logoUrl = project.logo_url ?? null;
      }
    } catch { /* fall through to the generic card */ }
  }

  const showLogo = await isUsableImage(logoUrl);
  const title = truncate(headline || projectName, 96);
  const subtitle = truncate(tagline ? `${projectName} — ${tagline}` : projectName, 120);
  const titleSize = title.length > 64 ? 50 : title.length > 40 ? 60 : 70;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0f172a 0%, #111827 55%, #1e1b4b 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 72px',
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '340px', height: '340px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(50,184,198,0.22) 0%, transparent 70%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-40px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', display: 'flex' }} />

        {/* Founder identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '36px' }}>
          {showLogo && logoUrl ? (
            <img
              src={logoUrl}
              width={72}
              height={72}
              style={{ borderRadius: '16px', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '16px',
                background: 'rgba(50,184,198,0.14)',
                border: '1px solid rgba(50,184,198,0.3)',
                color: '#32b8c6',
                fontSize: '34px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {monogram(projectName)}
            </div>
          )}
          <div
            style={{
              background: 'rgba(50,184,198,0.12)',
              border: '1px solid rgba(50,184,198,0.28)',
              borderRadius: '100px',
              padding: '6px 18px',
              color: '#32b8c6',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            Interactive demo · Founder pitch
          </div>
        </div>

        <div
          style={{
            color: '#ffffff',
            fontSize: `${titleSize}px`,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.08,
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '22px',
            lineHeight: 1.4,
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {subtitle}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', display: 'flex' }}>
            creatives-takeover.com
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '100px',
              padding: '9px 22px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              display: 'flex',
            }}
          >
            Watch the demo →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
