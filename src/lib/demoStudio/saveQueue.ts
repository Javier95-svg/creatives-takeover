// Saves Demo Studio edits one at a time. Each field used to save on its own
// with a toast on failure, so two quick edits could land out of order, a failed
// save was simply lost, and the editor never said whether work was saved.
//
// Edits to the same thing (one screen, one click target, the demo settings)
// are merged while they wait. A failed save is kept, newer edits are merged on
// top of it, and it is retried on Retry or with the next edit.

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveQueueState {
  status: SaveStatus;
  pendingCount: number;
  error: string | null;
}

type Patch = Record<string, unknown>;

interface Job {
  patch: Patch;
  write: (patch: Patch) => Promise<unknown>;
}

export interface SaveQueue {
  /** Queue an edit. `key` names what is edited, e.g. `step:<id>`. */
  enqueue<T extends Patch>(key: string, patch: T, write: (patch: T) => Promise<unknown>): void;
  /** Try failed saves again. */
  retry(): void;
  /** Drop a waiting edit, e.g. for something that was just deleted. */
  discard(key: string): void;
  /** Save everything waiting. Resolves true when nothing is left unsaved. */
  flush(): Promise<boolean>;
  getState(): SaveQueueState;
}

export function createSaveQueue(onChange: (state: SaveQueueState) => void = () => undefined): SaveQueue {
  const pending = new Map<string, Job>();
  let running: Promise<void> | null = null;
  let failed = false;
  let lastError: string | null = null;
  let savedOnce = false;

  const getState = (): SaveQueueState => ({
    status: failed ? 'error' : running || pending.size > 0 ? 'saving' : savedOnce ? 'saved' : 'idle',
    pendingCount: pending.size,
    error: failed ? lastError : null,
  });
  const emit = () => onChange(getState());

  const run = async () => {
    while (pending.size > 0) {
      const [key, job] = pending.entries().next().value as [string, Job];
      pending.delete(key);
      try {
        await job.write(job.patch);
        savedOnce = true;
      } catch (error) {
        // Keep the failed edit, with anything typed since layered on top.
        const newer = pending.get(key);
        pending.set(key, { patch: { ...job.patch, ...newer?.patch }, write: newer?.write ?? job.write });
        failed = true;
        lastError = error instanceof Error ? error.message : 'Could not save.';
        return;
      }
      emit();
    }
  };

  const kick = () => {
    if (running || failed || pending.size === 0) return;
    running = run().finally(() => {
      running = null;
      emit();
      // Edits that arrived during the last write, unless it failed.
      if (!failed && pending.size > 0) kick();
    });
    emit();
  };

  return {
    enqueue(key, patch, write) {
      const existing = pending.get(key);
      pending.set(key, { patch: { ...existing?.patch, ...patch }, write: write as Job['write'] });
      // A new edit is also a retry: the connection may be back.
      failed = false;
      kick();
      emit();
    },
    retry() {
      failed = false;
      kick();
      emit();
    },
    discard(key) {
      pending.delete(key);
      if (pending.size === 0) failed = false;
      emit();
    },
    async flush() {
      failed = false;
      kick();
      while (running) await running;
      return !failed && pending.size === 0;
    },
    getState,
  };
}
