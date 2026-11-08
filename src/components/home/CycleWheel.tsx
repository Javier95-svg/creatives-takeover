import type { CSSProperties, ElementType } from "react";

import "./cycle-wheel.css";

// The development-cycle wheel: a ring of seven segments in the stage colours
// the stage card uses. Past stages are medium, upcoming ones faint, and the
// active one bold. It sizes itself to its own width, so the same markup works
// on phones and desktop.

type WheelStep = { shortLabel: string; icon: ElementType; accent: string };

const RADIUS = 35;
const LABEL_RADIUS = 43;
const GAP = 3;

const pointAt = (angle: number, radius: number) => {
  const rad = (angle * Math.PI) / 180;
  return { x: 50 + Math.cos(rad) * radius, y: 50 + Math.sin(rad) * radius };
};

/** An SVG arc on a circle centred in a 100×100 box, clockwise from one angle to another. */
const arc = (from: number, to: number, radius: number) => {
  const a = pointAt(from, radius);
  const b = pointAt(to, radius);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y}`;
};

export default function CycleWheel({ steps, active, onSelect }: {
  steps: WheelStep[];
  active: number;
  onSelect: (index: number) => void;
}) {
  const count = steps.length;
  const span = 360 / count;
  // Identity at the top, then clockwise.
  const angleOf = (index: number) => -90 + span * index;
  const state = (index: number) => (index === active ? "is-active" : index < active ? "is-past" : "is-next");
  const current = steps[active];
  const CurrentIcon = current.icon;

  return (
    <div className="cw">
      <div className="cw__stage">
        <svg className="cw__svg" viewBox="0 0 100 100" aria-hidden="true">
          {steps.map((item, index) => (
            <path
              key={item.shortLabel}
              d={arc(angleOf(index) - span / 2 + GAP / 2, angleOf(index) + span / 2 - GAP / 2, RADIUS)}
              className={`cw__seg ${state(index)}`}
              style={{ "--accent": item.accent } as CSSProperties}
            />
          ))}
        </svg>

        <div className="cw__centre" style={{ "--accent": current.accent } as CSSProperties}>
          <div key={active} className="cw__centre-inner">
            <CurrentIcon aria-hidden="true" className="cw__centre-icon" />
            <span className="cw__kicker">Stage {active + 1} of {count}</span>
            <span className="cw__name">{current.shortLabel}</span>
          </div>
        </div>

        {steps.map((item, index) => {
          const icon = pointAt(angleOf(index), RADIUS);
          const label = pointAt(angleOf(index), LABEL_RADIUS);
          // Names start at the ring and run away from it: right of it on the
          // right side, left of it on the left, centred at the top and bottom.
          const side = label.x > 58 ? "is-right" : label.x < 42 ? "is-left" : "is-mid";
          const Icon = item.icon;
          return (
            <div key={item.shortLabel} className={`cw__node ${state(index)}`} style={{ "--accent": item.accent } as CSSProperties}>
              <button
                type="button"
                className="cw__icon"
                style={{ left: `${icon.x}%`, top: `${icon.y}%` }}
                onClick={() => onSelect(index)}
                aria-pressed={index === active}
                aria-label={`Select Stage ${index + 1}: ${item.shortLabel}`}
              >
                <Icon aria-hidden="true" />
              </button>
              {/* The name is a second, larger target for the pointer; the button above carries it for screen readers. */}
              <span className={`cw__label ${side}`} style={{ left: `${label.x}%`, top: `${label.y}%` }} onClick={() => onSelect(index)} aria-hidden="true">
                {item.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
