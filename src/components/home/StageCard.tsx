import type { CSSProperties, ElementType } from "react";
import { ListChecks, Target } from "lucide-react";

import "./stage-card.css";

// The stage card beside the development-cycle wheel. It shows the stage the
// wheel shows (the same active index), in that stage's colour: what the stage
// is for, and what the founder completes in it (from STAGE_TASKS in
// src/lib/bizmapStages.ts).

export type StageCardStep = {
  shortLabel: string;
  objective: string;
  result: string;
  icon: ElementType;
  accent: string;
};

export default function StageCard({ steps, active, onSelect }: {
  steps: StageCardStep[];
  active: number;
  onSelect: (index: number) => void;
}) {
  const step = steps[active];
  const Icon = step.icon;
  return (
    <div className="sc" style={{ "--accent": step.accent } as CSSProperties}>
      <div key={active} className="sc__body">
        <div className="sc__head">
          <span className="sc__icon"><Icon aria-hidden="true" /></span>
          <div>
            <p className="sc__eyebrow">Stage {active + 1} of {steps.length}</p>
            <h3 className="sc__title">{step.shortLabel}</h3>
          </div>
        </div>
        <div className="sc__bar" aria-hidden="true"><i style={{ width: `${((active + 1) / steps.length) * 100}%` }} /></div>
        <div className="sc__panel">
          <span className="sc__label"><Target aria-hidden="true" />Why it matters</span>
          <p>{step.objective}</p>
        </div>
        <div className="sc__panel sc__panel--result">
          <span className="sc__label"><ListChecks aria-hidden="true" />What you complete</span>
          <p>{step.result}</p>
        </div>
      </div>
      <ol className="sc__steps">
        {steps.map((item, index) => (
          <li key={item.shortLabel}>
            <button
              type="button"
              className={index === active ? "is-active" : index < active ? "is-past" : undefined}
              style={{ "--dot": item.accent } as CSSProperties}
              onClick={() => onSelect(index)}
              aria-current={index === active ? "step" : undefined}
              aria-label={`Go to ${item.shortLabel}`}
            >
              <i aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
