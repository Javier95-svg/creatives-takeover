export type DailyGoalPromptMode = "morning" | "evening";

const DEFAULT_SNOOZE_MS = 60 * 60 * 1000;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function getLocalDateString(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getPromptKey(prefix: string, userId: string, mode: DailyGoalPromptMode, date: string): string {
  return `${prefix}:${userId}:${mode}:${date}`;
}

function getSnoozeStorageKey(userId: string, mode: DailyGoalPromptMode, date: string): string {
  return getPromptKey('daily-goal-snooze', userId, mode, date);
}

function getResurfaceStorageKey(userId: string, mode: DailyGoalPromptMode, date: string): string {
  return getPromptKey('daily-goal-resurfaced', userId, mode, date);
}

function getUnresolvedStorageKey(userId: string, mode: DailyGoalPromptMode, date: string): string {
  return getPromptKey('daily-goal-unresolved', userId, mode, date);
}

export function getDailyGoalPromptSnoozeUntil(
  userId: string,
  mode: DailyGoalPromptMode,
  date = getLocalDateString(),
): number | null {
  if (typeof window === "undefined") return null;
  const rawValue = localStorage.getItem(getSnoozeStorageKey(userId, mode, date));
  if (!rawValue) return null;

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function snoozeDailyGoalPrompt(
  userId: string,
  mode: DailyGoalPromptMode,
  date = getLocalDateString(),
  snoozeMs = DEFAULT_SNOOZE_MS,
): number | null {
  if (typeof window === "undefined") return null;

  const snoozeUntil = Date.now() + snoozeMs;
  localStorage.setItem(getSnoozeStorageKey(userId, mode, date), String(snoozeUntil));
  localStorage.setItem(getUnresolvedStorageKey(userId, mode, date), "1");
  return snoozeUntil;
}

export function hasDailyGoalPromptResurfaced(
  userId: string,
  mode: DailyGoalPromptMode,
  date = getLocalDateString(),
): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getResurfaceStorageKey(userId, mode, date)) === "1";
}

export function markDailyGoalPromptResurfaced(
  userId: string,
  mode: DailyGoalPromptMode,
  date = getLocalDateString(),
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getResurfaceStorageKey(userId, mode, date), "1");
}

export function markDailyGoalPromptUnresolved(
  userId: string,
  mode: DailyGoalPromptMode,
  date = getLocalDateString(),
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getUnresolvedStorageKey(userId, mode, date), "1");
}

export function hasDailyGoalPromptUnresolved(
  userId: string,
  mode: DailyGoalPromptMode,
  date = getLocalDateString(),
): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getUnresolvedStorageKey(userId, mode, date)) === "1";
}

export function clearDailyGoalPromptState(
  userId: string,
  mode: DailyGoalPromptMode,
  date = getLocalDateString(),
): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getSnoozeStorageKey(userId, mode, date));
  localStorage.removeItem(getResurfaceStorageKey(userId, mode, date));
  localStorage.removeItem(getUnresolvedStorageKey(userId, mode, date));
}
