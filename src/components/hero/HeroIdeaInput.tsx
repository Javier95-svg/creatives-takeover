import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { HERO_MODES, type HeroMode } from "@/lib/heroFunnelRules";

const MIN_CHARS = 3;
const MAX_ROWS = 3;
const MODE_ORDER: HeroMode[] = ["idea", "product"];

export interface HeroIdeaInputHandle {
  focus: () => void;
}

interface HeroIdeaInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFirstFocus?: () => void;
  mode: HeroMode;
  onModeChange: (mode: HeroMode) => void;
  busy?: boolean;
  disabled?: boolean;
}

/**
 * The single hero input that replaces "Define ideal customer" / "Launch a live
 * demo".
 *
 * Composed like the /build chat card: one surface holding the field, a hairline
 * divider, and a footer bar carrying the mode toggle on the left and the submit
 * pill on the right. Submit lives inside the card so the standalone button
 * below the field could be removed without making Enter the only way to submit,
 * which would be undiscoverable and unreachable by keyboard-only users.
 *
 * The two modes map to the two tools: Idea -> ICP Builder, Product -> Demo
 * Studio. Unlike the old two-CTA hero, picking a mode is optional - Idea is
 * preselected and the field is usable without touching the toggle.
 *
 * Dependency-free and part of the eager hero bundle: it must be visible and
 * typable before the generation island loads. It does not autofocus - that
 * scroll-jumps on mobile and would move the LCP element.
 */
export const HeroIdeaInput = forwardRef<HeroIdeaInputHandle, HeroIdeaInputProps>(function HeroIdeaInput(
  { value, onChange, onSubmit, onFirstFocus, mode, onModeChange, busy = false, disabled = false },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasFocusedRef = useRef(false);
  const [nudge, setNudge] = useState(false);
  const config = HERO_MODES[mode];

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  // Auto-grow from 1 row up to MAX_ROWS. Runs in a layout effect so the height
  // is correct before paint and typing never flashes a scrollbar.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight) || 30;
    const maxHeight = lineHeight * MAX_ROWS;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  const canSubmit = value.trim().length >= MIN_CHARS && !busy && !disabled;

  const handleSubmit = useCallback(() => {
    if (canSubmit) {
      onSubmit();
      return;
    }
    // Empty submit must not error. Pulse the card and keep focus rather than
    // showing a red validation state - nothing has gone wrong yet.
    setNudge(true);
    textareaRef.current?.focus();
  }, [canSubmit, onSubmit]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleFocus = () => {
    if (hasFocusedRef.current) return;
    hasFocusedRef.current = true;
    onFirstFocus?.();
  };

  // Left/Right arrows move between tabs, per the WAI-ARIA tabs pattern.
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = MODE_ORDER.indexOf(mode);
    const next = event.key === "ArrowRight"
      ? (current + 1) % MODE_ORDER.length
      : (current - 1 + MODE_ORDER.length) % MODE_ORDER.length;
    onModeChange(MODE_ORDER[next]);
  };

  return (
    <div className="ct-hero__idea">
      {/* Clicking anywhere on the card focuses the field, as on /build. */}
      <div
        className={`ct-hero__idea-card${nudge ? " is-nudged" : ""}`}
        onClick={() => textareaRef.current?.focus()}
        onAnimationEnd={() => setNudge(false)}
      >
        <label className="ct-hero__idea-label" htmlFor="hero-idea-input">
          {config.question}
        </label>

        <textarea
          id="hero-idea-input"
          ref={textareaRef}
          className="ct-hero__idea-textarea"
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={config.placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
        />

        <div className="ct-hero__idea-bar">
          <div className="ct-hero__idea-modes" role="tablist" aria-label="What stage are you at?">
            {MODE_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={mode === option}
                tabIndex={mode === option ? 0 : -1}
                className={`ct-hero__idea-mode${mode === option ? " is-on" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onModeChange(option);
                }}
                onKeyDown={handleTabKeyDown}
              >
                {HERO_MODES[option].label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="ct-hero__idea-send"
            onClick={(event) => {
              event.stopPropagation();
              handleSubmit();
            }}
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
          >
            {busy ? "Working…" : config.cta}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="5" y1="12" x2="18" y2="12" />
              <polyline points="12 6 18 12 12 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

export default HeroIdeaInput;
