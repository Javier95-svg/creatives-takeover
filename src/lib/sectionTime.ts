import { sectionForPath, type AdoptionSection } from './workspaceSections.ts';

/**
 * Active time per workspace section and tool, for the admin adoption report.
 * Runs only with analytics consent (the caller enables it), and counts only
 * time with the tab visible and some input in the last minute, so a tab left
 * open over lunch adds nothing. React-free so the rules can be tested with a
 * fake clock.
 */

/** Input within this window counts as active; after it the visitor is idle. */
export const IDLE_AFTER_MS = 60_000;
/** Pending time is sent once it reaches this, and on page change or hide. */
export const FLUSH_AFTER_MS = 60_000;
/** A gap longer than this between ticks (a sleeping laptop) counts only this much. */
export const MAX_TICK_MS = 15_000;

export interface SectionTimeTarget {
  section: AdoptionSection;
  tool: string;
}

export type SendSectionTime = (target: SectionTimeTarget, seconds: number) => void;

export function createSectionTimer(send: SendSectionTime, now: () => number = Date.now) {
  let target: SectionTimeTarget | null = null;
  let enabled = false;
  let visible = true;
  let pendingMs = 0;
  let lastTick = now();
  let lastInput = Number.NEGATIVE_INFINITY;

  // Adds the part of the time since the last tick that was visible and within
  // IDLE_AFTER_MS of an input.
  const accrue = () => {
    const at = now();
    const from = at - Math.min(Math.max(at - lastTick, 0), MAX_TICK_MS);
    lastTick = at;
    if (!enabled || !visible || !target) return;
    pendingMs += Math.max(0, Math.min(at, lastInput + IDLE_AFTER_MS) - from);
  };

  const flush = () => {
    accrue();
    const seconds = Math.round(pendingMs / 1000);
    pendingMs = 0;
    if (target && seconds > 0) send(target, seconds);
  };

  return {
    /** Starts timing the page's section (or nothing, outside the sections). */
    setPath(path: string) {
      flush();
      const match = sectionForPath(path);
      target = match ? { section: match.section, tool: match.tool ?? '' } : null;
      // Opening a page is itself an input.
      lastInput = now();
    },
    /** Consent changes. Turning it off drops anything not yet sent. */
    setEnabled(on: boolean) {
      accrue();
      if (!on) pendingMs = 0;
      enabled = on;
    },
    setVisible(isVisible: boolean) {
      if (!isVisible) flush();
      else accrue();
      visible = isVisible;
    },
    input() {
      accrue();
      lastInput = now();
    },
    tick() {
      accrue();
      if (pendingMs >= FLUSH_AFTER_MS) flush();
    },
    flush,
  };
}

export type SectionTimer = ReturnType<typeof createSectionTimer>;
