export type PendingValueAction =
  | 'save_mentor'
  | 'message_mentor'
  | 'book_mentor'
  | 'save_validation';

export interface PendingValueCapture {
  action: PendingValueAction;
  entityId?: string;
  source?: string;
  resumeLabel?: string;
}

const PENDING_VALUE_CAPTURE_KEY = 'pending_value_capture';

export function persistPendingValueCapture(payload: PendingValueCapture) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PENDING_VALUE_CAPTURE_KEY, JSON.stringify(payload));
}

export function readPendingValueCapture(): PendingValueCapture | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(PENDING_VALUE_CAPTURE_KEY);
    return raw ? JSON.parse(raw) as PendingValueCapture : null;
  } catch (error) {
    console.error('Failed to read pending value capture state', error);
    return null;
  }
}

export function clearPendingValueCapture() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PENDING_VALUE_CAPTURE_KEY);
}
