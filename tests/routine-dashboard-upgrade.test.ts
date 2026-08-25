import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  getDateKeyInTimezone,
  getRoutineTasksForToday,
  getWeekStartKeyInTimezone,
  parseReminderPreferences,
  type RoutineConfig,
} from '../src/lib/routineTemplates.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('routine dates and schedule obey the founder timezone', () => {
  const instant = new Date('2026-01-05T01:00:00.000Z');
  assert.equal(getDateKeyInTimezone(instant, 'America/Los_Angeles'), '2026-01-04');
  assert.equal(getWeekStartKeyInTimezone(instant, 'America/Los_Angeles'), '2025-12-29');

  const config: RoutineConfig = {
    version: 1,
    primaryGoal: 'validate_idea',
    updatedAt: instant.toISOString(),
    tasks: [
      { id: 'sunday', title: 'Sunday task', cadence: 'daily', days: [0], source: 'custom', order: 0, active: true },
      { id: 'monday', title: 'Monday task', cadence: 'daily', days: [1], source: 'custom', order: 1, active: true },
    ],
  };
  assert.deepEqual(getRoutineTasksForToday(config, instant, 'America/Los_Angeles').map((task) => task.id), ['sunday']);
});

test('legacy reminder preferences keep a safe schedule default', () => {
  assert.deepEqual(parseReminderPreferences({ enabled: true, time: '10:15' } as never), { enabled: true, time: '10:15' });
  assert.deepEqual(parseReminderPreferences({ enabled: true, time: 'not-a-time' } as never), { enabled: true, time: '09:00' });
  assert.deepEqual(parseReminderPreferences(null), { enabled: false, time: '09:00' });
});

test('routine upgrade has separate channels, local SQL scheduling, and snapshot pending count', () => {
  const migration = read('../supabase/migrations/20260825090000_routine_dashboard_timezone_upgrade.sql');
  const page = read('../src/pages/YourRoutinePage.tsx');
  const sidebar = read('../src/components/dashboard/DashboardSidebar.tsx');

  assert.match(migration, /routine_in_app_enabled/);
  assert.match(migration, /routine_email_enabled/);
  assert.match(migration, /now\(\) AT TIME ZONE zone\.name/);
  assert.match(migration, /get_dashboard_snapshot_v4/);
  assert.match(migration, /pendingCount/);
  assert.match(page, /ReminderScheduleCard/);
  assert.match(page, /RoutineMomentumCard/);
  assert.match(page, /Array\.from\(\{ length: 96 \}/);
  assert.match(page, /28-day check-in map/);
  assert.match(sidebar, /routinePendingCount/);
});
