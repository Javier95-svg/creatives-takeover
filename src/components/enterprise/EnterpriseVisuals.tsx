import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  GraduationCap,
  Landmark,
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

const DecisionBadge = ({ decision }: { decision?: Decision }) =>
  decision ? (
    <span className={cn("ent-decision", `ent-decision--${decision.split(" ")[0].toLowerCase()}`)}>{decision}</span>
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
}: {
  src: string;
  width: number;
  height: number;
  title: string;
  alt: string;
}) => (
  <figure className="ent-window ent-shot">
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

const REPORT_METRICS = [
  { value: "8/8", label: "startups took part" },
  { value: "47", label: "validation activities completed" },
  { value: "61", label: "customer interviews" },
  { value: "6", label: "decisions recorded" },
];

const REPORT_FINDINGS = [
  "Five teams narrowed their target customer after interviews",
  "Setup cost, not price, was the most common objection",
];

const REPORT_TEAMS: Array<{ name: string; decision: Decision; next: string }> = [
  { name: "Delta", decision: "Build", next: "Paid pilot with three schools" },
  { name: "Fjord", decision: "Narrow", next: "Retest with agency owners" },
  { name: "Aurora", decision: "Pivot", next: "Test the small-business segment" },
  { name: "Basalt", decision: "Keep testing", next: "Five more interviews" },
];

/** Outcome 3: the final cohort report, as a document. */
export const CohortReportMock = () => (
  <div className="ent-window ent-doc" role="img" aria-label="Example final cohort report with fictional startups">
    <div className="ent-window__bar">
      <WindowDots />
      <span className="ent-window__title">Final cohort report · Day 30</span>
      <ExampleTag />
    </div>
    <div className="ent-doc__body">
      <div className="ent-doc__metrics">
        {REPORT_METRICS.map((metric) => (
          <div key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>

      <p className="ent-doc__label">Key findings</p>
      <ul className="ent-doc__findings">
        {REPORT_FINDINGS.map((finding) => (
          <li key={finding}>{finding}</li>
        ))}
      </ul>

      <p className="ent-doc__label">Each startup and the next step we recommend</p>
      <div className="ent-doc__teams">
        {REPORT_TEAMS.map((team) => (
          <div key={team.name} className="ent-doc__team">
            <span className="ent-doc__name">{team.name}</span>
            <DecisionBadge decision={team.decision} />
            <span className="ent-doc__next">
              <ArrowRight aria-hidden="true" />
              {team.next}
            </span>
          </div>
        ))}
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
