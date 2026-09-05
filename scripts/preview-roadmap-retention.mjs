import { mkdirSync, writeFileSync } from 'node:fs';
import { COPY, SEGMENTS, resolveRetention, buildRoadmapEmail } from '../supabase/functions/_shared/roadmap-retention.ts';

const now = Date.parse('2026-09-04T12:00:00Z');
const ago = days => new Date(now - days * 86400000).toISOString();
const context = segment => ({
  userId: 'preview', quizCompleted: true, quizGoal: 'validate a food delivery idea', industry: 'Food delivery',
  lastLoginAt: ago(segment === 'dormant' ? 38 : 6), lastActivityAt: ago(segment === 'dormant' ? 35 : 3), historyComplete: true,
  tools: segment === 'unfinished_tool' || segment === 'dormant' ? [{ tool: 'icp_builder', status: 'progress', step: 'customer definition', occurredAt: ago(segment === 'dormant' ? 35 : 4) }] : [],
  evidence: { outcomes: segment === 'completed_stage' ? [{ tool: 'icp_builder', status: 'ready', completed_at: ago(5) }] : [], firstCustomerSprintCompletedAt: null, fundraisingReadinessCompletedAt: null, pitchDeckCompletedAt: null, savedInvestorCount: 0 },
});
const titles = { quiz_only: 'Quiz completed, no tool opened', unfinished_tool: 'Unfinished tool', completed_stage: 'Completed stage', dormant: 'Dormant for 30 days or more' };
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const lines = ['# Personalized retention copy', '', 'Generated from the production template catalog by `node scripts/preview-roadmap-retention.mjs`.', '', 'Each segment has four subjects and three bodies. Variants are alternatives for testing, not a twelve message sequence. One primary CTA is followed by preference and unsubscribe links.', '', '## Dynamic fields', '', '| Token | Verified source |', '| --- | --- |', '| `{signal}` | Quiz goal, industry or idea stage; recorded tool step; or completed roadmap stage |', '| `{tool}` | Canonical name of the available next tool |', '| `{topic}` | Next stage label or tool name |', '| `{action}` | Canonical purpose of that tool |', '| `{days}` | Whole days since actual authenticated activity |', '', 'Tool visits do not imply saved work. Saved destinations require an ownership and existence check. When no verified signal or next action exists, no email is sent.', ''];
const previews = ['<!doctype html><html lang="en"><meta charset="utf-8"><title>Retention email previews</title><style>body{font-family:Arial;background:#f1f5f9;margin:32px}article{background:white;padding:24px;margin:24px auto;max-width:680px;border-radius:12px}h1{text-align:center}h2{font-size:18px}</style><h1>All retention variants</h1>'];
for (const segment of SEGMENTS) {
  const decision = resolveRetention(context(segment), now);
  if (!decision) throw new Error(`Preview context failed: ${segment}`);
  lines.push(`## ${titles[segment]}`, '', `Required fields: ${segment === 'quiz_only' ? 'completed quiz, a quiz answer, complete tool history with zero activity' : segment === 'unfinished_tool' ? 'latest unfinished tool activity, status, and timestamp; step and saved destination when verified' : segment === 'completed_stage' ? 'verified stage completion and no activity in the next stage' : 'at least 30 days without activity and verified unfinished tool, roadmap, or quiz context'}.`, '', `Sample signal: ${decision.signal}`, '', `CTA: **${decision.ctaLabel}**`, '', `Destination: \`${decision.path}\` through authenticated login.`, '', '### Subject alternatives', '');
  COPY[segment].subjects.forEach((subject, index) => lines.push(`${index + 1}. ${subject}`));
  lines.push('', '### Body alternatives', '');
  COPY[segment].bodies.forEach((body, index) => lines.push(`**Body ${index + 1}**`, '', body, ''));
  for (let subject = 0; subject < 4; subject++) for (let body = 0; body < 3; body++) {
    const email = buildRoadmapEmail(decision, { subject, body }, { ctaUrl: `https://creatives-takeover.com/login?return=${encodeURIComponent(decision.path)}`, preferencesUrl: 'https://creatives-takeover.com/account#notification-preferences', unsubscribeUrl: 'https://creatives-takeover.com/unsubscribe' });
    previews.push(`<article><h2>${escape(titles[segment])} · Subject ${subject + 1} · Body ${body + 1}</h2><p><strong>Subject:</strong> ${escape(email.subject)}</p>${email.html}</article>`);
  }
}
mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/personalized-retention-copy.md', import.meta.url), lines.join('\n'));
writeFileSync(new URL('../docs/personalized-retention-preview.html', import.meta.url), previews.join('\n') + '</html>');
console.log('Generated 16 subjects, 12 bodies, and 48 rendered previews.');
