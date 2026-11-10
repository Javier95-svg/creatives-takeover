import type React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight, FlaskConical, GraduationCap, Layers, LayoutDashboard, Megaphone, Rocket, Target, Users, type LucideIcon } from 'lucide-react';
import { PULSE_HOME_SHORTCUTS, toolNameForRoute, type PulseShortcutIcon } from '@/lib/pulseHomeShortcuts';
import type { PulseHomePriority } from '@/lib/pulseHome';
import './pulse-founder-home.css';

// The founder's Pulse home before a conversation starts. A masthead (date,
// project, stage) over the centred rotating headline, then a journal layout:
// labels in a left margin, today's focus, the Pulse composer and the eight
// quick starts beside them. Pulse is the largest element on the page. Two marks
// are ours: the seven-stage ring from the homepage cycle wheel and the Pulse
// signal line.

const SHORTCUT_ICONS: Record<PulseShortcutIcon, LucideIcon> = {
  focus: LayoutDashboard, mentor: GraduationCap, cofounder: Users, customer: Target, demo: Layers, validate: FlaskConical,
  mvp: Rocket, launch: Megaphone,
};

// The stage colours of the homepage cycle wheel (cycleSteps in UserReviews.tsx).
const STAGE_ACCENTS = ['#f5a524', '#38bdf8', '#34d399', '#fb923c', '#a78bfa', '#f472b6', '#818cf8'];

const BEAT = 'M0 12 H18 L23 5 L29 21 L35 1 L41 16 L45 12 H64';

interface Props {
  heading: readonly [string, string];
  /** Changes when the headline rotates, so it animates in again. */
  headingKey: number;
  projectName: string;
  stageBadge: string;
  /** 1 to 7 on the Startup Development Cycle, when known. */
  stageNumber?: number;
  priorities: PulseHomePriority[];
  loading?: boolean;
  /** Shown in place of today's focus when there are no priorities. */
  emptyText: string;
  composer: ReactNode;
  error: ReactNode;
  footnote: string;
  homeExtras?: ReactNode;
  openRoute: (event: React.MouseEvent<HTMLAnchorElement>, route: string) => void;
}

/** The cycle wheel in miniature: seven segments, filled up to the founder's stage. */
function StageRing({ stage }: { stage?: number }) {
  if (!stage) return null;
  const span = 360 / STAGE_ACCENTS.length;
  const point = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return `${50 + Math.cos(rad) * 38} ${50 + Math.sin(rad) * 38}`;
  };
  return <svg className="fh-ring" viewBox="0 0 100 100" role="img" aria-label={`Stage ${stage} of ${STAGE_ACCENTS.length}`}>
    {STAGE_ACCENTS.map((accent, index) => {
      const middle = -90 + span * index;
      const state = index + 1 === stage ? 'is-active' : index + 1 < stage ? 'is-past' : 'is-next';
      return <path key={accent} d={`M ${point(middle - span / 2 + 5)} A 38 38 0 0 1 ${point(middle + span / 2 - 5)}`} className={`fh-ring__seg ${state}`} style={{ '--accent': accent } as CSSProperties} />;
    })}
  </svg>;
}

/** Pulse's mark: a flat line with one heartbeat, which beats faster while Pulse is answering. */
function Signal() {
  return <span aria-hidden="true" className="fh-signal">
    <span className="fh-signal__line" />
    <svg className="fh-signal__beat" viewBox="0 0 64 24" preserveAspectRatio="none"><path className="fh-signal__base" d={BEAT} /><path className="fh-signal__trace" d={BEAT} /></svg>
    <span className="fh-signal__line fh-signal__line--long" />
  </span>;
}

export function PulseFounderHome({ heading, headingKey, projectName, stageBadge, stageNumber, priorities, loading, emptyText, composer, error, footnote, homeExtras, openRoute }: Props) {
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date());
  const style = (stageNumber ? { '--stage': STAGE_ACCENTS[stageNumber - 1] } : undefined) as CSSProperties | undefined;

  return <div className="fh" style={style}>
    <div className="fh-inner">
      <header className="fh-hero">
        <div className="fh-mast">
          <span>{today}</span>
          <span className="fh-mast__project">{projectName}</span>
          <span className="fh-mast__stage">{stageBadge && <StageRing stage={stageNumber} />}{stageBadge}</span>
        </div>
        <h1 key={headingKey} className="fh-title">
          <span className="block">{heading[0]}</span>
          <span className="fh-title__second block">{heading[1]}</span>
        </h1>
        <div className="fh-mast__rule" aria-hidden="true" />
      </header>

      <section className="fh-row" aria-labelledby="fh-focus-title">
        <div className="fh-margin"><span className="fh-margin__tag"><StageRing stage={stageNumber} /><h2 id="fh-focus-title" className="fh-label">Today’s focus</h2></span></div>
        <div className="fh-main">
          {loading && !priorities.length ? <p role="status" className="fh-empty">Loading your workspace…</p>
            : !priorities.length ? <p className="fh-empty">{emptyText}</p>
            : <ol className="fh-focus">
              {priorities.map(item => {
                const tool = toolNameForRoute(item.route);
                return <li key={item.id}>
                  <a href={item.route} onClick={event => openRoute(event, item.route)} className="fh-focus__item">
                    <span className="fh-focus__text">{item.title}</span>
                    {tool && <span className="fh-focus__tool">{tool}</span>}
                  </a>
                </li>;
              })}
            </ol>}
          {homeExtras && <div className="fh-extras fh-extras--focus">{homeExtras}</div>}
        </div>
      </section>

      <div className="fh-row">
        <div className="fh-margin" aria-hidden="true"><span className="fh-label">Ask Pulse</span><Signal /></div>
        <div className="fh-main">{error}{composer}<p className="fh-footnote">{footnote}</p></div>
      </div>

      <div className="fh-row">
        <div className="fh-margin" aria-hidden="true"><span className="fh-label">Start with</span></div>
        <div className="fh-main">
          <nav aria-label="Quick starts" className="fh-shortcuts">
            {PULSE_HOME_SHORTCUTS.map(({ id, label, tool, route, icon }) => {
              const Icon = SHORTCUT_ICONS[icon];
              return <a key={id} href={route} onClick={event => openRoute(event, route)} className="fh-shortcut">
                <span className="fh-shortcut__icon"><Icon aria-hidden="true" /></span>
                <span className="fh-shortcut__text"><span className="fh-shortcut__label">{label}</span><span className="fh-shortcut__tool">{tool}</span></span>
                <ArrowRight aria-hidden="true" className="fh-shortcut__arrow" />
              </a>;
            })}
          </nav>
        </div>
      </div>
    </div>
  </div>;
}
