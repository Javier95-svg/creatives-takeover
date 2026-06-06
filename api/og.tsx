// Generic branded OG image generator — 1200×630.
// Accessible at /api/og?title=...&subtitle=...&eyebrow=...
// Used as the per-page og:image for prerendered marketing/answer routes so each
// page gets a distinct, on-brand social card instead of one generic image.

export const config = { runtime: 'edge' };

import { ImageResponse } from '@vercel/og';

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const title = truncate((url.searchParams.get('title') ?? 'Creatives Takeover').trim(), 90);
  const subtitle = truncate((url.searchParams.get('subtitle') ?? '').trim(), 140);
  const eyebrow = truncate((url.searchParams.get('eyebrow') ?? 'Creatives Takeover').trim().toUpperCase(), 48);

  const titleSize = title.length > 64 ? 52 : title.length > 40 ? 62 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0f172a 0%, #111827 55%, #1e1b4b 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 80px',
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: '-90px', right: '-90px', width: '360px', height: '360px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(50,184,198,0.22) 0%, transparent 70%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-70px', left: '-50px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(225,29,72,0.16) 0%, transparent 70%)', display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          <div
            style={{
              background: 'rgba(50,184,198,0.12)',
              border: '1px solid rgba(50,184,198,0.28)',
              borderRadius: '100px',
              padding: '8px 20px',
              color: '#32b8c6',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.16em',
              display: 'flex',
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div style={{ color: '#ffffff', fontSize: `${titleSize}px`, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.08, display: 'flex' }}>
          {title}
        </div>

        <div style={{ width: '56px', height: '4px', background: 'rgba(50,184,198,0.7)', borderRadius: '2px', margin: '32px 0', display: 'flex' }} />

        {subtitle ? (
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '26px', lineHeight: 1.45, display: 'flex', flexWrap: 'wrap' }}>
            {subtitle}
          </div>
        ) : null}

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: '16px', display: 'flex' }}>creatives-takeover.com</div>
          <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '10px 24px', color: 'rgba(255,255,255,0.55)', fontSize: '14px', display: 'flex' }}>
            AI startup builder for founders
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'cache-control': 'public, immutable, max-age=86400, s-maxage=604800' },
    },
  );
}
