// Undo and redo for the Demo Studio editor. A snapshot is the whole demo as
// the founder sees it (title, theme, screens with their click targets), taken
// before each change. Restoring a snapshot goes through restore_demo_edit,
// which rewrites the demo's screens and click targets in one transaction.
//
// Session only: closing the editor clears the history.

export interface EditSnapshot<Step> {
  title: string;
  theme: Record<string, unknown>;
  steps: Step[];
}

export interface EditHistory<Step> {
  /** Remember the state before a change. Clears redo. */
  record(snapshot: EditSnapshot<Step>): void;
  /** The state to go back to, given the current one (which becomes redo). */
  undo(current: EditSnapshot<Step>): EditSnapshot<Step> | null;
  redo(current: EditSnapshot<Step>): EditSnapshot<Step> | null;
  canUndo(): boolean;
  canRedo(): boolean;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function createEditHistory<Step>(limit = 30): EditHistory<Step> {
  const past: EditSnapshot<Step>[] = [];
  const future: EditSnapshot<Step>[] = [];
  const same = (a: EditSnapshot<Step> | undefined, b: EditSnapshot<Step>) => Boolean(a) && JSON.stringify(a) === JSON.stringify(b);

  return {
    record(snapshot) {
      // Two records of the same state (a blur with no change) are one step.
      if (same(past[past.length - 1], snapshot)) return;
      past.push(clone(snapshot));
      if (past.length > limit) past.shift();
      future.length = 0;
    },
    undo(current) {
      const previous = past.pop();
      if (!previous) return null;
      future.push(clone(current));
      return previous;
    },
    redo(current) {
      const next = future.pop();
      if (!next) return null;
      past.push(clone(current));
      return next;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}

/** The restore_demo_edit payload for a list of screens. */
export function toRestorePayload(steps: Array<Record<string, any>>): Array<Record<string, unknown>> {
  return steps.map((step, index) => ({
    id: step.id,
    position: index,
    asset_type: step.asset_type ?? 'image',
    asset_url: step.asset_url ?? null,
    asset_width: step.asset_width ?? null,
    asset_height: step.asset_height ?? null,
    asset_captured_at: step.asset_captured_at ?? null,
    title: step.title ?? null,
    caption: step.caption ?? null,
    speaker_notes: step.speaker_notes ?? null,
    hotspots: (step.hotspots ?? []).map((hotspot: Record<string, any>) => ({
      id: hotspot.id,
      x: hotspot.x,
      y: hotspot.y,
      w: hotspot.w,
      h: hotspot.h,
      type: hotspot.type,
      label: hotspot.label ?? null,
      action: hotspot.action,
      action_target: hotspot.action_target ?? null,
    })),
  }));
}
