import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('accountability dashboard loads without PostgREST relationship metadata', () => {
  const hook = read('../src/hooks/useAccountabilityPartners.ts');

  assert.match(hook, /\.from\('accountability_partnerships'\)[\s\S]*?\.select\('\*'\)/);
  assert.match(hook, /\.from\('public_profiles'\)/);
  assert.match(hook, /Promise\.all/);
  assert.match(hook, /partner_profile: profilesById\.get/);
  assert.match(hook, /requester_profile: profilesById\.get/);
  assert.doesNotMatch(hook, /profiles!partner_id|profiles!requester_id|sprint:sprints/);
});

test('accountability nudges use public-profile enrichment instead of an embedded join', () => {
  const hook = read('../src/hooks/useAccountabilityPartners.ts');

  assert.match(hook, /\.from\('accountability_nudges'\)[\s\S]*?\.select\('\*'\)/);
  assert.match(hook, /nudger_profile: profilesById\.get/);
  assert.doesNotMatch(hook, /profiles!nudger_id/);
});

test('partner matching excludes existing partners without SQL-like PostgREST filters', () => {
  const modal = read('../src/components/social/PartnerMatchingModal.tsx');

  assert.match(modal, /\.from\('accountability_partnerships'\)/);
  assert.match(modal, /existingPartnerIds/);
  assert.match(modal, /existingPartnerIds\.join\(','\)/);
  assert.doesNotMatch(modal, /\(SELECT partner_id FROM accountability_partnerships|\(SELECT requester_id FROM accountability_partnerships/);
});
