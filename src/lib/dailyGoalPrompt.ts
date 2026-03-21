export type DailyGoalPromptMode = "morning" | "evening";

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function getLocalDateString(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getSkipStorageKey(userId: string, mode: DailyGoalPromptMode, date: string): string {
  return `daily-goal-skip:${userId}:${mode}:${date}`;
}

export function wasDailyGoalPromptSkipped(
  userId: string,
  mode: DailyGoalPromptMode,
  date = getLocalDateString(),
): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getSkipStorageKey(userId, mode, date)) === "1";
}

export function markDailyGoalPromptSkipped(
  userId: string,
  mode: DailyGoalPromptMode,
  date = getLocalDateString(),
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getSkipStorageKey(userId, mode, date), "1");
}

export function clearDailyGoalPromptSkipped(
  userId: string,
  mode: DailyGoalPromptMode,
  date = getLocalDateString(),
): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getSkipStorageKey(userId, mode, date));
}
