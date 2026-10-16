import { FileText } from "lucide-react";

import { FOUNDER_STAGE_LABELS } from "@/lib/bizmapStageOrder";

const STAGES = FOUNDER_STAGE_LABELS.slice(0, 6);

// Fictional, aggregated figures for a 12-team cohort. Shown as an example of
// the end-of-cohort report, never as real results.
const EXAMPLE_METRICS = [
  { value: "12 / 12", label: "Teams that defined a target customer" },
  { value: "146", label: "Customer interviews logged" },
  { value: "9", label: "Demand pages published" },
  { value: "3", label: "Teams with a first paying customer" },
];

// Teams whose furthest stage reached is each stage, out of 12.
const EXAMPLE_REACHED = [12, 11, 9, 6, 4, 2];

const ImpactReportPreview = () => (
  <div className="audience-preview surface-panel trust-outline mt-6 p-5 sm:p-7">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="audience-card__icon" aria-hidden="true">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">End-of-cohort report</p>
          <p className="font-space-grotesk text-lg font-semibold text-foreground">Anonymized, ready for your funders</p>
        </div>
      </div>
      <span className="audience-example-tag">Example</span>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {EXAMPLE_METRICS.map((metric) => (
        <div key={metric.label} className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <p className="font-space-grotesk text-2xl font-semibold tabular-nums text-foreground">{metric.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{metric.label}</p>
        </div>
      ))}
    </div>

    <div className="mt-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Teams that reached each stage</p>
      <div className="space-y-2">
        {STAGES.map((stage, index) => (
          <div key={stage} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
            <span className="text-muted-foreground">{stage}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted-foreground/15">
              <div
                className="audience-bar-fill"
                style={{ width: `${(EXAMPLE_REACHED[index] / EXAMPLE_REACHED[0]) * 100}%` }}
              />
            </div>
            <span className="text-right tabular-nums text-foreground">{EXAMPLE_REACHED[index]}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Where the cohort got stuck: most teams slowed down between Validation and Building, waiting on buyer interviews.
      </p>
    </div>
  </div>
);

export default ImpactReportPreview;
