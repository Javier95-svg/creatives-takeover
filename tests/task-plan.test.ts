import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  getNextPlanItem,
  getPlanProgress,
  reorderPlanItemIds,
  sortPlanItems,
  taskEstimatedMinutes,
  type DailyTaskPlanItem,
} from '../src/lib/taskPlan.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

function item(rank: number, completed = false, optional = false): DailyTaskPlanItem {
  return {
    id: `item-${rank}`,
    rank,
    carriedForward: false,
    optional,
    task: {
      id: `task-${rank}`,
      task_text: `Task ${rank}`,
      task_date: '2026-08-27',
      is_completed: completed,
      estimated_minutes: rank * 10,
    },
  };
}

test('daily plan progress is based on the three essential slots', () => {
  const items = [item(4, true), item(2, true), item(1, true), item(3, false)];
  assert.deepEqual(sortPlanItems(items).map((entry) => entry.rank), [1, 2, 3, 4]);
  assert.deepEqual(getPlanProgress(items), { completed: 2, total: 3, percentage: 67 });
  assert.equal(getNextPlanItem(items)?.task.id, 'task-3');
});

test('an optional fourth task does not erase completion of the essential three', () => {
  const items = [item(1, true), item(2, true), item(3, true), item(4, false, true)];
  assert.deepEqual(getPlanProgress(items), { completed: 3, total: 3, percentage: 100 });
  assert.equal(getNextPlanItem(items)?.rank, 4);
  const reordered = [{ ...items[3], rank: 1 }, { ...items[0], rank: 2 }, { ...items[1], rank: 3 }, { ...items[2], rank: 4 }];
  assert.deepEqual(getPlanProgress(reordered), { completed: 3, total: 3, percentage: 100 });
});

test('plan reordering is stable and keyboard-friendly', () => {
  const items = [item(1), item(2), item(3)];
  assert.deepEqual(reorderPlanItemIds(items, 'task-2', -1), ['task-2', 'task-1', 'task-3']);
  assert.deepEqual(reorderPlanItemIds(items, 'task-1', -1), ['task-1', 'task-2', 'task-3']);
  assert.deepEqual(reorderPlanItemIds(items, 'task-3', 1), ['task-1', 'task-2', 'task-3']);
  assert.equal(taskEstimatedMinutes(items[1].task), 20);
});

test('today-first backend guarantees three slots with repair, carry, cron, and digest contracts', () => {
  const migration = read('../supabase/migrations/20260827170000_today_first_task_plans.sql');
  const page = read('../src/components/dashboard/TaskTodayWorkspace.tsx');
  const hook = read('../src/hooks/useTaskCalendarEngine.ts');
  const edge = read('../supabase/functions/ensure-daily-task-plan/index.ts');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.daily_task_plans/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.daily_task_plan_items/);
  assert.match(migration, /p_target_count integer DEFAULT 3/);
  assert.match(migration, /WHILE v_count<p_target_count LOOP/);
  assert.match(migration, /carried_forward/);
  assert.match(migration, /get_today_task_plan_v1/);
  assert.match(migration, /process_due_daily_task_plans_v1/);
  assert.match(migration, /JOIN auth\.users auth_user ON auth_user\.id=p\.id/);
  assert.match(migration, /IF EXISTS \(SELECT 1 FROM auth\.users existing_user/);
  assert.match(migration, /\*\/15 \* \* \* \*/);
  assert.match(migration, /dispatch_daily_task_plan_digests_v1/);
  assert.match(migration, /EXTRACT\(hour FROM now\(\) AT TIME ZONE/);
  assert.match(edge, /Rank only the supplied founder task IDs/);
  assert.match(edge, /deterministic-v1/);
  assert.doesNotMatch(hook, /ensureTodayRecommendation/);
  assert.match(migration, /progress_blockers/);
  assert.match(migration, /customer_evidence_events/);
  assert.match(migration, /to_regclass\('public\.progress_blockers'\)/);
  assert.match(migration, /v_progress_blocker IS NOT NULL/);
  assert.match(migration, /averageMinutesToFirstCompletion/);
  assert.match(migration, /user_reordered_at/);
  assert.match(page, /Do this next/);
  assert.match(page, /Today’s plan/);
  assert.match(page, /Upcoming/);
  assert.match(page, /Backlog/);
  assert.match(page, /History/);
  assert.match(page, /Keep going/);
  assert.doesNotMatch(page, />Accept</);
});
