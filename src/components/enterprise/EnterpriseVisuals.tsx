import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Flag,
  FolderCheck,
  GraduationCap,
  Layers,
  type LucideIcon,
  TrendingUp,
  Users,
} from "lucide-react";
import type { CSSProperties } from "react";

import { BIZMAP_STAGES } from "@/lib/bizmapStages";
import { cn } from "@/lib/utils";

// Visuals for /enterprise. Product screens are real captures of cohort mode on
// sample data and say so. Everything else is an
// illustration: every team, number and date is fictional and carries an
// "Example" tag; none of it is presented as customer data.

const ExampleTag = ({ className }: { className?: string }) => (
  <span className={cn("ent-example", className)}>Example</span>
);

export const WindowDots = () => (
  <span className="ent-window__dots" aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
);

type Decision = "Build" | "Narrow" | "Pivot" | "Keep testing";

// build, narrow, pivot or keep: the colour key shared by badges, bars and the donut.
const decisionKey = (decision: Decision) => decision.split(" ")[0].toLowerCase();

const DecisionBadge = ({ decision }: { decision?: Decision }) =>
  decision ? (
    <span className={cn("ent-decision", `ent-decision--${decisionKey(decision)}`)}>{decision}</span>
  ) : (
    <span className="ent-decision ent-decision--none">—</span>
  );

// Day 18 of a 30-day pilot with eight fictional startups.
type PilotTeam = {
  name: string;
  planReady: boolean;
  interviews: number;
  experiment: "done" | "running" | "none";
  decision?: Decision;
  updated: string;
  attention?: boolean;
};

const PILOT_TEAMS: PilotTeam[] = [
  { name: "Delta", planReady: true, interviews: 14, experiment: "done", decision: "Build", updated: "Today" },
  { name: "Fjord", planReady: true, interviews: 11, experiment: "done", decision: "Narrow", updated: "1d" },
  { name: "Aurora", planReady: true, interviews: 9, experiment: "running", updated: "2d" },
  { name: "Lumen", planReady: true, interviews: 7, experiment: "running", updated: "Today" },
  { name: "Cedar", planReady: true, interviews: 6, experiment: "running", updated: "1d" },
  { name: "Iris", planReady: true, interviews: 5, experiment: "none", updated: "3d" },
  { name: "Basalt", planReady: true, interviews: 2, experiment: "none", updated: "9d", attention: true },
  { name: "Ember", planReady: false, interviews: 0, experiment: "none", updated: "11d", attention: true },
];

const PILOT_DAY = 18;
const MOST_INTERVIEWS = Math.max(...PILOT_TEAMS.map((team) => team.interviews));
const EXPERIMENT_LABEL = { done: "Done", running: "Running", none: "Not started" } as const;

/** Hero visual: the pilot as a program manager sees it on day 18. */
export const PilotBoardMock = () => {
  const plans = PILOT_TEAMS.filter((team) => team.planReady).length;
  const interviews = PILOT_TEAMS.reduce((sum, team) => sum + team.interviews, 0);
  const attention = PILOT_TEAMS.filter((team) => team.attention).length;
  return (
    <div className="ent-mock" aria-label="Example validation pilot on day 18, with fictional startups" role="img">
      <div className="ent-window">
        <div className="ent-window__bar">
          <WindowDots />
          <span className="ent-window__heading">
            <span className="ent-window__title">Validation pilot · Day {PILOT_DAY} of 30</span>
            <span className="ent-window__progress" aria-hidden="true">
              <i style={{ width: `${(PILOT_DAY / 30) * 100}%` }} />
            </span>
          </span>
          <ExampleTag />
        </div>

        <div className="ent-kpis">
          <div>
            <strong>{PILOT_TEAMS.length}</strong>
            <span>startups</span>
          </div>
          <div>
            <strong className="is-good">
              {plans}/{PILOT_TEAMS.length}
            </strong>
            <span>plans ready</span>
          </div>
          <div>
            <strong>{interviews}</strong>
            <span>interviews logged</span>
          </div>
          <div>
            <strong className="is-bad">{attention}</strong>
            <span>need a nudge</span>
          </div>
        </div>

        <div className="ent-pilot">
          <div className="ent-pilot__row ent-pilot__row--head">
            <span>Startup</span>
            <span>Plan</span>
            <span>Interviews</span>
            <span className="ent-pilot__exp">Experiment</span>
            <span>Decision</span>
            <span className="ent-pilot__updated">Update</span>
          </div>
          {PILOT_TEAMS.map((team) => (
            <div key={team.name} className={cn("ent-pilot__row", team.attention && "is-attention")}>
              <span className="ent-pilot__name">{team.name}</span>
              <span className="ent-pilot__plan">
                {team.planReady ? <CheckCircle2 className="is-good" /> : <Circle />}
              </span>
              <span className="ent-pilot__meter">
                <span className="ent-pilot__bar">
                  <i style={{ width: `${(team.interviews / MOST_INTERVIEWS) * 100}%` }} />
                </span>
                <b>{team.interviews}</b>
              </span>
              <span className={cn("ent-pilot__exp ent-pilot__status", `is-${team.experiment}`)}>
                {EXPERIMENT_LABEL[team.experiment]}
              </span>
              <span>
                <DecisionBadge decision={team.decision} />
              </span>
              <span className="ent-pilot__updated">{team.updated}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ent-float ent-float--alert" aria-hidden="true">
        <span className="ent-float__icon is-bad">
          <AlertTriangle />
        </span>
        <div>
          <p className="ent-float__title">Ember needs a nudge</p>
          <p className="ent-float__text">No update in 11 days</p>
        </div>
      </div>

      <div className="ent-float ent-float--report" aria-hidden="true">
        <span className="ent-float__icon is-good-bg">
          <TrendingUp />
        </span>
        <div>
          <p className="ent-float__title">Fjord decided: narrow</p>
          <p className="ent-float__text">From 11 customer interviews</p>
        </div>
      </div>
    </div>
  );
};

const titleCase = (title: string) => title.charAt(0) + title.slice(1).toLowerCase();

/** Hero: the seven stages of the Startup Development Cycle, from the product's own list, with the pilot's stages marked. */
export const CycleStrip = ({ label, pilotStages, pilotLabel }: { label: string; pilotStages: number; pilotLabel: string }) => (
  <div className="ent-cycle">
    <p className="ent-cycle__label">{label}</p>
    <ol className="ent-cycle__stages">
      {BIZMAP_STAGES.map((stage, index) => (
        <li key={stage.id} className={cn(index < pilotStages && "is-pilot")}>
          <span className="ent-cycle__num">{stage.numeral}</span>
          <span className="ent-cycle__name">{titleCase(stage.title)}</span>
        </li>
      ))}
    </ol>
    <div className="ent-cycle__bracket">
      <span style={{ gridColumn: `1 / span ${pilotStages}` }}>{pilotLabel}</span>
    </div>
  </div>
);

/**
 * A real product screen on sample data, framed as an app window. `src` is the
 * dark capture and `lightSrc` the same screen in light theme; CSS shows the
 * one that matches the page. On /enterprise it stands in for the live demo
 * until that loads, and for crawlers.
 */
export const ProductShot = ({
  src,
  lightSrc,
  width,
  height,
  title,
  alt,
  fade = true,
}: {
  src: string;
  lightSrc: string;
  width: number;
  height: number;
  title: string;
  alt: string;
  /** Fade the bottom edge, for screens cropped mid-page. */
  fade?: boolean;
}) => (
  <figure className={cn("ent-window ent-shot", fade && "is-faded")}>
    <div className="ent-window__bar">
      <WindowDots />
      <span className="ent-window__title">{title}</span>
      <span className="ent-example is-real">
        Real product<span className="ent-example__more"> · sample data</span>
      </span>
    </div>
    <div className="ent-shot__media">
      <img className="is-light" src={lightSrc} width={width} height={height} alt={alt} loading="lazy" decoding="async" />
      <img className="is-dark" src={src} width={width} height={height} alt="" aria-hidden="true" loading="lazy" decoding="async" />
    </div>
  </figure>
);

const SETUP_FOCUS = ["Fintech", "Health", "Climate", "Mixed"];
const SETUP_STARTUPS = 8;

/** Adaptability: one example pilot setup, sized and focused for its program. */
export const PilotSetupMock = () => (
  <div className="ent-mock ent-mock--flat" role="img" aria-label="Example pilot setup for a fintech program with eight startups">
    <div className="ent-window ent-setup">
      <div className="ent-window__bar">
        <WindowDots />
        <span className="ent-window__title">Pilot setup</span>
        <ExampleTag />
      </div>
      <div className="ent-setup__row">
        <span className="ent-setup__label">Startups</span>
        <span className="ent-setup__dots" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <i key={index} className={cn(index < SETUP_STARTUPS && "is-on")} />
          ))}
          <b>{SETUP_STARTUPS}</b>
        </span>
      </div>
      <div className="ent-setup__row">
        <span className="ent-setup__label">Founder focus</span>
        <span className="ent-setup__chips">
          {SETUP_FOCUS.map((focus, index) => (
            <span key={focus} className={cn(index === 0 && "is-on")}>
              {index === 0 ? <Check aria-hidden="true" /> : null}
              {focus}
            </span>
          ))}
        </span>
      </div>
      <div className="ent-setup__row">
        <span className="ent-setup__label">Length</span>
        <span className="ent-setup__length">
          <span className="is-on">30-day pilot</span>
          <ArrowRight aria-hidden="true" />
          <span>Your 12-week program</span>
        </span>
      </div>
      <div className="ent-setup__row">
        <span className="ent-setup__label">Report</span>
        <span className="ent-setup__value">Your funder’s template</span>
      </div>
      <div className="ent-setup__row">
        <span className="ent-setup__label">Your side</span>
        <span className="ent-setup__value">One program contact</span>
      </div>
    </div>
  </div>
);

const StageChip = ({ stage }: { stage: (typeof BIZMAP_STAGES)[number] }) => (
  <li>
    <span className="ent-after__num">{stage.numeral}</span>
    <span className="ent-after__stage">{titleCase(stage.title)}</span>
    {/* The stage's core tool, from the product's catalog. */}
    <span className="ent-after__tool">{stage.tools[0]?.name}</span>
  </li>
);

/** Post-program support: the stages founders work through with the program, then the ones they carry on with alone. */
export const AfterProgramFlow = ({
  programStages,
  duringLabel,
  endLabel,
  afterLabel,
}: {
  programStages: number;
  duringLabel: string;
  endLabel: string;
  afterLabel: string;
}) => (
  <div className="ent-after">
    <div className="ent-after__phase is-during" style={{ flexGrow: programStages }}>
      <p className="ent-after__label">{duringLabel}</p>
      <span className="ent-after__bar" aria-hidden="true" />
      <ol className="ent-after__stages">
        {BIZMAP_STAGES.slice(0, programStages).map((stage) => (
          <StageChip key={stage.id} stage={stage} />
        ))}
      </ol>
    </div>
    <div className="ent-after__phase is-after" style={{ flexGrow: BIZMAP_STAGES.length - programStages }}>
      <p className="ent-after__label">{afterLabel}</p>
      <span className="ent-after__bar">
        <span className="ent-after__end">
          <Flag aria-hidden="true" />
          {endLabel}
        </span>
      </span>
      <ol className="ent-after__stages" start={programStages + 1}>
        {BIZMAP_STAGES.slice(programStages).map((stage) => (
          <StageChip key={stage.id} stage={stage} />
        ))}
      </ol>
    </div>
  </div>
);

const KEEP_ICONS: Record<string, LucideIcon> = {
  work: FolderCheck,
  tools: Layers,
  mentors: GraduationCap,
  founders: Users,
};

/** Post-program support: what founders keep once the program ends. */
export const AfterProgramKeeps = ({ items }: { items: Array<{ key: string; title: string; body: string }> }) => (
  <ul className="ent-keeps">
    {items.map((item, index) => {
      const Icon = KEEP_ICONS[item.key] ?? Users;
      return (
        <li key={item.key} data-reveal="up" style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}>
          <span className="ent-icon" aria-hidden="true">
            <Icon />
          </span>
          <span>
            <span className="ent-keeps__title">{item.title}</span>
            <span className="ent-keeps__body">{item.body}</span>
          </span>
        </li>
      );
    })}
  </ul>
);
