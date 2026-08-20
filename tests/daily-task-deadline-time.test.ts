import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * public.daily_tasks.deadline_time became NOT NULL with no DEFAULT in
 * 20260308110000_task_deadline_expiry_notifications.sql. Three trigger
 * functions written after that date inserted into daily_tasks without it and
 * raised 23502 at runtime, aborting whatever statement fired the trigger --
 * including complete_onboarding_v1, which hard-blocked onboarding for founders
 * who said they were actively looking for a co-founder.
 *
 * Migration files are immutable history, so this guard checks the *effective*
 * definition of each function: the last one to appear in filename order wins,
 * exactly as it would after a sequential apply. A superseded buggy definition
 * is fine; a surviving one is not.
 */

const MIGRATIONS_DIR = path.join(import.meta.dirname, '..', 'supabase', 'migrations');
const DEADLINE_NOT_NULL_MIGRATION = '20260308110000';

const FUNCTION_MARKER = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.(\w+)\s*\(/gi;
const DAILY_TASKS_INSERT = /INSERT\s+INTO\s+(?:public\.)?daily_tasks\s*\(/i;

function migrationTimestamp(fileName: string) {
  return fileName.slice(0, 14);
}

/**
 * Slice out each function body so a later unrelated statement in the same file
 * cannot be mistaken for part of the function above it.
 */
function extractFunctionBodies(sql: string) {
  const bodies: Array<{ name: string; body: string }> = [];
  const markers = [...sql.matchAll(FUNCTION_MARKER)];

  markers.forEach((marker, index) => {
    const start = marker.index ?? 0;
    const nextMarkerStart = markers[index + 1]?.index ?? sql.length;
    const terminator = sql.indexOf('$$;', start);
    const end = terminator !== -1 && terminator < nextMarkerStart
      ? terminator + 3
      : nextMarkerStart;
    bodies.push({ name: marker[1], body: sql.slice(start, end) });
  });

  return bodies;
}

/** Everything outside a function body -- plain DML run by the migration itself. */
function stripFunctionBodies(sql: string) {
  let remaining = sql;
  for (const { body } of extractFunctionBodies(sql)) {
    remaining = remaining.replace(body, '');
  }
  return remaining;
}

test('every effective daily_tasks insert supplies the NOT NULL deadline_time', async () => {
  const fileNames = (await readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  // Filename order is apply order, so the last write of a name is what runs.
  const effectiveFunctions = new Map<string, { body: string; file: string }>();
  const topLevelOffenders: string[] = [];

  for (const fileName of fileNames) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, fileName), 'utf8');

    for (const { name, body } of extractFunctionBodies(sql)) {
      effectiveFunctions.set(name, { body, file: fileName });
    }

    // Plain inserts execute once, at apply time, so only those written after
    // the constraint landed could ever have failed.
    if (migrationTimestamp(fileName) >= DEADLINE_NOT_NULL_MIGRATION) {
      const topLevel = stripFunctionBodies(sql);
      if (DAILY_TASKS_INSERT.test(topLevel) && !/deadline_time/i.test(topLevel)) {
        topLevelOffenders.push(fileName);
      }
    }
  }

  const functionOffenders = [...effectiveFunctions.entries()]
    .filter(([, { body }]) => DAILY_TASKS_INSERT.test(body) && !/deadline_time/i.test(body))
    .map(([name, { file }]) => `${name} (last defined in ${file})`);

  assert.deepEqual(
    functionOffenders,
    [],
    'These functions insert into daily_tasks without deadline_time, which raises 23502 '
      + 'and aborts the statement that fired the trigger. Add deadline_time, deriving it '
      + "from the row's task_date the way 20260308110000 backfilled it: "
      + "((task_date::text || ' 23:59:00+00')::timestamptz).",
  );

  assert.deepEqual(
    topLevelOffenders,
    [],
    'These migrations insert into daily_tasks without deadline_time at apply time.',
  );
});

test('the guard can still see the functions it is meant to protect', async () => {
  // Without this, a regex that silently stops matching would make the test
  // above pass by checking nothing at all.
  const fileNames = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();

  const inserting = new Set<string>();
  for (const fileName of fileNames) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, fileName), 'utf8');
    for (const { name, body } of extractFunctionBodies(sql)) {
      if (DAILY_TASKS_INSERT.test(body)) inserting.add(name);
    }
  }

  for (const expected of [
    'sync_onboarding_cofounder_task',
    'sync_cofounder_marketplace_dashboard_task_v1',
    'sync_cofounder_interest_dashboard_task_v1',
    'nudge_cofounder_listing_expiry_v1',
  ]) {
    assert.ok(inserting.has(expected), `expected to find a daily_tasks insert in ${expected}`);
  }
});
