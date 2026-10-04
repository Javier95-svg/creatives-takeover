import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Founders said the core tools looked machine-made. These rules keep the
// rebuilt tool screens calm: one plain title, no glow or gradient, no badge on
// every line, and copy without internal jargon. Each tool still has its own
// identity: a colour token and a static wallpaper that depicts what it does.
// Files are added here as each tool is rebuilt (PMF Lab first, then Traction
// Engine, then GTM Strategist).
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
  // Tool wallpapers are allowed, but they are held to the same no-glow rules.
  'src/components/wallpapers/PMFLabWallpaper.tsx',
];

const VISUAL_RULES: Array<[RegExp, string]> = [
  [/takeover-gradient|bg-gradient-to|radial-gradient/, 'gradient'],
  // The old glowing backdrops; each tool now gets a quiet wallpaper of its own.
  [/GTMStrategistWallpaper|TractionEngineWallpaper/, 'legacy glow wallpaper'],
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

test('the PMF Lab page shows a single next step card in its own colour', () => {
  const page = readFileSync(new URL('../src/pages/PMFLabPage.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(page, /theme="pmf"/);
  assert.match(page, /wallpaper=\{<PMFLabWallpaper \/>\}/);
  assert.match(css, /\.tool-theme-pmf \{[\s\S]*--primary: var\(--tool-pmf\)/);
  assert.equal(page.match(/<NextStepCard\b/g)?.length, 1);
  assert.doesNotMatch(page, /Score 75 or higher/);
});
