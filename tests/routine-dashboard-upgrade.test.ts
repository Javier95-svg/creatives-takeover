import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  getDateKeyInTimezone,
  getMonthStartKeyInTimezone,
  getRoutineTasksForToday,
  getWeekStartKeyInTimezone,
  parseReminderPreferences,
  type RoutineConfig,
} from '../src/lib/routineTemplates.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('routine reset dates obey the founder timezone and daily actions stay visible', () => {
  const instant = new Date('2026-01-05T01:00:00.000Z');
  assert.equal(getDateKeyInTimezone(instant, 'America/Los_Angeles'), '2026-01-04');
  assert.equal(getWeekStartKeyInTimezone(instant, 'America/Los_Angeles'), '2025-12-29');
  assert.equal(getMonthStartKeyInTimezone(instant, 'America/Los_Angeles'), '2026-01-01');

  const config: RoutineConfig = {
    version: 1,
    primaryGoal: 'validate_idea',
    updatedAt: instant.toISOString(),
    tasks: [
      { id: 'sunday', title: 'Sunday task', cadence: 'daily', days: [0], source: 'custom', order: 0, active: true },
      { id: 'monday', title: 'Monday task', cadence: 'daily', days: [1], source: 'custom', order: 1, active: true },
    ],
  };
  assert.deepEqual(
    getRoutineTasksForToday(config, instant, 'America/Los_Angeles').map((task) => task.id),
    ['sunday', 'monday'],
  );
});

test('legacy reminder preferences keep a safe schedule default', () => {
  assert.deepEqual(parseReminderPreferences({ enabled: true, time: '10:15' } as never), { enabled: true, time: '10:15' });
  assert.deepEqual(parseReminderPreferences({ enabled: true, time: 'not-a-time' } as never), { enabled: true, time: '09:00' });
  assert.deepEqual(parseReminderPreferences(null), { enabled: false, time: '09:00' });
});

test('routine redesign keeps creation, daily/monthly focus, and management obvious', () => {
  const migration = read('../supabase/migrations/20260827120000_routine_monthly_redesign.sql');
  const page = read('../src/pages/YourRoutinePage.tsx');
  const sidebar = read('../src/components/dashboard/DashboardSidebar.tsx');

  assert.match(migration, /period_type IN \('daily', 'monthly', 'weekly'\)/);
  assert.match(migration, /v_month_start/);
  assert.match(migration, /get_dashboard_snapshot_v4/);
  assert.match(migration, /pendingCount/);
  assert.match(page, /RoutineComposer/);
  assert.match(page, /What do you want to keep doing\?/);
  assert.match(page, /Daily/);
  assert.match(page, /Monthly/);
  assert.match(page, /Move up/);
  assert.match(page, /Pause/);
  assert.match(page, /Delete routine/);
  assert.doesNotMatch(page, /LectureOfTheDay/);
  assert.doesNotMatch(page, /RoutineFocusCard/);
  assert.doesNotMatch(page, /ReminderScheduleCard/);
  assert.doesNotMatch(page, /ROUTINE_GOAL_OPTIONS/);
  assert.match(sidebar, /routinePendingCount/);
});
