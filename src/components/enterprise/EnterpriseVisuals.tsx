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

// Product illustrations for /enterprise. Every team, number and date here is
// fictional and each visual carries an "Example" tag; none of it is presented
// as customer data.

// The six operating stages. Fundraising is an overlay, not a stage a cohort is
// tracked through.
const STAGES = FOUNDER_STAGE_LABELS.slice(0, 6);

type ExampleTeam = { name: string; stage: number; days: number; stalled?: boolean };

const EXAMPLE_COHORT: ExampleTeam[] = [
  { name: "Ember", stage: 1, days: 19, stalled: true },
  { name: "Lumen", stage: 1, days: 4 },
  { name: "Cedar", stage: 2, days: 9 },
  { name: "Iris", stage: 2, days: 3 },
  { name: "Basalt", stage: 3, days: 23, stalled: true },
  { name: "Fjord", stage: 3, days: 8 },
  { name: "Juniper", stage: 3, days: 17, stalled: true },
  { name: "Aurora", stage: 4, days: 6 },
  { name: "Garnet", stage: 4, days: 11 },
  { name: "Delta", stage: 5, days: 4 },
  { name: "Kestrel", stage: 5, days: 7 },
  { name: "Halcyon", stage: 6, days: 12 },
];

const STALLED = EXAMPLE_COHORT.filter((team) => team.stalled);

const ExampleTag = ({ className }: { className?: string }) => (
  <span className={cn("ent-example", className)}>Example</span>
);

/** Hero visual: the cohort as a board, one column per stage. */
export const CohortBoardMock = () => (
  <div className="ent-mock" aria-label="Example cohort dashboard with fictional teams" role="img">
    <div className="ent-window">
      <div className="ent-window__bar">
        <span className="ent-window__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="ent-window__title">Spring cohort · Program view</span>
        <ExampleTag />
      </div>

      <div className="ent-kpis">
        <div>
          <strong>{EXAMPLE_COHORT.length}</strong>
          <span>teams</span>
        </div>
        <div>
          <strong className="is-good">{EXAMPLE_COHORT.length - STALLED.length}</strong>
          <span>on track</span>
        </div>
        <div>
          <strong className="is-bad">{STALLED.length}</strong>
          <span>need attention</span>
        </div>
        <div>
          <strong>Week 6</strong>
          <span>of 12</span>
        </div>
      </div>

      <div className="ent-board">
        {STAGES.map((stage, index) => {
          const teams = EXAMPLE_COHORT.filter((team) => team.stage === index + 1);
          return (
            <div key={stage} className="ent-board__col">
              <p className="ent-board__stage">{stage}</p>
              {teams.map((team) => (
                <div key={team.name} className={cn("ent-chip", team.stalled && "is-stalled")}>
                  <span className="ent-chip__name">{team.name}</span>
                  <span className="ent-chip__days">{team.days}d</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>

    <div className="ent-float ent-float--alert" aria-hidden="true">
      <span className="ent-float__icon is-bad">
        <AlertTriangle />
      </span>
      <div>
        <p className="ent-float__title">Basalt is stalling</p>
        <p className="ent-float__text">23 days in Validation, no tool completed</p>
      </div>
    </div>

    <div className="ent-float ent-float--report" aria-hidden="true">
      <span className="ent-float__icon is-good-bg">
        <TrendingUp />
      </span>
      <div>
        <p className="ent-float__title">Delta reached Launch</p>
        <p className="ent-float__text">14 interviews · first paying customer</p>
      </div>
    </div>
  </div>
);

/** Bento: a compact team list with stage progress and days in stage. */
export const TeamProgressList = () => (
  <div className="ent-list">
    {EXAMPLE_COHORT.filter((team) => ["Aurora", "Basalt", "Delta", "Ember"].includes(team.name)).map((team) => (
      <div key={team.name} className="ent-list__row">
        <span className="ent-list__name">{team.name}</span>
        <span className={cn("ent-progress", team.stalled && "is-stalled")} aria-hidden="true">
          {STAGES.map((stage, index) => (
            <i key={stage} className={cn(index + 1 < team.stage && "is-done", index + 1 === team.stage && "is-current")} />
          ))}
        </span>
        <span className="ent-list__stage">{STAGES[team.stage - 1]}</span>
        <span className={cn("ent-list__days", team.stalled && "is-bad")}>{team.days}d</span>
      </div>
    ))}
    <ExampleTag className="ent-list__tag" />
  </div>
);

/** Bento: the alerts a program manager would see this week. */
export const StallAlerts = () => (
  <ul className="ent-alerts">
    {STALLED.map((team) => (
      <li key={team.name}>
        <AlertTriangle aria-hidden="true" />
        <span>
          <strong>{team.name}</strong> · {team.days} days in {STAGES[team.stage - 1]}
        </span>
      </li>
    ))}
  </ul>
);

// Teams (out of 12) whose furthest stage reached is each stage.
const EXAMPLE_REACHED = [12, 11, 9, 6, 4, 2];

/** Bento: the end-of-cohort report, aggregated and anonymized. */
export const ReportMini = () => (
  <div className="ent-report">
    <div className="ent-report__metrics">
      <div>
        <strong>146</strong>
        <span>customer interviews</span>
      </div>
      <div>
        <strong>9</strong>
        <span>demand pages</span>
      </div>
      <div>
        <strong>3</strong>
        <span>paying customers</span>
      </div>
    </div>
    <div className="ent-report__bars" aria-hidden="true">
      {EXAMPLE_REACHED.map((count, index) => (
        <span key={STAGES[index]} style={{ height: `${(count / EXAMPLE_REACHED[0]) * 100}%` }} />
      ))}
    </div>
    <p className="ent-report__caption">Teams that reached each stage</p>
  </div>
);

// The core tool for each operating stage, read from the catalog so the page
// never names a tool the product doesn't have.
const TOOL_FLOW = BIZMAP_STAGE_ORDER.slice(0, 6).map((stage, index) => ({
  stage: FOUNDER_STAGE_LABELS[index],
  tool: getCoreFounderToolsForStage(stage as FounderJourneyStage)[0]?.name ?? "",
}));

/** The same tool path every team follows; with showTeams, where each team is now. */
export const ToolFlow = ({ showTeams = false }: { showTeams?: boolean }) => (
  <div className="ent-flow-wrap">
    <ol className="ent-flow">
      {TOOL_FLOW.map((step, index) => (
        <li key={step.stage}>
          <span className="ent-flow__stage">{step.stage}</span>
          <span className="ent-flow__tool">{step.tool}</span>
          {showTeams ? (
            <span className="ent-flow__teams" aria-hidden="true">
              {EXAMPLE_COHORT.filter((team) => team.stage === index + 1).map((team) => (
                <i key={team.name} className={cn(team.stalled && "is-stalled")} title={team.name} />
              ))}
            </span>
          ) : null}
          {index < TOOL_FLOW.length - 1 ? <ArrowRight className="ent-flow__arrow" aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
    {showTeams ? (
      <p className="ent-flow__legend">
        <span><i /> Team on track</span>
        <span><i className="is-stalled" /> Stalled</span>
        <ExampleTag />
      </p>
    ) : null}
  </div>
);

/** Bento: what program staff can and cannot see. */
export const VisibilitySplit = () => (
  <div className="ent-visibility">
    <div>
      <p className="ent-visibility__head">Your staff see</p>
      <ul>
        {["Each team’s stage", "Tools completed", "Days in stage", "Last activity"].map((item) => (
          <li key={item}>
            <Check aria-hidden="true" className="is-good" />
            {item}
          </li>
        ))}
      </ul>
    </div>
    <div>
      <p className="ent-visibility__head">Stays with founders</p>
      <ul>
        {["Ideas and notes", "Files and drafts", "Conversations"].map((item) => (
          <li key={item}>
            <Lock aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

// One fictional founder record, as program staff would read it.
const EXAMPLE_RECORD: Array<{ date: string; stage: string; text: string; done: boolean }> = [
  { date: "3 Mar", stage: "Identity", text: "Target customer defined", done: true },
  { date: "21 Mar", stage: "Prototyping", text: "Demand page live: 214 visits, 31 sign-ups", done: true },
  { date: "12 Apr", stage: "Validation", text: "Decision: build, from 14 buyer interviews", done: true },
  { date: "8 May", stage: "Launch", text: "First paying customer", done: true },
];

/** Bento: a founder record, where every stage is backed by logged work. */
export const FounderRecord = () => (
  <div className="ent-record">
    <div className="ent-record__head">
      <span className="ent-record__avatar" aria-hidden="true">D</span>
      <div>
        <p className="ent-record__name">Delta</p>
        <p className="ent-record__meta">Tutoring marketplace · Launch</p>
      </div>
      <ExampleTag className="ent-record__tag" />
    </div>
    <ol className="ent-record__list">
      {EXAMPLE_RECORD.map((entry) => (
        <li key={entry.date}>
          {entry.done ? <CheckCircle2 aria-hidden="true" className="is-good" /> : <Circle aria-hidden="true" />}
          <span className="ent-record__text">{entry.text}</span>
          <span className="ent-record__date">{entry.date}</span>
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

// helps: what this part of the ecosystem takes off the program team.
type NetworkNode = { key: string; title: string; body: string; helps?: string };

/** Perks: the cohort in the middle, the network around it. */
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
          {node.helps ? <p className="ent-helps">{node.helps}</p> : null}
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
