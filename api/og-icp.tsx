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

/** Mirrors the band thresholds in icpViabilityScore.ts (50 and 80 of 100). */
function scoreColor(score: number): string {
  if (score >= 80) return '#4ade80';
  if (score >= 50) return '#32b8c6';
  return '#fb923c';
}

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') ?? '';

  let personaName = 'ICP Draft';
  let roleLine = '';
  let painQuote = '';
  let valueProposition = '';
  // The score is the reason anyone clicks a shared link, so it is read from the
  // frozen card rather than recomputed: the scorer lives in src/ and this is an
  // edge function, and a number that drifted from what the founder posted would
  // be worse than no number at all.
  let displayScore: number | null = null;
  let verdictLabel = '';
  let ideaLine = '';

  /*
   * Guest score cards live behind the edge function, not in a table anon can
   * read: RLS on guest_activation_artifacts has no policies by design, so the
   * function is the only way in. That is also what guarantees this renderer
   * cannot accidentally surface anything but the card.
   */
  const ideaSlug = url.searchParams.get('idea') ?? '';
  if (ideaSlug && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/guest-activation-artifacts`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operation: 'read_score', shareSlug: ideaSlug }),
      });
      const payload = await res.json() as { scoreCard?: Record<string, unknown> };
      let card = payload?.scoreCard;

      /*
       * A score can be published from either side of signup. Guests live behind
       * the edge function; account holders live in bizmap_shared_outputs under
       * source_type "icp_score", which anon can read because that row carries
       * only the card. Miss this fallback and every logged-in founder's shared
       * link renders a scoreless card.
       */
      if (!card) {
        const fallback = await fetch(
          `${SUPABASE_URL}/rest/v1/bizmap_shared_outputs?slug=eq.${encodeURIComponent(ideaSlug)}&source_type=eq.icp_score&visibility=in.(unlisted,public)&select=snapshot&limit=1`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
        );
        const rows = (await fallback.json()) as Array<{ snapshot?: { scoreCard?: Record<string, unknown> } }>;
        card = rows[0]?.snapshot?.scoreCard;
      }

      if (card && typeof card.displayScore === 'number') {
        displayScore = card.displayScore;
        verdictLabel = typeof card.verdictLabel === 'string' ? card.verdictLabel : '';
        ideaLine = typeof card.idea === 'string' ? card.idea : '';
        personaName = typeof card.personaName === 'string' ? card.personaName : personaName;
        roleLine = typeof card.roleLine === 'string' ? card.roleLine : '';
        painQuote = typeof card.painLine === 'string' ? card.painLine : '';
      }
    } catch { /* use defaults */ }
  }

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
      const card = (records[0]?.snapshot as { scoreCard?: Record<string, unknown> } | undefined)?.scoreCard;
      if (card && typeof card.displayScore === 'number') {
        displayScore = card.displayScore;
        verdictLabel = typeof card.verdictLabel === 'string' ? card.verdictLabel : '';
        ideaLine = typeof card.idea === 'string' ? card.idea : '';
      }
    } catch { /* use defaults */ }
  }

  const shortPain = truncate(painQuote, 110);
  const shortValue = truncate(valueProposition, 120);
  const shortIdea = ideaLine ? truncate(ideaLine, 90) : '';
  // Leave room for the score block in the top-right corner.
  const nameSize = displayScore !== null
    ? (personaName.length > 26 ? 38 : 46)
    : (personaName.length > 32 ? 44 : personaName.length > 22 ? 52 : 60);

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

        {/* Score — the headline of the card. A shared link says "78/100"
            before it says anything else, because that is the claim the founder
            is making and the thing their friend reacts to. */}
        {displayScore !== null ? (
          <div
            style={{
              position: 'absolute',
              top: '56px',
              right: '72px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                color: scoreColor(displayScore),
                fontSize: '128px',
                fontWeight: '700',
                lineHeight: '1',
                letterSpacing: '-0.04em',
              }}
            >
              {String(displayScore)}
              <span style={{ fontSize: '40px', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>/100</span>
            </div>
            {verdictLabel ? (
              <div
                style={{
                  marginTop: '10px',
                  color: scoreColor(displayScore),
                  fontSize: '20px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: 'flex',
                }}
              >
                {verdictLabel}
              </div>
            ) : null}
          </div>
        ) : null}

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
            STARTUP VIABILITY · CREATIVES TAKEOVER
          </div>
        </div>

        {/* The founder's own sentence, when the card carried one. It is what
            makes a stranger's score legible to their friend. */}
        {shortIdea ? (
          <div
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '22px',
              lineHeight: '1.4',
              marginBottom: '16px',
              maxWidth: '680px',
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            {shortIdea}
          </div>
        ) : null}

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
