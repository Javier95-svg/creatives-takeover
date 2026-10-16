import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { FOUNDER_STAGE_LABELS } from "@/lib/bizmapStageOrder";
import { cn } from "@/lib/utils";

// The six operating stages; fundraising is an overlay, not a stage a cohort
// is tracked through.
const STAGES = FOUNDER_STAGE_LABELS.slice(0, 6);

// Fictional teams. This is an illustration of the cohort view, labelled as an
// example on the page, never presented as customer data.
const EXAMPLE_TEAMS: Array<{ name: string; idea: string; stage: number; days: number; stalled?: boolean }> = [
  { name: "Team Aurora", idea: "Scheduling for clinics", stage: 4, days: 6 },
  { name: "Team Basalt", idea: "Invoicing for freelancers", stage: 3, days: 23, stalled: true },
  { name: "Team Cedar", idea: "Recycled packaging", stage: 2, days: 9 },
  { name: "Team Delta", idea: "Tutoring marketplace", stage: 5, days: 4 },
  { name: "Team Ember", idea: "Energy audits for shops", stage: 1, days: 19, stalled: true },
  { name: "Team Fjord", idea: "Fleet maintenance app", stage: 3, days: 8 },
];

const CohortProgressPreview = () => {
  const stalled = EXAMPLE_TEAMS.filter((team) => team.stalled);

  return (
    <div className="audience-preview surface-panel trust-outline">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Spring cohort</p>
          <p className="font-space-grotesk text-lg font-semibold text-foreground">{EXAMPLE_TEAMS.length} teams</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {EXAMPLE_TEAMS.length - stalled.length} on track
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {stalled.length} need attention
          </span>
          <span className="audience-example-tag">Example</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Example cohort: each team’s current stage and days in that stage</caption>
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th scope="col" className="px-5 py-3 font-semibold sm:px-7">Team</th>
              <th scope="col" className="px-3 py-3 font-semibold">Stage</th>
              <th scope="col" className="px-3 py-3 font-semibold">Days in stage</th>
              <th scope="col" className="px-5 py-3 text-right font-semibold sm:px-7">Status</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLE_TEAMS.map((team) => (
              <tr key={team.name} className="border-t border-border/50">
                <td className="px-5 py-3.5 sm:px-7">
                  <p className="font-medium text-foreground">{team.name}</p>
                  <p className="text-xs text-muted-foreground">{team.idea}</p>
                </td>
                <td className="w-[38%] px-3 py-3.5">
                  <div className={cn("audience-stage-bar", team.stalled && "audience-stage-bar--stalled")} aria-hidden="true">
                    {STAGES.map((stage, index) => (
                      <span
                        key={stage}
                        className={cn(index + 1 < team.stage && "is-done", index + 1 === team.stage && "is-current")}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{STAGES[team.stage - 1]}</p>
                </td>
                <td className="px-3 py-3.5 tabular-nums text-foreground">{team.days}</td>
                <td className="px-5 py-3.5 text-right sm:px-7">
                  {team.stalled ? (
                    <span className="inline-flex rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                      Stalled
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                      On track
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border/60 bg-destructive/5 px-5 py-4 sm:px-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Alerts this week</p>
        <ul className="space-y-1.5 text-sm text-foreground">
          {stalled.map((team) => (
            <li key={team.name} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              {team.name} has been in {STAGES[team.stage - 1]} for {team.days} days with no completed tool.
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CohortProgressPreview;
