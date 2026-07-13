// One-way handoff from a GTM Strategist channel recommendation into a
// Traction Engine sprint draft. Stored in localStorage (account-scoped via
// ACCOUNT_SCOPED_STORAGE_PREFIXES) and consumed exactly once by the Traction
// Engine on its next mount, so a recommended channel becomes a runnable weekly
// experiment without retyping.

const HANDOFF_KEY = 'ct_gtm_traction_handoff';

export interface GTMTractionHandoff {
  channel: string;
  targetMetric: string;
  hypothesis: string;
  fitScore?: number;
  createdAt: string;
}

export function saveGTMTractionHandoff(handoff: Omit<GTMTractionHandoff, 'createdAt'>): void {
  try {
    localStorage.setItem(HANDOFF_KEY, JSON.stringify({ ...handoff, createdAt: new Date().toISOString() }));
  } catch {
    /* storage can be unavailable (private mode); the button still navigates */
  }
}

export function consumeGTMTractionHandoff(): GTMTractionHandoff | null {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    localStorage.removeItem(HANDOFF_KEY);
    const parsed = JSON.parse(raw) as GTMTractionHandoff;
    if (!parsed?.channel?.trim() || !parsed?.hypothesis?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}
