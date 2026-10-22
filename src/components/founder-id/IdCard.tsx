import { cn } from '@/lib/utils';
import './founder-id.css';

export interface IdCardPerson {
  name: string;
  handle: string;
  /** Formatted for the card, e.g. "000 214". */
  number: string;
  /** A stage label such as Validation, or null when the founder keeps it private. */
  stage: string | null;
  tagline: string | null;
  /** The founder's photo. The example cards use initials instead. */
  avatarUrl?: string | null;
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

/** "000 214" from a founder number, as the share card prints it. */
export function formatFounderNumber(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > 999999) return null;
  const digits = String(value).padStart(6, '0');
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

/**
 * A Founder ID card in HTML, laid out like the real 1200×630 card
 * (api/_founder-id-card.tsx). Without a person it is the blank card, still
 * waiting for a name and a number. Used on /founder-id and the cohort showcase.
 */
export function IdCard({ person, label, className }: { person?: IdCardPerson; label?: string; className?: string }) {
  const handle = person?.handle ?? 'yourname';
  return (
    <div
      className={cn('fid-idcard', className)}
      role="img"
      aria-label={label ?? (person
        ? `Founder ID card: ${person.name}, @${handle}${person.number ? `, founder number ${person.number}` : ''}${person.tagline ? `, ${person.tagline}` : ''}.`
        : 'A blank Founder ID card: your name, @yourname, and a founder number still to be assigned.')}
    >
      <span className="fid-idcard__ring" />
      <span className="fid-idcard__ring" />
      <div className="fid-idcard__body" aria-hidden="true">
        <div className="fid-idcard__top">
          <span className="fid-idcard__brand">FOUNDER ID</span>
          {(person ? person.stage : 'Your stage') && (
            <span className="fid-idcard__small">• {(person ? person.stage! : 'Your stage').toUpperCase()}</span>
          )}
        </div>
        <span className="fid-idcard__small fid-idcard__label">FOUNDER NO.</span>
        <span className="fid-idcard__number">
          {person?.number
            ? person.number
            : Array.from({ length: 6 }, (_, index) => <span key={index} className="fid-idcard__slot">&nbsp;</span>)}
        </span>
        <span className="fid-idcard__name">{(person?.name ?? 'Your name').toUpperCase()}</span>
        <span className="fid-idcard__handle">@{handle}</span>
        <div className="fid-idcard__foot">
          <span className="fid-idcard__who">
            {person && (person.avatarUrl
              ? <img className="fid-idcard__mono fid-idcard__photo" src={person.avatarUrl} alt="" loading="lazy" decoding="async" />
              : <span className="fid-idcard__mono">{initials(person.name)}</span>)}
            <span>
              <span className="fid-idcard__small">BUILDING IN PUBLIC</span>
              <span className="fid-idcard__value">{person ? (person.tagline || 'A founder journey') : 'What you’re building'}</span>
            </span>
          </span>
          <div>
            <span className="fid-idcard__small">FOLLOW THE JOURNEY</span>
            <span className="fid-idcard__value">creatives-takeover.com/@{handle}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
