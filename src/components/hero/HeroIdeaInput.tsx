import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

const MIN_CHARS = 3;
const MAX_ROWS = 3;

export interface HeroIdeaInputHandle {
  focus: () => void;
}

interface HeroIdeaInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFirstFocus?: () => void;
  /** Swaps the label to "Build my demo" when the founder pastes a link. */
  hasUrl?: boolean;
  busy?: boolean;
  disabled?: boolean;
}

/**
 * The single hero input that replaces "Define ideal customer" / "Launch a live
 * demo".
 *
 * Deliberately dependency-free and part of the eager hero bundle: it must be
 * visible and typable before the generation island loads. Everything that needs
 * a network call lives in HeroResultIsland, which is lazy.
 *
 * It does not autofocus - that scroll-jumps on mobile and would move the LCP
 * element.
 */
export const HeroIdeaInput = forwardRef<HeroIdeaInputHandle, HeroIdeaInputProps>(function HeroIdeaInput(
  { value, onChange, onSubmit, onFirstFocus, hasUrl = false, busy = false, disabled = false },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasFocusedRef = useRef(false);
  const [nudge, setNudge] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  // Auto-grow from 1 row up to MAX_ROWS. Runs in a layout effect so the height
  // is correct before paint and typing never flashes a scrollbar.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight) || 24;
    const paddingY = Number.parseFloat(getComputedStyle(el).paddingTop) * 2 || 0;
    const maxHeight = lineHeight * MAX_ROWS + paddingY;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  const canSubmit = value.trim().length >= MIN_CHARS && !busy && !disabled;

  const handleSubmit = useCallback(() => {
    if (canSubmit) {
      onSubmit();
      return;
    }
    // Empty submit must not error. Draw the eye to the helper line and keep
    // focus rather than showing a red validation state.
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

  return (
    <div className="ct-hero__idea">
      <div className="ct-hero__idea-field">
        <label className="ct-hero__idea-label" htmlFor="hero-idea-input">
          What are you building?
        </label>
        <textarea
          id="hero-idea-input"
          ref={textareaRef}
          className="ct-hero__idea-textarea"
          rows={1}
          value={value}
          disabled={disabled}
          placeholder="e.g. a scheduling tool for independent hairdressers"
          onChange={(event) => {
            if (nudge) setNudge(false);
            onChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          aria-describedby="hero-idea-helper"
        />
      </div>

      <button
        type="button"
        className="ct-hero__cta ct-hero__idea-submit"
        onClick={handleSubmit}
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
      >
        {busy ? "Working…" : hasUrl ? "Build my demo" : "Get my customer profile"}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <p
        id="hero-idea-helper"
        className={`ct-hero__idea-helper${nudge ? " is-active" : ""}`}
        aria-live="polite"
      >
        One sentence is enough. Paste a URL if it&apos;s already live.
      </p>
    </div>
  );
});

export default HeroIdeaInput;
