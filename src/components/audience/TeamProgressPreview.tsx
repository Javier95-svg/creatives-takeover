import { CheckCircle2, Circle } from "lucide-react";

// A fictional team's record, as an investor who was given visibility would
// read it. Labelled as an example on the page.
const EXAMPLE_TIMELINE: Array<{ date: string; stage: string; text: string; done: boolean }> = [
  { date: "3 Mar", stage: "Identity", text: "Target customer defined: operations leads at 20–100 person logistics firms.", done: true },
  { date: "21 Mar", stage: "Prototyping", text: "Demand page published. 214 visits, 31 sign-ups.", done: true },
  { date: "12 Apr", stage: "Validation", text: "Decision: build. Based on 9 buyer interviews and 1 documented objection.", done: true },
  { date: "8 May", stage: "Launch", text: "First paying customer.", done: true },
  { date: "Now", stage: "Traction", text: "Working on a repeatable acquisition channel.", done: false },
];

const TeamProgressPreview = () => (
  <div className="audience-preview surface-panel trust-outline p-5 sm:p-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Shared with investors by the founder</p>
        <p className="font-space-grotesk text-lg font-semibold text-foreground">Team Halcyon · Route planning for small fleets</p>
      </div>
      <span className="audience-example-tag">Example</span>
    </div>

    <ol className="relative space-y-5 border-l border-border/70 pl-6">
      {EXAMPLE_TIMELINE.map((entry) => (
        <li key={entry.date} className="relative">
          <span className="absolute -left-[33px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background">
            {entry.done ? (
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {entry.date} · {entry.stage}
          </p>
          <p className="mt-1 text-sm text-foreground">{entry.text}</p>
        </li>
      ))}
    </ol>
  </div>
);

export default TeamProgressPreview;
