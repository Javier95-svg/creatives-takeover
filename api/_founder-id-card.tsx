import { monogram, truncate } from './_og-image';

interface FounderIdCardProps {
  name: string;
  username: string;
  projectName: string | null;
  tagline: string;
  avatarUrl: string | null;
  stage: string | null;
}

/** A share image built for a feed: the project leads, with its founder below. */
export function FounderIdCard({ name, username, projectName, tagline, avatarUrl, stage }: FounderIdCardProps) {
  const headline = truncate(projectName?.trim() || 'Building in public', 64);
  const headlineSize = headline.length > 36 ? 58 : headline.length > 22 ? 70 : 84;
  const shortLink = `creatives-takeover.com/@${username}`;

  return (
    <div style={{
      width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
      padding: '48px 64px', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(120deg, #0b1326 0%, #101c34 65%, #192d52 100%)',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif', color: '#f8fafc',
    }}>
      <div style={{ display: 'flex', position: 'absolute', right: '-120px', top: '-240px', width: '650px', height: '650px', borderRadius: '50%', border: '1px solid rgba(147,180,255,0.12)' }} />
      <div style={{ display: 'flex', position: 'absolute', right: '-30px', top: '-150px', width: '470px', height: '470px', borderRadius: '50%', border: '1px solid rgba(147,180,255,0.08)' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #385079', borderRadius: '10px', padding: '8px 14px', color: '#c3d5ff', fontSize: '17px', fontWeight: 700, letterSpacing: '0.12em' }}>
          <div style={{ display: 'flex', width: '7px', height: '7px', borderRadius: '50%', background: '#89a9ff' }} />
          FOUNDER ID
        </div>
        <div style={{ display: 'flex', fontSize: '22px', color: '#b8c9e8', fontWeight: 600 }}>Creatives Takeover</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: '18px', color: '#91a9d1', fontWeight: 600, letterSpacing: '0.14em' }}>BUILDING IN PUBLIC</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '12px', fontSize: `${headlineSize}px`, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.06, maxWidth: '1040px' }}>{headline}</div>
        {tagline ? <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '18px', color: '#c3cfe4', fontSize: '28px', lineHeight: 1.3, maxWidth: '1000px' }}>{truncate(tagline, 110)}</div> : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {avatarUrl ? <img src={avatarUrl} width={76} height={76} style={{ borderRadius: '38px', objectFit: 'cover', border: '2px solid #506283' }} />
            : <div style={{ display: 'flex', width: '76px', height: '76px', borderRadius: '38px', background: '#203456', color: '#b6cbff', fontSize: '34px', fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>{monogram(name)}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', fontSize: '34px', fontWeight: 600, letterSpacing: '-0.02em' }}>{truncate(name, 36)}</div>
            <div style={{ display: 'flex', fontSize: '21px', color: '#91a9d1' }}>@{truncate(username, 40)}</div>
          </div>
        </div>
        {stage ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ display: 'flex', fontSize: '14px', color: '#91a9d1', letterSpacing: '0.12em', fontWeight: 600 }}>CURRENT STAGE</div>
          <div style={{ display: 'flex', fontSize: '24px', color: '#d4e2ff', fontWeight: 600 }}>{stage}</div>
        </div> : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #31415f', marginTop: '24px', paddingTop: '20px' }}>
        <div style={{ display: 'flex', fontSize: '21px', color: '#c3d0e8' }}>{truncate(shortLink, 62)}</div>
        <div style={{ display: 'flex', fontSize: '21px', fontWeight: 600, color: '#a9c0ff' }}>Follow the journey →</div>
      </div>
    </div>
  );
}
