import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  GraduationCap,
  Landmark,
  Lock,
  type LucideIcon,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";

import { getCoreFounderToolsForStage, type FounderJourneyStage } from "@/config/founderToolCatalog";
import { BIZMAP_STAGE_ORDER, FOUNDER_STAGE_LABELS } from "@/lib/bizmapStageOrder";
import { cn } from "@/lib/utils";

// Visuals for /enterprise. Product screens are real captures of the public
// platform tour (sample workspace) and say so. Everything else is an
// illustration: every team, number and date is fictional and carries an
// "Example" tag; none of it is presented as customer data.

const ExampleTag = ({ className }: { className?: string }) => (
  <span className={cn("ent-example", className)}>Example</span>
);

const WindowDots = () => (
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

/** A real product screen from the platform tour, framed as an app window. */
export const ProductShot = ({
  src,
  width,
  height,
  title,
  alt,
  fade = true,
}: {
  src: string;
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
    <img src={src} width={width} height={height} alt={alt} loading="lazy" decoding="async" />
  </figure>
);

// The numbers PMF Lab shows in the sample workspace (21 of 25 signals, verdict locked).
const EVIDENCE_LOGGED = 21;
const EVIDENCE_THRESHOLD = 25;
const RING_RADIUS = 26;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Outcome 2: the threshold and the locked decision, called out over the PMF Lab screen. */
export const EvidenceCallouts = () => (
  <div className="ent-callout" aria-hidden="true">
    <div className="ent-callout__part">
      <span className="ent-ring">
        <svg viewBox="0 0 64 64">
          <defs>
            <linearGradient id="ent-ring-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6aa6ff" />
              <stop offset="100%" stopColor="#3ccf8e" />
            </linearGradient>
          </defs>
          <circle className="ent-ring__track" cx="32" cy="32" r={RING_RADIUS} />
          <circle
            className="ent-ring__value"
            cx="32"
            cy="32"
            r={RING_RADIUS}
            strokeDasharray={`${(EVIDENCE_LOGGED / EVIDENCE_THRESHOLD) * RING_LENGTH} ${RING_LENGTH}`}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <strong>
          {EVIDENCE_LOGGED}
          <small>/{EVIDENCE_THRESHOLD}</small>
        </strong>
      </span>
      <span className="ent-callout__copy">
        <span className="ent-callout__title">Signals logged</span>
        <span className="ent-callout__text">{EVIDENCE_THRESHOLD - EVIDENCE_LOGGED} more unlock the decision</span>
      </span>
    </div>

    <div className="ent-callout__part ent-callout__part--gate">
      <span className="ent-callout__head">
        <span className="ent-callout__title">The decision</span>
        <span className="ent-callout__lock">
          <Lock />
          Locked
        </span>
      </span>
      <span className="ent-gate">
        {(["Build", "Narrow", "Pivot", "Stop"] as const).map((option) => (
          <span key={option} className={`ent-gate__option is-${option.toLowerCase()}`}>
            {option}
          </span>
        ))}
      </span>
    </div>
  </div>
);

// Day 30 of the same fictional pilot.
const REPORT_TEAMS: Array<{ name: string; interviews: number; decision: Decision }> = [
  { name: "Delta", interviews: 16, decision: "Build" },
  { name: "Fjord", interviews: 13, decision: "Narrow" },
  { name: "Aurora", interviews: 11, decision: "Pivot" },
  { name: "Lumen", interviews: 9, decision: "Narrow" },
  { name: "Cedar", interviews: 8, decision: "Build" },
  { name: "Iris", interviews: 6, decision: "Keep testing" },
  { name: "Basalt", interviews: 4, decision: "Keep testing" },
  { name: "Ember", interviews: 3, decision: "Keep testing" },
];

const REPORT_INTERVIEWS = REPORT_TEAMS.reduce((sum, team) => sum + team.interviews, 0);
const REPORT_MOST = Math.max(...REPORT_TEAMS.map((team) => team.interviews));
const REPORT_DECIDED = REPORT_TEAMS.filter((team) => team.decision !== "Keep testing").length;

const REPORT_STATS = [
  { value: `${REPORT_TEAMS.length}/${REPORT_TEAMS.length}`, label: "startups took part" },
  { value: "47", label: "validation activities" },
  { value: String(REPORT_INTERVIEWS), label: "customer interviews" },
  { value: String(REPORT_DECIDED), label: "decisions recorded" },
];

const REPORT_FINDINGS = [
  "Five teams narrowed their target customer after interviews",
  "Setup cost, not price, was the most common objection",
];

const REPORT_NEXT: Array<{ name: string; decision: Decision; next: string }> = [
  { name: "Delta", decision: "Build", next: "Paid pilot with three schools" },
  { name: "Aurora", decision: "Pivot", next: "Test the small-business segment" },
  { name: "Basalt", decision: "Keep testing", next: "Five more interviews" },
];

const DONUT_RADIUS = 40;
const DONUT_LENGTH = 2 * Math.PI * DONUT_RADIUS;
const DONUT_GAP = 2.5;

// One arc per decision, in a fixed order, each as long as its share of teams.
const DONUT_SEGMENTS = (["Build", "Narrow", "Pivot", "Keep testing"] as Decision[]).reduce<
  Array<{ decision: Decision; count: number; dash: string; offset: number }>
>((segments, decision) => {
  const count = REPORT_TEAMS.filter((team) => team.decision === decision).length;
  const start = segments.reduce((sum, segment) => sum + (segment.count / REPORT_TEAMS.length) * DONUT_LENGTH, 0);
  const length = (count / REPORT_TEAMS.length) * DONUT_LENGTH;
  return [...segments, { decision, count, dash: `${Math.max(length - DONUT_GAP, 0)} ${DONUT_LENGTH}`, offset: -start }];
}, []);

/** Outcome 3: the final cohort report, as a designed document. */
export const CohortReportMock = () => (
  <div className="ent-paper-stack" role="img" aria-label="Example final cohort report with fictional startups">
    <div className="ent-paper">
      <div className="ent-paper__cover">
        <div className="ent-paper__cover-top">
          <span>
            <span className="ent-paper__kicker">Final cohort report · Day 30</span>
            <span className="ent-paper__title">Validation pilot, spring cohort</span>
          </span>
          <ExampleTag className="ent-example--on-dark" />
        </div>
        <div className="ent-paper__stats">
          {REPORT_STATS.map((stat) => (
            <span key={stat.label}>
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="ent-paper__body">
        <div className="ent-paper__panel">
          <p className="ent-paper__label">Customer interviews per startup</p>
          <ul className="ent-bars">
            {REPORT_TEAMS.map((team) => (
              <li key={team.name}>
                <span className="ent-bars__name">{team.name}</span>
                <span className="ent-bars__track">
                  <i
                    className={`is-${decisionKey(team.decision)}`}
                    style={{ width: `${(team.interviews / REPORT_MOST) * 100}%` }}
                  />
                </span>
                <span className="ent-bars__value">{team.interviews}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ent-paper__panel">
          <p className="ent-paper__label">Decisions</p>
          <div className="ent-donut">
            <svg viewBox="0 0 100 100">
              <circle className="ent-donut__track" cx="50" cy="50" r={DONUT_RADIUS} />
              {DONUT_SEGMENTS.map((segment) => (
                <circle
                  key={segment.decision}
                  className={`ent-donut__arc is-${decisionKey(segment.decision)}`}
                  cx="50"
                  cy="50"
                  r={DONUT_RADIUS}
                  strokeDasharray={segment.dash}
                  strokeDashoffset={segment.offset}
                  transform="rotate(-90 50 50)"
                />
              ))}
            </svg>
            <span className="ent-donut__center">
              <strong>
                {REPORT_DECIDED}/{REPORT_TEAMS.length}
              </strong>
              <small>decided</small>
            </span>
          </div>
          <ul className="ent-legend">
            {DONUT_SEGMENTS.map((segment) => (
              <li key={segment.decision}>
                <i className={`is-${decisionKey(segment.decision)}`} />
                {segment.decision}
                <b>{segment.count}</b>
              </li>
            ))}
          </ul>
        </div>

        <div className="ent-paper__panel">
          <p className="ent-paper__label">Key findings</p>
          <ul className="ent-findings">
            {REPORT_FINDINGS.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </div>

        <div className="ent-paper__panel">
          <p className="ent-paper__label">Next step we recommend</p>
          <ul className="ent-next">
            {REPORT_NEXT.map((team) => (
              <li key={team.name}>
                <span className="ent-next__head">
                  <strong>{team.name}</strong>
                  <DecisionBadge decision={team.decision} />
                </span>
                <span className="ent-next__step">
                  <ArrowRight aria-hidden="true" />
                  {team.next}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </div>
);

const CHECK_IN: Array<{ name: string; note: string; replied: boolean }> = [
  { name: "Delta", note: "Decision: build", replied: true },
  { name: "Aurora", note: "Pricing test running", replied: true },
  { name: "Cedar", note: "6 interviews logged", replied: true },
  { name: "Basalt", note: "No update yet", replied: false },
];

/** Outcome 4: the weekly check-in summary the program contact receives. */
export const CheckInCard = () => (
  <div className="ent-checkin" role="img" aria-label="Example weekly check-in summary with fictional startups">
    <div className="ent-checkin__head">
      <div>
        <p className="ent-checkin__title">Week 3 check-in</p>
        <p className="ent-checkin__meta">6 of 8 teams updated</p>
      </div>
      <ExampleTag />
    </div>
    <ul className="ent-checkin__list">
      {CHECK_IN.map((item) => (
        <li key={item.name} className={cn(!item.replied && "is-missing")}>
          {item.replied ? <CheckCircle2 className="is-good" aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
          <strong>{item.name}</strong>
          <span>{item.note}</span>
        </li>
      ))}
    </ul>
  </div>
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

// The core tool for each operating stage, read from the catalog so the page
// never names a tool the product doesn't have.
const TOOL_FLOW = BIZMAP_STAGE_ORDER.slice(0, 6).map((stage, index) => ({
  stage: FOUNDER_STAGE_LABELS[index],
  tool: getCoreFounderToolsForStage(stage as FounderJourneyStage)[0]?.name ?? "",
}));

/** The same tool path every founder follows, one tool per stage. */
export const ToolFlow = () => (
  <div className="ent-flow-wrap">
    <ol className="ent-flow">
      {TOOL_FLOW.map((step, index) => (
        <li key={step.stage}>
          <span className="ent-flow__stage">{step.stage}</span>
          <span className="ent-flow__tool">{step.tool}</span>
          {index < TOOL_FLOW.length - 1 ? <ArrowRight className="ent-flow__arrow" aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  </div>
);

const NETWORK_ICONS: Record<string, LucideIcon> = {
  mentors: GraduationCap,
  providers: Wrench,
  investors: Landmark,
  founders: Users,
};

type NetworkNode = { key: string; title: string; body: string };

/** Ecosystem: the cohort in the middle, the network around it. */
export const NetworkHub = ({ nodes }: { nodes: NetworkNode[] }) => {
  const half = Math.ceil(nodes.length / 2);
  const renderNode = (node: NetworkNode) => {
    const Icon = NETWORK_ICONS[node.key] ?? Users;
    return (
      <li key={node.key} className="ent-hub__node">
        <span className="ent-hub__icon" aria-hidden="true">
          <Icon />
        </span>
        <div>
          <p className="ent-hub__title">{node.title}</p>
          <p className="ent-hub__body">{node.body}</p>
        </div>
      </li>
    );
  };
  return (
    <div className="ent-hub">
      <ul className="ent-hub__side ent-hub__side--left">{nodes.slice(0, half).map(renderNode)}</ul>
      <div className="ent-hub__core" aria-hidden="true">
        <span className="ent-hub__ring" />
        <span className="ent-hub__ring ent-hub__ring--2" />
        <span className="ent-hub__label">
          Your
          <br />
          cohort
        </span>
      </div>
      <ul className="ent-hub__side ent-hub__side--right">{nodes.slice(half).map(renderNode)}</ul>
    </div>
  );
};
