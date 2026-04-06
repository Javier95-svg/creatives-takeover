function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcMonthsClamped(date: Date, monthsToAdd: number): Date {
  const source = toUtcMidnight(date);
  const targetMonthIndex = source.getUTCMonth() + monthsToAdd;
  const targetYear = source.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(source.getUTCDate(), lastDayOfTargetMonth);

  return new Date(Date.UTC(targetYear, normalizedMonth, targetDay));
}

export function normalizeBillingAnchor(value?: string | null): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toUtcMidnight(parsed);
}

export interface BillingWindow {
  anchorAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

export function resolveMonthlyBillingWindow(
  anchorSource?: string | Date | null,
  nowSource: Date = new Date(),
): BillingWindow {
  const fallbackNow = toUtcMidnight(nowSource);
  const parsedAnchor = anchorSource instanceof Date
    ? toUtcMidnight(anchorSource)
    : normalizeBillingAnchor(anchorSource ?? null);
  const anchorAt = parsedAnchor ?? fallbackNow;

  let offset = 0;
  let periodStart = addUtcMonthsClamped(anchorAt, offset);
  let periodEnd = addUtcMonthsClamped(anchorAt, offset + 1);

  while (fallbackNow >= periodEnd) {
    offset += 1;
    periodStart = addUtcMonthsClamped(anchorAt, offset);
    periodEnd = addUtcMonthsClamped(anchorAt, offset + 1);
  }

  while (fallbackNow < periodStart) {
    offset -= 1;
    periodStart = addUtcMonthsClamped(anchorAt, offset);
    periodEnd = addUtcMonthsClamped(anchorAt, offset + 1);
  }

  return { anchorAt, periodStart, periodEnd };
}

export function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}