export type SaveStatus = 'saved' | 'saving' | 'failed';
type Job = { patch: Record<string, unknown>; write: (patch: any) => Promise<unknown> };

/** Serial writes, coalesced patches, retained failures. A failed write never loses newer input. */
export class EditorSaveQueue {
  private jobs = new Map<string, Job>();
  private running: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  status: SaveStatus = 'saved';
  private changed: (status: SaveStatus) => void;
  private delay: number;
  constructor(changed: (status: SaveStatus) => void, delay = 350) { this.changed=changed;this.delay=delay; }
  private setStatus(status: SaveStatus) { this.status = status; this.changed(status); }
  enqueue(key: string, patch: Record<string, unknown>, write: Job['write']) {
    const old = this.jobs.get(key);
    this.jobs.set(key, { patch: { ...old?.patch, ...patch }, write });
    clearTimeout(this.timer);
    const failed = this.status === 'failed';
    if (!failed) {
      this.setStatus('saving');
      this.timer = setTimeout(() => { void this.flush().catch(() => undefined); }, this.delay);
    }
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.running) { await this.running; if (this.jobs.size) return this.flush(); return; }
    this.setStatus('saving');
    this.running = (async () => {
      while (this.jobs.size) {
        const [key, job] = this.jobs.entries().next().value!;
        this.jobs.delete(key);
        try { await job.write(job.patch); }
        catch (error) {
          const newer = this.jobs.get(key);
          this.jobs.set(key, { write: newer?.write ?? job.write, patch: { ...job.patch, ...newer?.patch } });
          this.setStatus('failed');
          throw error;
        }
      }
      clearTimeout(this.timer);
      this.setStatus('saved');
    })();
    try { await this.running; } finally { this.running = null; }
  }
}
