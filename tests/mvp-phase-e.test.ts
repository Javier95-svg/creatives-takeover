import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { isBotSubmission, toLeadRow } from '../supabase/functions/_shared/mvp-lead.ts';
import { buildLeadScript } from '../api/_mvpLeadScript.ts';
import { hasLeadForm, runPublishCheck } from '../src/lib/mvp-builder/publishCheck.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('a form submission becomes a lead with email, name and message found by common names', () => {
  const lead = toLeadRow({ Email: ' Fran@FleetCo.com ', full_name: 'Fran', notes: 'Need it for 12 trucks', trucks: 12, _hp: '' });
  assert.deepEqual(lead, {
    email: 'fran@fleetco.com',
    name: 'Fran',
    message: 'Need it for 12 trucks',
    fields: { email: 'Fran@FleetCo.com', full_name: 'Fran', notes: 'Need it for 12 trucks', trucks: '12' },
  });
  // An email in an oddly named field is still found; a bad one is not kept as the email.
  assert.equal(toLeadRow({ contact: 'a@b.co' })?.email, 'a@b.co');
  assert.equal(toLeadRow({ email: 'not-an-email' })?.email, null);
  assert.equal(toLeadRow({}), null);
  assert.equal(toLeadRow(['x']), null);
  assert.equal(isBotSubmission({ _hp: 'spam' }), true);
  assert.equal(isBotSubmission({ email: 'a@b.co', _hp: '' }), false);
});

test('the published-app script saves marked forms and shows the success text', () => {
  const script = buildLeadScript('https://example.supabase.co/functions/v1/mvp-app-lead');
  assert.match(script, /^<script>.*<\/script>$/s);
  assert.match(script, /form\[data-ct-lead\]/);
  assert.match(script, /data-ct-success/);
  assert.match(script, /window\.ctLead=send/);
  assert.match(script, /"https:\/\/example\.supabase\.co\/functions\/v1\/mvp-app-lead"/);
  assert.doesNotMatch(script, /\n/);
  assert.match(read('api/published-site.ts'), /const snippets = ANALYTICS_SNIPPET \+ LEAD_SNIPPET;/);
});

test('generated apps are told to mark their forms', () => {
  const generate = read('supabase/functions/mvp-builder-generate/index.ts');
  assert.match(generate, /put data-ct-lead on the <form>/);
  assert.match(generate, /window\.ctLead\?\.\(\{ email, name, \.\.\. \}\)/);
  assert.doesNotMatch(generate, /NO REAL BACKEND IN THIS PHASE/);
});

test('the lead function only stores for published apps and supports a dry run', () => {
  const fn = read('supabase/functions/mvp-app-lead/index.ts');
  assert.match(fn, /if \(body\?\.check === true\) return json\(\{ ok: true, check: true, saved: false/);
  assert.match(fn, /if \(!project\.subdomain_slug && !project\.deployment_url\) return json\(\{ ok: false, error: "This app is not published\." \}, 404\)/);
  assert.match(fn, /p_key: `mvp_app_lead:\$\{clientIp\(req\)\}`/);
  assert.match(read('supabase/config.toml'), /\[functions\.mvp-app-lead\]\r?\nverify_jwt = false/);
  const sql = read('supabase/migrations/20261005130000_mvp_app_leads.sql');
  assert.match(sql, /CREATE POLICY mvp_app_leads_owner_read ON public\.mvp_app_leads\s+FOR SELECT TO authenticated USING \(user_id = auth\.uid\(\)\)/);
  assert.match(sql, /REVOKE ALL ON public\.mvp_app_leads FROM anon/);
});

test('publishing checks the app first; only a runtime error blocks', () => {
  const files = [{ path: 'index.html', content: '<html><head><title>FleetReceipts</title></head><body><a href="#pricing">x</a><form data-ct-lead><input name="email"></form></body></html>' }];
  const ok = runPublishCheck({ files, runtimeError: null, previewErrors: [], framework: 'static-html' });
  assert.equal(ok.blocked, false);
  assert.deepEqual(ok.items.map((item) => item.ok), [true, true, true, true]);
  const broken = runPublishCheck({ files, runtimeError: 'ReferenceError: x is not defined', previewErrors: [], framework: 'static-html' });
  assert.equal(broken.blocked, true);
  assert.equal(broken.items[0].hint, 'ReferenceError: x is not defined');
  // A page without a form or link is allowed but says so.
  const bare = runPublishCheck({ files: [{ path: 'index.html', content: '<html><body><h1>Hi</h1></body></html>' }], runtimeError: null, previewErrors: [], framework: 'static-html' });
  assert.equal(bare.blocked, false);
  assert.equal(bare.items.find((item) => item.id === 'form')?.ok, false);
  assert.equal(hasLeadForm([{ path: 'src/App.tsx', content: 'await window.ctLead?.({ email })' }]), true);
  // Static preview errors do not apply to Vite apps.
  assert.equal(runPublishCheck({ files, runtimeError: null, previewErrors: ['No HTML entry'], framework: 'react-vite' }).blocked, false);
  const preview = read('src/components/mvp-builder/MVPBuilderPreview.tsx');
  assert.match(preview, /onClick=\{\(\) => setPublishCheckOpen\(true\)\}/);
  assert.match(preview, /<MVPBuilderLeadsPanel projectId=\{projectId\}/);
});
