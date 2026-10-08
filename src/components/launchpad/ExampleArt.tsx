import { useState } from 'react';
import {
  BellRing, ChartLine, ChartPie, ClipboardList, Flame, GraduationCap, House, Music, PawPrint, Presentation, Ruler, Send, Sprout, Timer, UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { AvatarLook, LogoGlyph, LogoSpec } from '@/lib/communityExamples';
import { cn } from '@/lib/utils';

/**
 * An invented example person's avatar: their AI-generated photo (a face of
 * nobody real, served from this app) when one has been added, else a flat
 * drawing. Never a real person's photo.
 */
export function ExampleAvatar({ look, photo, className }: { look: AvatarLook; photo?: string; className?: string }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const ink = '#2A1D16';
  // A local, AI-generated face when one has been added; the drawing otherwise.
  if (photo && !photoFailed) {
    return <img src={photo} alt="" aria-hidden="true" loading="lazy" decoding="async" onError={() => setPhotoFailed(true)}
      className={cn('h-9 w-9 shrink-0 rounded-full object-cover', className)} style={{ backgroundColor: look.background }} />;
  }
  return <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('h-9 w-9 shrink-0 rounded-full', className)}>
    <circle cx="32" cy="32" r="32" fill={look.background} />
    {look.style === 'long' && <path d="M15 30 C15 12 49 12 49 30 V52 C44 55 20 55 15 52 Z" fill={look.hair} />}
    <path d="M11 64 C11 50 21 44 32 44 C43 44 53 50 53 64 Z" fill={look.shirt} />
    <rect x="27" y="35" width="10" height="11" rx="4" fill={look.skin} />
    <ellipse cx="32" cy="28" rx="12" ry="14" fill={look.skin} />
    {look.style === 'bun' && <circle cx="32" cy="11" r="6" fill={look.hair} />}
    {look.style === 'curly'
      ? [[21, 21], [25, 15], [31, 13], [37, 14], [42, 19], [44, 25], [20, 27]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill={look.hair} />)
      : <path d={look.style === 'buzz' ? 'M20.5 24 C21 13 43 13 43.5 24 C38 19.5 26 19.5 20.5 24 Z' : 'M19.5 27 C19 11 45 11 44.5 27 C40 19 26 18 19.5 27 Z'} fill={look.hair} />}
    {look.beard && <path d="M20.5 29 C21 43 43 43 43.5 29 C41 37.5 23 37.5 20.5 29 Z" fill={look.hair} />}
    <circle cx="27" cy="28" r="1.6" fill={ink} />
    <circle cx="37" cy="28" r="1.6" fill={ink} />
    <path d="M28 34 Q32 37 36 34" stroke={ink} strokeWidth="1.6" strokeLinecap="round" fill="none" />
    {look.glasses && <g stroke={ink} strokeWidth="1.3" fill="none">
      <circle cx="27" cy="28" r="4.2" />
      <circle cx="37" cy="28" r="4.2" />
      <path d="M31.2 28 H32.8" />
    </g>}
  </svg>;
}

const GLYPHS: Record<LogoGlyph, LucideIcon> = {
  bell: BellRing, pebble: ChartLine, ruler: Ruler, cap: GraduationCap, slides: Presentation, clipboard: ClipboardList,
  flame: Flame, send: Send, pie: ChartPie, timer: Timer, paw: PawPrint, sprout: Sprout, utensils: UtensilsCrossed,
  house: House, music: Music,
};

/** A generated app-icon logo for an invented example product. */
export function ExampleLogo({ logo, className }: { logo: LogoSpec; className?: string }) {
  const Glyph = GLYPHS[logo.glyph];
  return <span aria-hidden="true" className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm', className)}
    style={{ backgroundImage: `linear-gradient(135deg, ${logo.from}, ${logo.to})` }}>
    <Glyph className="h-1/2 w-1/2 text-white" strokeWidth={2.25} />
  </span>;
}
