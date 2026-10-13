import assert from 'node:assert/strict';
import test from 'node:test';
import { demoStoryText, isDemoStoryDraft, type DemoStoryDraftV1 } from '../supabase/functions/_shared/demo-story.ts';
import { readStartingExperience, saveStartingExperience } from '../src/lib/startingExperience.ts';

export const story: DemoStoryDraftV1 = {
  kind: 'demo_story', v: 1, description: 'A scheduling tool for independent hairdressers', productName: 'Hairdresser scheduling',
  brief: { audience: 'Independent hairdressers', problem: 'Missed appointments leave gaps',
    product_promise: 'Make appointment scheduling easier', aha_moment: 'The hairdresser can see the next appointment' },
  pitch: 'Keep your appointments organized so you can focus on your clients.',
  steps: ['Problem', 'Product action', 'Outcome'].map(title => ({ title, caption: `${title} for hairdressers`,
    speaker_notes: `Explain ${title.toLowerCase()} to the customer.`, hotspot_label: 'Continue', suggested_action: 'next' })),
};

test('text story contract accepts exactly three usable steps without images or URLs', () => {
  assert.equal(isDemoStoryDraft(story), true);
  assert.equal(isDemoStoryDraft({ ...story, steps: story.steps.slice(0, 2) }), false);
  assert.equal(isDemoStoryDraft({ ...story, steps: [...story.steps, story.steps[0]] }), false);
  assert.equal(isDemoStoryDraft({ ...story, kind: 'interactive_demo' }), false);
  assert.equal(isDemoStoryDraft({ ...story, pitch: ' ' }), false);
  assert.equal(isDemoStoryDraft({ ...story, description: 'x'.repeat(5001) }), false);
  assert.equal(isDemoStoryDraft({ ...story, brief: {} }), false);
  assert.equal(isDemoStoryDraft({ ...story, steps: [null, null, null] }), false);
});

test('copyable story includes the personal pitch, assumptions, and every step script', () => {
  const text = demoStoryText(story);
  assert.ok(text.includes(story.pitch));
  assert.ok(text.includes(story.brief.audience));
  story.steps.forEach(step => assert.ok(text.includes(step.speaker_notes)));
});

test('refresh resumes a submitted description; expired or malformed entries do not run', () => {
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  try {
    const input = { mode: 'product' as const, description: story.description, runId: 1, resumeToken: 'token', savedAt: Date.now() };
    saveStartingExperience(input);
    assert.deepEqual(readStartingExperience(), input);
    saveStartingExperience({ ...input, savedAt: Date.now() - 8 * 86400000 });
    assert.equal(readStartingExperience(), null);
    values.set('ct_starting_experience_v1', '{');
    assert.equal(readStartingExperience(), null);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
    assert.doesNotThrow(() => saveStartingExperience(input));
    assert.equal(readStartingExperience(), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
