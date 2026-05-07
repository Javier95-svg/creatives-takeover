import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCalendarDays,
  getDayTaskStatus,
  getVisibleDateRange,
  groupTasksByDate,
  selectSmartTaskRecommendation,
  toDateKey,
  type CalendarTaskRow,
} from '../src/lib/taskCalendar.ts';

function task(overrides: Partial<CalendarTaskRow>): CalendarTaskRow {
  return {
    id: overrides.id ?? 'task-1',
    task_text: overrides.task_text ?? 'Test task',
    task_date: overrides.task_date ?? '2026-05-07',
    is_completed: overrides.is_completed ?? false,
    priority: overrides.priority ?? 'medium',
    deadline_time: overrides.deadline_time ?? '2026-05-07T23:59:00.000Z',
    ...overrides,
  };
}

test('month, week, and day ranges generate expected calendar spans', () => {
  const anchor = new Date('2026-05-07T12:00:00');

  const monthDays = buildCalendarDays(anchor, 'month');
  assert.equal(monthDays.length, 35);
  assert.equal(toDateKey(monthDays[0]), '2026-04-27');
  assert.equal(toDateKey(monthDays[34]), '2026-05-31');

  const weekRange = getVisibleDateRange(anchor, 'week');
  assert.equal(toDateKey(weekRange.start), '2026-05-04');
  assert.equal(toDateKey(weekRange.end), '2026-05-10');

  const dayDays = buildCalendarDays(anchor, 'day');
  assert.deepEqual(dayDays.map(toDateKey), ['2026-05-07']);
});

test('tasks group by date and ignore dismissed recommendations', () => {
  const grouped = groupTasksByDate([
    task({ id: 'a', task_date: '2026-05-07' }),
    task({ id: 'b', task_date: '2026-05-08' }),
    task({ id: 'c', task_date: '2026-05-08', recommendation_status: 'dismissed' }),
  ]);

  assert.equal(grouped['2026-05-07'].length, 1);
  assert.equal(grouped['2026-05-08'].length, 1);
});

test('day status distinguishes empty, completed, pending, and overdue', () => {
  const now = new Date('2026-05-07T12:00:00.000Z');

  assert.equal(getDayTaskStatus([], now), 'empty');
  assert.equal(getDayTaskStatus([task({ is_completed: true })], now), 'completed');
  assert.equal(getDayTaskStatus([task({ deadline_time: '2026-05-07T23:59:00.000Z' })], now), 'pending');
  assert.equal(getDayTaskStatus([task({ deadline_time: '2026-05-06T23:59:00.000Z' })], now), 'overdue');
});

test('recommendation engine prioritizes overdue manual tasks first', () => {
  const recommendation = selectSmartTaskRecommendation({
    currentStage: 'VALIDATING',
    today: '2026-05-07',
    tasks: [
      task({
        id: 'manual-overdue',
        task_text: 'Book two customer interviews',
        task_date: '2026-05-01',
        task_source: 'manual',
        deadline_time: '2026-05-01T23:59:00.000Z',
      }),
    ],
    events: [],
    toolSignals: { icpCompleted: true, waitlistCompleted: true },
    weeklyMission: null,
  });

  assert.equal(recommendation?.key, 'overdue:manual-overdue');
  assert.match(recommendation?.title ?? '', /Book two customer interviews/);
});

test('dismissed recommendation keys are skipped during cooldown', () => {
  const recommendation = selectSmartTaskRecommendation({
    currentStage: 'IDENTITY',
    today: '2026-05-07',
    tasks: [],
    events: [
      {
        recommendation_key: 'tool:icp-builder',
        event_type: 'dismissed',
        created_at: '2026-05-06T10:00:00.000Z',
      },
    ],
    toolSignals: {},
    weeklyMission: null,
  });

  assert.notEqual(recommendation?.key, 'tool:icp-builder');
  assert.equal(recommendation?.key.startsWith('stage:IDENTITY'), true);
});

test('generated recommendations do not overwrite manual tasks', () => {
  const existingManual = task({
    id: 'manual-1',
    task_text: 'Founder-defined launch task',
    task_source: 'manual',
  });

  const recommendation = selectSmartTaskRecommendation({
    currentStage: 'BUILDING',
    today: '2026-05-07',
    tasks: [existingManual],
    events: [],
    toolSignals: { icpCompleted: true, waitlistCompleted: true, pmfCompleted: true },
    weeklyMission: null,
  });

  assert.equal(existingManual.task_text, 'Founder-defined launch task');
  assert.ok(recommendation);
  assert.notEqual(recommendation?.title, existingManual.task_text);
});
