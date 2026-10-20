// Vercel Edge Function: the 1200×630 share card for a founder profile.
//
// Served at /og/profile/:username through a vercel.json rewrite rather than at
// /api/og-profile, because robots.txt disallows /api/ and the LinkedIn and
// Facebook scrapers honour it (same reason as /og/p/:slug).
//
// Before this card a shared profile previewed as a bare avatar. It now shows
// who the founder is and what they are building, in the founder's words.

export const config = { runtime: 'edge' };

import { ImageResponse } from '@vercel/og';
import { isUsableImage, monogram, truncate } from './_og-image';
import { FounderIdCard } from './_founder-id-card';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

// FOUNDER_STAGE_LABELS in src/lib/bizmapStageOrder.ts; api/ functions do not import from src/.
const STAGE_LABELS = ['Identity', 'Prototyping', 'Validation', 'Building', 'Launch', 'Traction', 'Fundraise'];

const BASE_SELECT = 'username,full_name,avatar_url,positioning_line,startup_name,startup_tagline,user_type';
// Only the projection added together with the stage gate
// (20261020090000_public_profile_story_fields) may carry a stage: before that
// migration, assigned_stage is the private quiz placement.
const STORY_SELECT = `${BASE_SELECT},assigned_stage,startup_description`;

interface CardProfile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  positioning_line: string | null;
  startup_name: string | null;
  startup_tagline: string | null;
  stage: string | null;
  /** Founder and builder profiles are Founder IDs (src/lib/founderId.ts). */
  founderId: boolean;
}

async function fetchProfile(username: string): Promise<CardProfile | null> {
  // Usernames keep their capitals and links arrive in any case, so match
  // without case. Only username characters get here, with LIKE's _ escaped,
  // so the filter is an exact match and never a pattern.
  if (!/^[A-Za-z0-9_]{1,64}$/.test(username)) return null;
  const filter = `ilike.${encodeURIComponent(username.replace(/_/g, '\\_'))}`;
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  for (const [select, stageIsGated] of [[STORY_SELECT, true], [BASE_SELECT, false]] as const) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/public_profiles?username=${filter}&select=${select}&limit=1`,
        { headers },
      );
      if (!res.ok) continue;
      const rows = (await res.json()) as Array<Record<string, any>>;
      const row = rows?.[0];
      if (!row) return null;
      const stageNumber = stageIsGated && typeof row.assigned_stage === 'number' ? row.assigned_stage : null;
      return {
        username: String(row.username ?? username),
        full_name: row.full_name ?? null,
        avatar_url: row.avatar_url ?? null,
        positioning_line: row.positioning_line ?? null,
        startup_name: row.startup_name ?? null,
        startup_tagline: row.startup_tagline ?? null,
        stage: stageNumber ? STAGE_LABELS[stageNumber - 1] ?? null : null,
        founderId: !row.user_type || row.user_type === 'founder' || row.user_type === 'builder',
      };
    } catch {
      // Try the next projection, then fall back to the generic card.
    }
  }
  return null;
}

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const username = (url.searchParams.get('username') ?? '').trim();

  const profile = username && SUPABASE_KEY ? await fetchProfile(username) : null;
  const name = profile?.full_name?.trim() || profile?.username || 'A founder on Creatives Takeover';
  const founderId = profile?.founderId ?? false;
  const building = profile?.startup_name?.trim()
    ? `Building ${profile.startup_name.trim()}`
    : founderId ? 'Founder ID' : 'Profile';
  // A Founder ID shows its short link, the one people type or paste.
  const linkText = founderId && profile ? `creatives-takeover.com/@${profile.username}` : 'creatives-takeover.com';
  const line = truncate(profile?.startup_tagline?.trim() || profile?.positioning_line?.trim() || '', 140);
  const showAvatar = await isUsableImage(profile?.avatar_url);
  const nameSize = name.length > 28 ? 58 : 70;

  if (founderId && profile) {
    return new ImageResponse(
      <FounderIdCard name={name} username={profile.username} projectName={profile.startup_name}
        tagline={line} avatarUrl={showAvatar ? profile.avatar_url : null} stage={profile.stage} />,
      { width: 1200, height: 630 },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0f172a 0%, #111827 55%, #172554 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 72px',
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: '-90px', right: '-70px', width: '360px', height: '360px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.24) 0%, transparent 70%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-70px', left: '-50px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.16) 0%, transparent 70%)', display: 'flex' }} />

        {founderId ? (
          <div style={{ display: 'flex', marginBottom: '28px' }}>
            <div
              style={{
                background: 'rgba(59,130,246,0.14)',
                border: '1px solid rgba(96,165,250,0.32)',
                borderRadius: '100px',
                padding: '6px 18px',
                color: '#93c5fd',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              Founder ID
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', marginBottom: '40px' }}>
          {showAvatar && profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              width={132}
              height={132}
              style={{ borderRadius: '66px', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.18)' }}
            />
          ) : (
            <div
              style={{
                width: '132px',
                height: '132px',
                borderRadius: '66px',
                background: 'rgba(59,130,246,0.18)',
                border: '3px solid rgba(96,165,250,0.35)',
                color: '#93c5fd',
                fontSize: '56px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {monogram(name)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ color: '#ffffff', fontSize: `${nameSize}px`, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.05, display: 'flex' }}>
              {truncate(name, 40)}
            </div>
            <div style={{ color: '#93c5fd', fontSize: '28px', fontWeight: 600, display: 'flex' }}>
              {truncate(building, 48)}
            </div>
          </div>
        </div>

        {line ? (
          <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: '30px', lineHeight: 1.35, display: 'flex', flexWrap: 'wrap', maxWidth: '1000px' }}>
            {line}
          </div>
        ) : null}

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {profile?.stage ? (
              <div
                style={{
                  background: 'rgba(59,130,246,0.14)',
                  border: '1px solid rgba(96,165,250,0.32)',
                  borderRadius: '100px',
                  padding: '8px 20px',
                  color: '#bfdbfe',
                  fontSize: '18px',
                  fontWeight: 600,
                  display: 'flex',
                }}
              >
                {`Stage: ${profile.stage}`}
              </div>
            ) : null}
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', display: 'flex' }}>
              {truncate(linkText, 52)}
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '100px',
              padding: '10px 24px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '18px',
              display: 'flex',
            }}
          >
            {founderId ? 'Follow the progress →' : 'View profile →'}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
