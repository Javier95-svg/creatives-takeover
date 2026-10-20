import { monogram, truncate } from './_og-image';

interface FounderIdCardProps {
  name: string;
  username: string;
  tagline: string;
  avatarUrl: string | null;
  stage: string | null;
  founderNumber: number | null;
}
export function FounderIdCard({ name, username, tagline, avatarUrl, stage, founderNumber }: FounderIdCardProps) {
  const displayName = truncate(name, 34).toUpperCase();
  const nameSize = displayName.length > 26 ? 44 : displayName.length > 19 ? 54 : 66;
  const digits = typeof founderNumber === 'number' && Number.isInteger(founderNumber) && founderNumber > 0 && founderNumber <= 999999
    ? String(founderNumber).padStart(6, '0') : null;
  const numberLabel = digits ? digits.slice(0, 3) + ' ' + digits.slice(3) : null;
  const shortLink = 'creatives-takeover.com/@' + username;
  return <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', padding: '48px 58px', background: 'linear-gradient(125deg, #252624 0%, #131512 42%, #080b09 100%)', color: '#e7e0cd', fontFamily: 'Inter', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', position: 'absolute', top: 18, right: 18, bottom: 18, left: 18, border: '1px solid #47483e', borderRadius: 22 }} />
    <div style={{ display: 'flex', position: 'absolute', right: -220, top: -250, width: 850, height: 850, borderRadius: '50%', border: '1px solid #292c25' }} />
    <div style={{ display: 'flex', position: 'absolute', right: -150, top: -180, width: 710, height: 710, borderRadius: '50%', border: '1px solid #262922' }} />

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', fontSize: 21, letterSpacing: '0.26em', color: '#d6c99f', fontWeight: 600 }}>FOUNDER ID</div>
      {stage ? <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, letterSpacing: '0.16em', color: '#b9b39f' }}><div style={{ display: 'flex', width: 5, height: 5, borderRadius: '50%', background: '#b6a47b' }} />{stage.toUpperCase()}</div> : null}
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 42, height: 76, gap: 10 }}>
      {numberLabel ? <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', fontSize: 12, letterSpacing: '0.2em', color: '#9c9e8e' }}>FOUNDER NO.</div>
        <div style={{ display: 'flex', fontSize: 36, letterSpacing: '0.2em', color: '#d6c99f', textShadow: '0 2px 1px #000000' }}>{numberLabel}</div>
      </div> : null}
    </div>

    <div style={{ display: 'flex', marginTop: 35, fontSize: nameSize, letterSpacing: '0.09em', color: '#e4ddc9', fontWeight: 600, textShadow: '0 2px 1px #000000' }}>{displayName}</div>
    <div style={{ display: 'flex', marginTop: 13, fontSize: 21, letterSpacing: '0.12em', color: '#9c9e8e' }}>@{truncate(username, 40)}</div>

    <div style={{ display: 'flex', marginTop: 'auto', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {avatarUrl ? <img src={avatarUrl} width={64} height={64} style={{ borderRadius: 32, objectFit: 'cover', border: '1px solid #82785d' }} />
          : <div style={{ display: 'flex', width: 64, height: 64, borderRadius: 32, border: '1px solid #82785d', alignItems: 'center', justifyContent: 'center', color: '#d6c99f', fontSize: 28 }}>{monogram(name)}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', fontSize: 12, letterSpacing: '0.22em', color: '#858a78' }}>BUILDING IN PUBLIC</div>
          <div style={{ display: 'flex', fontSize: 21, color: '#bcb9a5' }}>{truncate(tagline || 'A founder journey', 40)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', fontSize: 12, letterSpacing: '0.2em', color: '#858a78' }}>FOLLOW THE JOURNEY</div>
        <div style={{ display: 'flex', fontSize: 21, color: '#cfc5a6' }}>{truncate(shortLink, 58)}</div>
      </div>
    </div>
  </div>;
}
