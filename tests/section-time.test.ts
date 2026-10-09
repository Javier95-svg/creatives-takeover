import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { createSectionTimer, FLUSH_AFTER_MS, IDLE_AFTER_MS, MAX_TICK_MS, type SectionTimeTarget } from '../src/lib/sectionTime.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

function setup() {
  let clock = 1_000_000;
  const sent: Array<[SectionTimeTarget, number]> = [];
  const timer = createSectionTimer((target, seconds) => sent.push([target, seconds]), () => clock);
  const wait = (ms: number, step = 5_000) => {
    for (let left = ms; left > 0; left -= step) {
      clock += Math.min(step, left);
      timer.tick();
    }
  };
  return { timer, sent, wait, advance: (ms: number) => { clock += ms; } };
}

test('counts active time in a section and sends it on page change', () => {
  const { timer, sent, wait } = setup();
  timer.setEnabled(true);
  timer.setPath('/icp/draft/abc');
  wait(30_000);
  timer.setPath('/rooms');
  assert.deepEqual(sent, [[{ section: 'BizMap', tool: 'ICP Builder' }, 30]]);
});

test('time stops a minute after the last input, and input starts it again', () => {
  const { timer, sent, wait } = setup();
  timer.setEnabled(true);
  timer.setPath('/newspaper');
  wait(5 * 60_000);
  timer.flush();
  assert.deepEqual(sent, [[{ section: 'Content', tool: 'Newspaper' }, IDLE_AFTER_MS / 1000]]);

  timer.input();
  wait(10_000);
  timer.flush();
  assert.equal(sent[1][1], 10);
});

test('a hidden tab adds nothing and hiding sends what is pending', () => {
  const { timer, sent, wait } = setup();
  timer.setEnabled(true);
  timer.setPath('/vc-search');
  wait(20_000);
  timer.setVisible(false);
  assert.deepEqual(sent, [[{ section: 'Insighta', tool: 'VC Search' }, 20]]);
  wait(10 * 60_000);
  timer.setVisible(true);
  timer.input();
  wait(5_000);
  timer.flush();
  assert.equal(sent[1][1], 5);
});

test('without consent nothing is measured, and withdrawing drops what is pending', () => {
  const { timer, sent, wait } = setup();
  timer.setPath('/rooms');
  wait(30_000);
  timer.flush();
  assert.deepEqual(sent, []);

  timer.setEnabled(true);
  timer.input();
  wait(20_000);
  timer.setEnabled(false);
  timer.flush();
  assert.deepEqual(sent, []);
});

test('pages outside the sections are not timed, and long gaps are capped', () => {
  const { timer, sent, wait, advance } = setup();
  timer.setEnabled(true);
  timer.setPath('/pricing');
  wait(30_000);
  timer.flush();
  assert.deepEqual(sent, []);

  timer.setPath('/messages');
  advance(40_000); // a throttled timer: one tick, 40 seconds later
  timer.tick();
  advance(10 * 60_000); // a sleeping laptop
  timer.tick();
  timer.flush();
  // Network, but no sidebar tool: counted for the section only.
  assert.deepEqual(sent, [[{ section: 'Network', tool: '' }, MAX_TICK_MS / 1000]]);
});

test('long sessions are sent about once a minute', () => {
  const { timer, sent, wait } = setup();
  timer.setEnabled(true);
  timer.setPath('/dashboard/tasks');
  for (let i = 0; i < 36; i += 1) { timer.input(); wait(5_000); }
  assert.ok(sent.length >= 2 && sent.length <= 3, `sent ${sent.length} times`);
  assert.ok(sent.every(([, seconds]) => seconds <= FLUSH_AFTER_MS / 1000 + 5));
});

test('the tracker measures only with consent and saves the cookie choice to the account', () => {
  const tracker = read('../src/components/RoadmapRetentionTracking.tsx');
  assert.match(tracker, /sectionTimer\.setEnabled\(hasAnalyticsConsent\(\)\)/);
  assert.match(tracker, /onConsentChange\(\(status\) => \{\s*sectionTimer\.setEnabled\(status === 'granted'\);\s*void syncConsentToAccount\(userId\)/);
  const lib = read('../src/lib/roadmapRetentionTracking.ts');
  const send = lib.slice(lib.indexOf('export async function recordSectionTime'), lib.indexOf('let syncedConsent'));
  assert.ok(send.indexOf('hasAnalyticsConsent()') < send.indexOf("rpc('record_section_time'"));
  // Undecided visitors have nothing to save.
  assert.match(lib, /getAnalyticsConsent\(\) === 'unknown' \? null : getConsentDecision\(\)/);
});
