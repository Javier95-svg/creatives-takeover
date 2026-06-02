// Vercel Edge Function — generates a 1200×630 OG image for a shared ICP card.
// Accessible at /api/og-icp?slug=<share-slug>
// Referenced by the Vercel middleware OG tags and the public page SEO component.

export const config = { runtime: 'edge' };

import { ImageResponse } from '@vercel/og';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? '';

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') ?? '';

  let personaName = 'ICP Draft';
  let roleLine = '';
  let painQuote = '';
  let valueProposition = '';

  if (slug && SUPABASE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/bizmap_shared_outputs?slug=eq.${encodeURIComponent(slug)}&source_type=eq.icp&visibility=in.(unlisted,public)&select=snapshot&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      const records = (await res.json()) as Array<{ snapshot: unknown }>;
      const doc = (records[0]?.snapshot as { draftDocument?: Record<string, unknown> } | undefined)?.draftDocument;
      if (doc) {
        personaName = (doc.customer as { personaName?: string })?.personaName ?? personaName;
        roleLine = (doc.customer as { roleLine?: string })?.roleLine ?? '';
        painQuote = (doc.pain as { quote?: string })?.quote ?? '';
        valueProposition = (doc.build as { valueProposition?: string })?.valueProposition ?? '';
      }
    } catch { /* use defaults */ }
  }

  const shortPain = truncate(painQuote, 110);
  const shortValue = truncate(valueProposition, 120);
  const nameSize = personaName.length > 32 ? 44 : personaName.length > 22 ? 52 : 60;

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
        {/* Glow blobs */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '340px',
            height: '340px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(50,184,198,0.22) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-40px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Top badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '36px',
          }}
        >
          <div
            style={{
              background: 'rgba(50,184,198,0.12)',
              border: '1px solid rgba(50,184,198,0.28)',
              borderRadius: '100px',
              padding: '6px 18px',
              color: '#32b8c6',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            ICP DRAFT · CREATIVES TAKEOVER
          </div>
        </div>

        {/* Persona name */}
        <div
          style={{
            color: '#ffffff',
            fontSize: `${nameSize}px`,
            fontWeight: '700',
            letterSpacing: '-0.02em',
            lineHeight: '1.08',
            marginBottom: '14px',
            display: 'flex',
          }}
        >
          {personaName}
        </div>

        {/* Role line */}
        {roleLine ? (
          <div
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '21px',
              lineHeight: '1.4',
              marginBottom: '40px',
              display: 'flex',
            }}
          >
            {roleLine}
          </div>
        ) : (
          <div style={{ marginBottom: '40px', display: 'flex' }} />
        )}

        {/* Teal accent rule */}
        <div
          style={{
            width: '52px',
            height: '3px',
            background: 'rgba(50,184,198,0.6)',
            borderRadius: '2px',
            marginBottom: '32px',
            display: 'flex',
          }}
        />

        {/* Pain quote */}
        {shortPain ? (
          <div
            style={{
              display: 'flex',
              gap: '18px',
              marginBottom: '20px',
              flex: '0 0 auto',
            }}
          >
            <div
              style={{
                width: '3px',
                background: 'rgba(50,184,198,0.55)',
                borderRadius: '2px',
                flexShrink: '0',
                display: 'flex',
              }}
            />
            <div
              style={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: '18px',
                lineHeight: '1.65',
                fontStyle: 'italic',
                display: 'flex',
                flexWrap: 'wrap',
              }}
            >
              "{shortPain}"
            </div>
          </div>
        ) : null}

        {/* Value prop */}
        {shortValue ? (
          <div
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '16px',
              lineHeight: '1.65',
              flex: '0 0 auto',
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            {shortValue}
          </div>
        ) : null}

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '14px',
              display: 'flex',
            }}
          >
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
            Build your ICP free in 60 seconds →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
