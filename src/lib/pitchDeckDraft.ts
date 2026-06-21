// Carry-over for the anonymous Pitch Deck "Quick Score". After the free analysis
// we stash the temp PDF path + the free result in sessionStorage so that, once
// the visitor signs up, the deep analysis can run on the same deck without a
// re-upload. Only a small JSON (path + scores) is stored — never the file.
import type { PitchDeckFreeResult } from '@/types/pitchDeckAnalyzer';

const KEY = 'pitch_deck_draft';

export interface PitchDeckDraft {
  v: 1;
  tempPath: string;
  fileName: string | null;
  freeResult: PitchDeckFreeResult;
}

export function savePitchDeckDraft(draft: PitchDeckDraft): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function readPitchDeckDraft(): PitchDeckDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PitchDeckDraft;
    if (parsed?.v !== 1 || !parsed.tempPath) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPitchDeckDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
