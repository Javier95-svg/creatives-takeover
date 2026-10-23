import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  buildFounderIdUpdate,
  buildProjectRecord,
  emptyImportedProject,
  founderIdChanges,
  normalizeImportedProject,
  normalizeImportedSources,
  safeNextPath,
} from '../src/lib/projectImport.ts';
import { checkPublicUrl, htmlToText, isPrivateAddress } from '../supabase/functions/_shared/public-url-guard.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the URL guard only allows public http(s) websites', () => {
  for (const ok of ['acme.com', 'https://acme.com/about', 'http://www.acme.co.uk', 'https://acme.com:443/x']) {
    assert.equal(checkPublicUrl(ok).ok, true, ok);
  }
  for (const blocked of [
    '', 'ftp://acme.com', 'file:///etc/passwd', 'javascript:alert(1)',
    'http://localhost:3000', 'http://intranet', 'http://printer.local', 'http://db.internal',
    'http://127.0.0.1', 'http://169.254.169.254/latest/meta-data', 'http://10.0.0.5', 'http://[::1]/',
    'http://0x7f000001', 'http://2130706433', 'https://user:pass@acme.com', 'https://acme.com:8080',
  ]) {
    assert.equal(checkPublicUrl(blocked).ok, false, blocked);
  }
  assert.equal(checkPublicUrl('acme.com').ok && checkPublicUrl('acme.com').url.protocol, 'https:', 'bare names default to https');
});

test('resolved addresses on private networks are refused', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '104.16.0.1', '2606:4700::1111']) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test('html is reduced to its visible text', () => {
  const page = htmlToText('<html><head><title>Acme &amp; Co</title><meta name="description" content="Invoices that chase themselves"><style>p{}</style></head><body><script>steal()</script><h1>Get paid</h1><p>On time.</p></body></html>');
  assert.equal(page.title, 'Acme & Co');
  assert.equal(page.description, 'Invoices that chase themselves');
  assert.match(page.text, /Get paid/);
  assert.doesNotMatch(page.text, /steal|p\{\}/);
});

test('drafted fields are cleaned: caps, known options, real links, known industries', () => {
  const project = normalizeImportedProject({
    name: '  Ledgerly  ',
    pitch: 'x'.repeat(400),
    stage: 'unicorn',
    businessModel: 'b2b_saas',
    industry: ['fintech', 'Made Up', 'SaaS', 'FinTech'],
    website: 'ledgerly.io',
    demo: 'javascript:alert(1)',
    team: 42,
  }, ['FinTech', 'SaaS', 'EdTech']);
  assert.equal(project.name, 'Ledgerly');
  assert.equal(project.pitch.length, 160);
  assert.equal(project.stage, '');
  assert.equal(project.businessModel, 'b2b_saas');
  assert.deepEqual(project.industry, ['FinTech', 'SaaS']);
  assert.equal(project.website, 'https://ledgerly.io/');
  assert.equal(project.demo, '');
  assert.equal(project.team, '');
});

test('sources are only kept for fields that were filled', () => {
  const project = { ...emptyImportedProject(), name: 'Ledgerly', industry: ['SaaS'] };
  assert.deepEqual(normalizeImportedSources({ name: 'deck.pdf', pitch: 'website', industry: 'website', bogus: 'x' }, project), { name: 'deck.pdf', industry: 'website' });
});

test('the Founder ID is only written when the box is ticked, and never blanked', () => {
  const project = { ...emptyImportedProject(), name: 'Ledgerly', pitch: 'Invoices that chase themselves', stage: 'mvp' as const, website: 'https://ledgerly.io/', traction: '40 paying teams' };
  assert.equal(buildFounderIdUpdate(project, false, {}), null);

  const update = buildFounderIdUpdate(project, true, { demo: 'https://loom.com/x', loom: 'https://loom.com/y' });
  assert.deepEqual(update, {
    startup_name: 'Ledgerly',
    startup_tagline: 'Invoices that chase themselves',
    startup_stage: 'mvp',
    startup_links: { demo: 'https://loom.com/x', loom: 'https://loom.com/y', website: 'https://ledgerly.io/' },
  });
  assert.equal('startup_description' in update!, false, 'an empty field leaves the profile as it is');
  assert.equal(JSON.stringify(update).includes('40 paying teams'), false, 'traction stays private');

  assert.deepEqual(founderIdChanges(project), ['Project name', 'One-line pitch', 'Stage', 'Website']);
});

test('the project keeps its other context and stores the import with its sources', () => {
  const project = { ...emptyImportedProject(), name: 'Ledgerly', description: 'Chases invoices' };
  const record = buildProjectRecord(project, { name: 'deck.pdf' }, { pulse: { memory: 1 } }, '2026-10-22T00:00:00.000Z');
  assert.equal(record.title, 'Ledgerly');
  assert.equal(record.idea_summary, 'Chases invoices');
  assert.deepEqual(record.context.pulse, { memory: 1 });
  assert.deepEqual((record.context.import as { sources: unknown }).sources, { name: 'deck.pdf' });
});

test('?next= only accepts same-site paths', () => {
  assert.equal(safeNextPath('/icp-builder?activation=1'), '/icp-builder?activation=1');
  assert.equal(safeNextPath('https://evil.example'), '/dashboard');
  assert.equal(safeNextPath('//evil.example'), '/dashboard');
  assert.equal(safeNextPath(null), '/dashboard');
});

test('founders reach Project setup after onboarding and from the workspace', () => {
  const onboarding = read('../src/pages/Onboarding.tsx');
  assert.match(onboarding, /details\?\.userType === 'founder' && !explicitReturn/);
  assert.match(onboarding, /\/project-setup\?next=/);
  assert.match(read('../src/components/AdaptiveOnboardingForm.tsx'), /\{ userType: answers\.founderSegment \}/);
  assert.match(read('../src/App.tsx'), /path="\/project-setup"/);
  assert.match(read('../src/components/pulse/PulseHomeLive.tsx'), /userType === 'founder' && <ProjectSetupCard/);
  const fn = read('../supabase/functions/project-import-extract/index.ts');
  assert.match(fn, /\.eq\("user_id", user\.id\)/, 'only the caller\'s own files are read');
  assert.match(fn, /redirect: "manual"/, 'redirects are re-checked by the guard');
});
