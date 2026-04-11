export type WeeklyCheckinDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type PartnerCheckInMode = 'async' | 'live';

export interface AccountabilityPreferences {
  weekly_checkin_day: WeeklyCheckinDay;
  timezone: string;
  weekly_scorecard_local_hour: number;
  public_stage_visible: boolean;
  auto_share_milestones: boolean;
  preferred_partner_checkin_mode: PartnerCheckInMode;
  stage_last_updated_at: string | null;
  last_weekly_scorecard_week_start: string | null;
}

const WEEKDAY_ORDER: WeeklyCheckinDay[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const SHORT_WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const DEFAULT_ACCOUNTABILITY_PREFERENCES: AccountabilityPreferences = {
  weekly_checkin_day: 'monday',
  timezone: 'UTC',
  weekly_scorecard_local_hour: 18,
  public_stage_visible: false,
  auto_share_milestones: false,
  preferred_partner_checkin_mode: 'async',
  stage_last_updated_at: null,
  last_weekly_scorecard_week_start: null,
};

function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function coerceHour(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_ACCOUNTABILITY_PREFERENCES.weekly_scorecard_local_hour;
  }

  return Math.max(0, Math.min(23, Math.round(numeric)));
}

function isWeeklyCheckinDay(value: unknown): value is WeeklyCheckinDay {
  return typeof value === 'string' && WEEKDAY_ORDER.includes(value as WeeklyCheckinDay);
}

function isPartnerCheckInMode(value: unknown): value is PartnerCheckInMode {
  return value === 'async' || value === 'live';
}

function getPreferenceRecord(userPreferences: Record<string, unknown> | null | undefined) {
  return userPreferences && typeof userPreferences === 'object'
    ? userPreferences
    : {};
}

function getTimezoneDateParts(referenceDate: Date, timeZone: string) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      hour12: false,
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      hour12: false,
    });
  }

  const parts = formatter.formatToParts(referenceDate);
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
    weekdayIndex: SHORT_WEEKDAY_TO_INDEX[partMap.weekday] ?? 0,
    hour: Number(partMap.hour),
  };
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function normalizeAccountabilityPreferences(
  userPreferences: Record<string, unknown> | null | undefined,
): AccountabilityPreferences {
  const preferences = getPreferenceRecord(userPreferences);
  const timezone = typeof preferences.timezone === 'string' && preferences.timezone.trim()
    ? preferences.timezone
    : getBrowserTimezone();

  return {
    weekly_checkin_day: isWeeklyCheckinDay(preferences.weekly_checkin_day)
      ? preferences.weekly_checkin_day
      : DEFAULT_ACCOUNTABILITY_PREFERENCES.weekly_checkin_day,
    timezone,
    weekly_scorecard_local_hour: coerceHour(preferences.weekly_scorecard_local_hour),
    public_stage_visible: preferences.public_stage_visible === true,
    auto_share_milestones: preferences.auto_share_milestones === true,
    preferred_partner_checkin_mode: isPartnerCheckInMode(preferences.preferred_partner_checkin_mode)
      ? preferences.preferred_partner_checkin_mode
      : DEFAULT_ACCOUNTABILITY_PREFERENCES.preferred_partner_checkin_mode,
    stage_last_updated_at:
      typeof preferences.stage_last_updated_at === 'string' && preferences.stage_last_updated_at.trim()
        ? preferences.stage_last_updated_at
        : null,
    last_weekly_scorecard_week_start:
      typeof preferences.last_weekly_scorecard_week_start === 'string' && preferences.last_weekly_scorecard_week_start.trim()
        ? preferences.last_weekly_scorecard_week_start
        : null,
  };
}

export function mergeAccountabilityPreferences(
  userPreferences: Record<string, unknown> | null | undefined,
  patch: Partial<AccountabilityPreferences>,
): Record<string, unknown> {
  return {
    ...getPreferenceRecord(userPreferences),
    ...patch,
  };
}

export function getCurrentWeekWindow(
  userPreferences?: Record<string, unknown> | null,
  referenceDate: Date = new Date(),
) {
  const preferences = normalizeAccountabilityPreferences(userPreferences);
  const timeZoneParts = getTimezoneDateParts(referenceDate, preferences.timezone);
  const localDateAsUtc = new Date(Date.UTC(
    timeZoneParts.year,
    timeZoneParts.month - 1,
    timeZoneParts.day,
  ));
  const startDayIndex = WEEKDAY_ORDER.indexOf(preferences.weekly_checkin_day);
  const diffToWeekStart = (timeZoneParts.weekdayIndex - startDayIndex + 7) % 7;

  const weekStartDate = new Date(localDateAsUtc);
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - diffToWeekStart);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);

  return {
    startDate: weekStartDate,
    endDate: weekEndDate,
    start: formatUtcDate(weekStartDate),
    end: formatUtcDate(weekEndDate),
    timezone: preferences.timezone,
    localHour: timeZoneParts.hour,
    localWeekdayIndex: timeZoneParts.weekdayIndex,
  };
}

export function getWeeklyScorecardDueWeekday(startDay: WeeklyCheckinDay) {
  const startDayIndex = WEEKDAY_ORDER.indexOf(startDay);
  return WEEKDAY_ORDER[(startDayIndex + 6) % 7];
}

export function getPublicStageLabel(stage?: string | null, startupStage?: string | null) {
  const value = stage?.trim() || startupStage?.trim() || '';
  if (!value) {
    return null;
  }

  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function shouldShowPublicStage(
  userPreferences: Record<string, unknown> | null | undefined,
  isOwnProfile: boolean,
) {
  return isOwnProfile || normalizeAccountabilityPreferences(userPreferences).public_stage_visible;
}

export function formatActiveDaysLabel(activeDays: number, windowSize = 14) {
  const bounded = Math.max(0, Math.min(windowSize, Math.round(activeDays)));
  return `Active ${bounded} of the last ${windowSize} days`;
}
