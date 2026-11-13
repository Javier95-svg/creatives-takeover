import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { PULSE_GUIDES, asksHowTo, findPulseGuide, guideEvidence } from '../src/lib/pulseGuides.ts';
import { validateHomeActions } from '../src/lib/pulseHome.ts';
import { workspaceCapabilityById } from '../src/lib/workspaceCapabilities.ts';
import { FOUNDER_TOOL_CATALOG } from '../src/config/founderToolCatalog.ts';

// Every .ts/.tsx under src, with JSX entities and curly apostrophes normalised,
// so a guide's quoted label is checked against what the page really renders.
function uiText(dir: string): string {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : [uiText(path)];
    return /\.(ts|tsx)$/.test(name) ? [readFileSync(path, 'utf8')] : [];
  }).join('\n').replace(/&apos;|&#39;|’/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
}
const SOURCE = uiText(fileURLToPath(new URL('../src', import.meta.url)));

test('how-to questions find the guide for their task', () => {
  assert.equal(findPulseGuide('How do I use Demo Studio?')?.id, 'demo-studio');
  assert.equal(findPulseGuide('how do I put my demo on my own website')?.id, 'demo-studio');
  assert.equal(findPulseGuide('How do I book a call with a mentor?')?.id, 'book-mentor');
  assert.equal(findPulseGuide('How do I cancel my subscription?')?.id, 'billing');
  assert.equal(findPulseGuide('where do I buy more credits')?.id, 'billing');
  assert.equal(findPulseGuide('How do I become a mentor on the platform?')?.id, 'become-mentor-provider');
  assert.equal(findPulseGuide('how do I publish a launch page')?.id, 'launch-page');
  assert.equal(findPulseGuide('How can I hire a designer from the marketplace?')?.id, 'marketplace-contact');
});

test('strategy questions that merely mention a tool get no tutorial', () => {
  assert.equal(findPulseGuide('Should I build a demo before talking to customers?'), null);
  assert.equal(findPulseGuide('Is a mentor worth it at my stage?'), null);
  assert.equal(findPulseGuide('What should I focus on this week?'), null);
  assert.equal(asksHowTo('Should I raise a seed round now?'), false);
  assert.equal(asksHowTo('How do I use Demo Studio?'), true);
});

test('every guide card resolves to a real destination', () => {
  for (const guide of PULSE_GUIDES) {
    assert.ok(guide.steps.length >= 3, guide.id);
    for (const step of guide.steps) assert.doesNotMatch(step, /https?:\/\/|\s\/[a-z]/, `${guide.id}: steps name pages in words, not paths`);
    if (!guide.card) continue;
    if (guide.card.kind === 'tool') assert.ok(FOUNDER_TOOL_CATALOG.some(tool => tool.key === guide.card!.id) || workspaceCapabilityById(guide.card.id), guide.id);
    else assert.equal(validateHomeActions([{ kind: 'browse', id: guide.card.id, title: guide.card.title, reason: guide.card.reason, route: '/x' }]).length, 1, guide.id);
  }
});

test('every button or page name a guide quotes still exists in the UI', () => {
  // A renamed button makes this fail, so a guide cannot drift from the product silently.
  for (const guide of PULSE_GUIDES) {
    for (const step of guide.steps) {
      for (const [, label] of step.matchAll(/"([^"]+)"/g)) {
        assert.ok(SOURCE.includes(label), `${guide.id}: the UI no longer has "${label}"`);
      }
    }
  }
});

test('more how-to questions find their guide', () => {
  assert.equal(findPulseGuide('How do I validate my idea in PMF Lab?')?.id, 'pmf-lab');
  assert.equal(findPulseGuide('Where do I change my password?')?.id, 'settings');
  assert.equal(findPulseGuide('What does my program see about my work?')?.id, 'cohort');
  assert.equal(findPulseGuide('How do I enter my launch in Launchpad?')?.id, 'launchpad');
  assert.equal(findPulseGuide('How do I set up my Founder ID?')?.id, 'founder-id');
  assert.equal(findPulseGuide('How do I add a second project?')?.id, 'project-setup');
  assert.equal(findPulseGuide('How do I publish my app from MVP Builder?')?.id, 'mvp-builder');
});

test('the contact and pricing cards are allowed destinations and evidence carries only the steps', () => {
  const [contact, pricing] = validateHomeActions([
    { kind: 'browse', id: 'contact', title: 'Contact the team', reason: 'r', route: '/anything' },
    { kind: 'browse', id: 'pricing', title: 'See plans', reason: 'r', route: '/anything' },
  ]);
  assert.equal(contact.route, '/contact');
  assert.equal(pricing.route, '/pricing');
  assert.deepEqual(Object.keys(guideEvidence(PULSE_GUIDES[0])), ['id', 'title', 'steps']);
});
