/**
 * What the open tool tells Pulse about itself.
 *
 * A tool page publishes a small, structured summary of its current state (counts,
 * blockers, status) and the widget sends it with each message, so in-tool help
 * can be about this screen rather than the tool in general. The server treats
 * it as client-reported data: never proof of completion or access, never
 * instructions. Validation is shared with the edge function, so keep this
 * module import-light.
 */

export type PulseToolStateValue = string | number | boolean | string[];

export interface PulseToolState {
  /** The workspace capability id of the tool, e.g. demo_studio. */
  tool: string;
  summary: Record<string, PulseToolStateValue>;
  asOf: string;
}

let current: PulseToolState | null = null;

/** Called by a tool page whenever its state changes; null when the page unmounts. */
export function publishPulseToolState(state: PulseToolState | null): void {
  current = state;
}

export function readPulseToolState(): PulseToolState | null {
  return current;
}

const TOOL = /^[a-z][a-z0-9_]{1,39}$/;
const KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const MAX_KEYS = 12;
const MAX_JSON = 2000;

/** A bounded, typed copy of a client-supplied state, or null when it is not one. */
export function validatePulseToolState(raw: unknown): PulseToolState | null {
  if (!raw || typeof raw !== 'object') return null;
  const { tool, summary, asOf } = raw as Record<string, unknown>;
  if (typeof tool !== 'string' || !TOOL.test(tool) || !summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
  const clean: Record<string, PulseToolStateValue> = {};
  for (const [key, value] of Object.entries(summary as Record<string, unknown>).slice(0, MAX_KEYS)) {
    if (!KEY.test(key)) continue;
    if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) clean[key] = value;
    else if (typeof value === 'string') clean[key] = value.slice(0, 200);
    else if (Array.isArray(value)) clean[key] = value.filter((item): item is string => typeof item === 'string').slice(0, 8).map((item) => item.slice(0, 120));
  }
  if (!Object.keys(clean).length) return null;
  const state: PulseToolState = { tool, summary: clean, asOf: typeof asOf === 'string' && !Number.isNaN(Date.parse(asOf)) ? asOf : new Date().toISOString() };
  return JSON.stringify(state).length <= MAX_JSON ? state : null;
}

/** The proactive bubble's line about the open tool, or null when nothing specific is known. */
export function describePulseToolState(state: PulseToolState | null): string | null {
  if (!state || state.tool !== 'demo_studio') return null;
  const { screens, screensNotReady, published, readyToPublish } = state.summary;
  const total = typeof screens === 'number' ? screens : 0;
  const notReady = typeof screensNotReady === 'number' ? screensNotReady : 0;
  if (total === 0) return 'Your demo has no screens yet. Want help choosing what to capture first?';
  if (notReady > 0) return `${notReady} of your ${total} screens ${notReady === 1 ? 'is' : 'are'} not ready to publish yet. Want to go through them?`;
  if (published === false && readyToPublish === true) return 'Your demo passes every check and is still a draft. Want help with the publish and share steps?';
  if (published === true) return 'Your demo is live. Want ideas for where to share it, or help with the pitch video and launch page?';
  return null;
}
