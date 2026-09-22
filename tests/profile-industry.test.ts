import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANGEL_SECTOR_OPTIONS } from '../src/data/angelSectors.ts';

const profile = readFileSync('src/pages/Profile.tsx', 'utf8');
const editProfile = readFileSync('src/components/profile/EditProfileModal.tsx', 'utf8');
const investorDirectory = readFileSync('src/pages/community/FindYourAngel.tsx', 'utf8');

test('the profile summary replaces Posts with the primary industry', () => {
  const stats = profile.slice(profile.indexOf('{/* Quick Stats Bar */}'), profile.indexOf('{roleDetails.length'));
  assert.match(stats, />Industry</);
  assert.match(stats, /primaryIndustry/);
  assert.doesNotMatch(stats, />Posts</);
  assert.doesNotMatch(stats, /pictureCount/);
});

test('the shared startup taxonomy covers common entrepreneurship categories', () => {
  const required = [
    'AI & Machine Learning',
    'Developer Tools',
    'E-Commerce & Marketplace',
    'FinTech',
    'FoodTech & AgTech',
    'HealthTech',
    'Logistics & Supply Chain',
    'Manufacturing & Industry 4.0',
    'Media & Creator Economy',
    'PropTech & Real Estate',
    'SaaS',
    'Travel & Hospitality',
  ];
  for (const sector of required) assert.ok(ANGEL_SECTOR_OPTIONS.includes(sector), sector);
  assert.ok(ANGEL_SECTOR_OPTIONS.length >= 30);
  assert.equal(new Set(ANGEL_SECTOR_OPTIONS).size, ANGEL_SECTOR_OPTIONS.length);
});

test('investor filtering and profile editing use the same sector taxonomy', () => {
  assert.match(investorDirectory, /ANGEL_SECTOR_OPTIONS\.map/);
  assert.match(editProfile, /ANGEL_SECTOR_OPTIONS/);
  assert.match(editProfile, /toggleIndustry/);
  assert.match(editProfile, /first selection appears in the profile banner/);
});

test('legacy categories remain editable instead of being silently discarded', () => {
  assert.match(editProfile, /new Set\(\[\.\.\.ANGEL_SECTOR_OPTIONS, \.\.\.formData\.startup_industry\]\)/);
  assert.ok(ANGEL_SECTOR_OPTIONS.includes('Mobility & Logistics'));
});
