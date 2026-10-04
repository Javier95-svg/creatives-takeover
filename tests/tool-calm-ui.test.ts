import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Founders said the core tools looked machine-made. These rules keep the
// rebuilt tool screens calm: one plain title, no glow or gradient, no badge on
// every line, and copy without internal jargon. Files are added here as each
// tool is rebuilt (PMF Lab first, then Traction Engine, then GTM Strategist).
const CALM_FILES = [
  'src/components/tool-shell/ToolPageShell.tsx',
  'src/components/tool-shell/NextStepCard.tsx',
  'src/components/tool-shell/ToolStepper.tsx',
  'src/components/tool-shell/ToolEmptyState.tsx',
  'src/pages/PMFLabPage.tsx',
  'src/components/pmf/PMFConversationsStep.tsx',
  'src/components/pmf/PMFInterviewSheet.tsx',
  'src/components/pmf/PMFSurveyStep.tsx',
  'src/components/pmf/PMFVerdictStep.tsx',
  'src/components/pmf/PMFVerdictSummary.tsx',
  'src/components/pmf/PMFReadinessReport.tsx',
  'src/pages/pmf/PMFSurveyPage.tsx',
];

const VISUAL_RULES: Array<[RegExp, string]> = [
  [/takeover-gradient|bg-gradient-to|radial-gradient/, 'gradient'],
  [/Wallpaper/, 'decorative wallpaper'],
  [/\bSparkles\b/, 'Sparkles icon'],
  [/uppercase tracking-/, 'uppercase eyebrow label'],
  [/blur-3xl|animation: 'spin/, 'glow or spinning backdrop'],
  [/\b(?:text|bg|border)-(?:gray|slate|zinc|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/, 'raw palette colour'],
];

const COPY_RULES: Array<[RegExp, string]> = [
  [/\bcanonical\b/i, 'jargon: canonical'],
  [/\bdeterministic\b/i, 'jargon: deterministic'],
  [/\bprovenance\b/i, 'jargon: provenance'],
  [/\bauditable\b/i, 'jargon: auditable'],
  [/×0\.\d+/, 'signal weight shown to users'],
  [/[—–]/, 'em or en dash'],
];

const withoutComments = (source: string) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^\s*\/\/.*$/gm, '');

test('rebuilt tool screens follow the calm visual rules', () => {
  const problems: string[] = [];
  for (const file of CALM_FILES) {
    const source = withoutComments(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
    for (const [rule, label] of VISUAL_RULES) if (rule.test(source)) problems.push(`${file}: ${label}`);
  }
  assert.deepEqual(problems, []);
});

test('rebuilt tool screens use plain founder language', () => {
  const problems: string[] = [];
  for (const file of CALM_FILES) {
    const source = withoutComments(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
    for (const [rule, label] of COPY_RULES) {
      const match = source.match(rule);
      if (match) problems.push(`${file}: ${label} ("${source.slice(Math.max(0, match.index! - 30), match.index! + 30).replace(/\s+/g, ' ')}")`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the PMF Lab page shows a single next step card', () => {
  const page = readFileSync(new URL('../src/pages/PMFLabPage.tsx', import.meta.url), 'utf8');
  assert.equal(page.match(/<NextStepCard\b/g)?.length, 1);
  assert.doesNotMatch(page, /Score 75 or higher/);
});
