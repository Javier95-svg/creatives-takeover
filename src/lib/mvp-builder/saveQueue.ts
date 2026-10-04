export type SaveOutcome = 'saved' | 'changed' | 'failed';
/** Coalesces callers and reads the latest state; writes never overlap. */
export class MVPProjectSaveQueue {
  private active: Promise<boolean> | null = null;
  private requested = false;
  private readonly write: () => Promise<SaveOutcome>;
  constructor(write: () => Promise<SaveOutcome>) { this.write = write; }
  save(): Promise<boolean> {
    this.requested = true;
    if (!this.active) this.active = this.drain().finally(() => { this.active = null; });
    return this.active;
  }
  private async drain(): Promise<boolean> {
    while (this.requested) {
      this.requested = false;
      let outcome: SaveOutcome;
      try { outcome = await this.write(); } catch { this.requested = false; return false; }
      if (outcome === 'failed') { this.requested = false; return false; }
      if (outcome === 'changed') this.requested = true;
      if (this.requested) await new Promise(resolve=>setTimeout(resolve,0));
    }
    return true;
  }
}
