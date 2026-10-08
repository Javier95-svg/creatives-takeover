/**
 * Launch round dates. A round is a calendar week from Monday 00:00 UTC, the
 * same boundary launchpad_current_week() uses in the database.
 */

/** Monday 00:00 UTC of the week containing `date`. */
export function roundStart(date = new Date()): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - offset);
  return start;
}

/** When the round containing `date` closes: the next Monday 00:00 UTC. */
export function roundEnd(date = new Date()): Date {
  const end = roundStart(date);
  end.setUTCDate(end.getUTCDate() + 7);
  return end;
}

export function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function previousRoundStart(date = new Date()) {
  const start = roundStart(date);
  start.setUTCDate(start.getUTCDate() - 7);
  return isoDay(start);
}

export function timeLeft(until: Date, now = new Date()) {
  const ms = Math.max(0, until.getTime() - now.getTime());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
  };
}
