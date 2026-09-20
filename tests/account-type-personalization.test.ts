import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { USER_TYPES, USER_TYPE_LABEL, hasCategoryAccess, isUserType, type UserType } from '../src/lib/accountTypes.ts';
import {
  ROLE_PROFILE_SCHEMA, PROJECT_NAME_FIELD, describeRoleProfile,
  missingRoleFields, sanitizeRoleProfile, storedRoleFields, usesProjectName,
} from '../src/lib/roleProfileSchema.ts';
import { personaChips, personaFocus, personaHome } from '../src/lib/personaHome.ts';
import { navSectionsForType, navSliceForType, navToolsForType } from '../src/lib/workspaceNavForType.ts';
import { notificationChannelsForType, allNotificationChannelKeys } from '../src/lib/notificationChannels.ts';

const ALL_SECTIONS = ['Dashboard', 'BizMap', 'Network', 'Insighta', 'Content', 'Resources', 'Pricing'];
const ALL_TOOLS: Record<string, readonly string[]> = {
  Dashboard: ['Overview', 'Tasks'],
  BizMap: ['ICP Builder'],
  Network: ['Find a Mentor'],
  Insighta: ['VC Search'],
  Content: ['Newspaper'],
  Resources: ['Accelerator Hunt'],
};

// ------------------------------------------------------------ extensibility
// A sixth type must not be addable half way: if it reaches one of these maps
// and not the others it renders a blank home or an empty sidebar.
test('every account type has a schema, a persona answer, a nav answer and channels', () => {
  assert.equal(USER_TYPES.length, 5);
  for (const type of USER_TYPES) {
    assert.ok(ROLE_PROFILE_SCHEMA[type], `${type} has no role profile schema`);
    assert.ok(USER_TYPE_LABEL[type], `${type} has no label`);
    // personaHome answers null for founders and builders, which is the "render
    // today's home" signal rather than a missing entry.
    assert.doesNotThrow(() => personaHome(type));
    assert.ok(navSectionsForType(type, ALL_SECTIONS).length > 0, `${type} has an empty sidebar`);
    assert.ok(notificationChannelsForType(type).length > 0, `${type} is offered no channels`);
  }
});

test('isUserType rejects anything that is not one of the five', () => {
  assert.equal(isUserType('founder'), true);
  assert.equal(isUserType('mentor'), true);
  assert.equal(isUserType('admin'), false);
  assert.equal(isUserType(''), false);
  assert.equal(isUserType(null), false);
  assert.equal(isUserType(7), false);
});

// ------------------------------------------------------- acceptance: fields
test('only founders and builders are asked for a project name', () => {
  for (const type of USER_TYPES) {
    const hasProjectName = ROLE_PROFILE_SCHEMA[type].some((field) => field.key === PROJECT_NAME_FIELD);
    const expected = type === 'founder' || type === 'builder';
    assert.equal(hasProjectName, expected, `${type} project name expectation`);
    assert.equal(usesProjectName(type), expected);
  }
});

test('the project name is never stored in role_profile', () => {
  for (const type of USER_TYPES) {
    assert.ok(!storedRoleFields(type).some((field) => field.key === PROJECT_NAME_FIELD));
  }
  // Founders and builders therefore have nothing to store at all.
  assert.deepEqual(storedRoleFields('founder'), []);
  assert.deepEqual(storedRoleFields('builder'), []);
});

test('sanitize keeps only the keys this type was asked for', () => {
  // A mentor's answers must not survive on an investor, whatever is posted.
  const clean = sanitizeRoleProfile('investor', {
    sectors: ['Fintech', '  Health  ', ''],
    stages: ['Seed', 'Series Z'],
    expertise: ['Pricing'],
    projectName: 'Should not be here',
  });
  assert.deepEqual(clean, { sectors: ['Fintech', 'Health'], stages: ['Seed'] });
});

test('sanitize rejects wrong shapes and caps sizes', () => {
  assert.deepEqual(sanitizeRoleProfile('mentor', { expertise: 'not an array', yearsActive: 'ten' }), {});
  assert.deepEqual(sanitizeRoleProfile('mentor', { yearsActive: 12.6 }), { yearsActive: 13 });
  assert.deepEqual(sanitizeRoleProfile('mentor', { yearsActive: 500 }), {});
  assert.deepEqual(sanitizeRoleProfile('marketplace', { category: 'not_a_category' }), {});
  assert.deepEqual(sanitizeRoleProfile('marketplace', { category: 'sales' }), { category: 'sales' });
  const many = sanitizeRoleProfile('mentor', { expertise: Array.from({ length: 50 }, (_, index) => `tag${index}`) });
  assert.equal((many.expertise as string[]).length, 20);
});

test('missing fields is empty once the required answers are there', () => {
  assert.equal(missingRoleFields('founder', {}).length, 0);
  assert.equal(missingRoleFields('mentor', {}).length, 1);
  assert.equal(missingRoleFields('mentor', { expertise: [] }).length, 1);
  assert.equal(missingRoleFields('mentor', { expertise: ['Pricing'] }).length, 0);
  assert.equal(missingRoleFields('investor', { sectors: ['Fintech'] }).length, 1);
  assert.equal(missingRoleFields('investor', { sectors: ['Fintech'], stages: ['Seed'] }).length, 0);
});

test('describe renders only filled fields', () => {
  assert.deepEqual(describeRoleProfile('founder', { projectName: 'Throughline' }), []);
  const described = describeRoleProfile('mentor', { expertise: ['Pricing', 'Hiring'], yearsActive: 0 });
  assert.deepEqual(described.map((item) => item.key), ['expertise', 'yearsActive']);
  assert.equal(described[0].display, 'Pricing, Hiring');
});

// -------------------------------------------------- acceptance: no crossover
test('no type is offered another type notification channels', () => {
  const mentorOnly = notificationChannelsForType('mentor').map((channel) => channel.key);
  const founderOnly = notificationChannelsForType('founder').map((channel) => channel.key);
  const investorOnly = notificationChannelsForType('investor').map((channel) => channel.key);
  assert.ok(mentorOnly.includes('discovery_call_request_in_app_enabled'));
  assert.ok(!founderOnly.includes('discovery_call_request_in_app_enabled'));
  assert.ok(!founderOnly.includes('investor_match_in_app_enabled'));
  assert.ok(investorOnly.includes('investor_match_in_app_enabled'));
  assert.ok(!investorOnly.includes('listing_enquiry_in_app_enabled'));
  // Every key the card writes is a real column in the migration.
  const migration = fs.readFileSync('supabase/migrations/20260920140000_per_type_features.sql', 'utf8');
  for (const key of ['discovery_call_request_in_app_enabled', 'listing_enquiry_email_enabled', 'investor_match_in_app_enabled']) {
    assert.ok(migration.includes(key), `${key} is not in the migration`);
  }
  assert.ok(allNotificationChannelKeys().includes('investor_updates'));
});

// ----------------------------------------------------------- persona home
test('founders and builders keep the home they already have', () => {
  assert.equal(personaHome('founder'), null);
  assert.equal(personaHome('builder'), null);
  for (const type of ['mentor', 'marketplace', 'investor'] as UserType[]) {
    const persona = personaHome(type);
    assert.ok(persona, `${type} has no persona`);
    assert.equal(persona!.headline.length, 2);
    assert.ok(persona!.shortcuts.length > 0);
    assert.ok(persona!.emptyFocus.length > 0);
  }
});

test('a zero count is dropped rather than shown as nothing to do', () => {
  const mentor = personaHome('mentor')!;
  assert.deepEqual(personaChips(mentor, { pendingRequests: 0 }), []);
  assert.deepEqual(personaChips(mentor, { pendingRequests: 3 }).map((chip) => chip.count), [3]);
  const focus = personaFocus(mentor, { pendingRequests: 2, unreadMessages: 0, newSaves: 0 });
  assert.deepEqual(focus.map((item) => item.id), ['mentor-requests']);
  assert.ok(focus[0].title.startsWith('2 '));
});

test('an account awaiting review is offered no category work', () => {
  const mentor = personaHome('mentor')!;
  assert.deepEqual(personaFocus(mentor, { pendingRequests: 5 }, true), []);
  assert.equal(hasCategoryAccess('mentor', 'pending'), false);
  assert.equal(hasCategoryAccess('mentor', 'approved'), true);
  assert.equal(hasCategoryAccess('founder', 'pending'), true);
});

test('a standing suggestion with no count survives', () => {
  const marketplace = personaHome('marketplace')!;
  const focus = personaFocus(marketplace, {});
  assert.deepEqual(focus.map((item) => item.id), ['provider-listing']);
});

// ------------------------------------------------------------------ sidebar
test('founders and builders see the whole nav, unchanged', () => {
  for (const type of ['founder', 'builder'] as UserType[]) {
    assert.equal(navSliceForType(type), null);
    assert.deepEqual(navSectionsForType(type, ALL_SECTIONS), ALL_SECTIONS);
    assert.deepEqual(navToolsForType(type, 'BizMap', ALL_TOOLS), ALL_TOOLS.BizMap);
  }
});

test('the other three get a slice, in the product own order', () => {
  const mentor = navSectionsForType('mentor', ALL_SECTIONS);
  assert.deepEqual(mentor, ['Dashboard', 'Network', 'Content', 'Resources', 'Pricing']);
  assert.ok(!mentor.includes('BizMap'));
  assert.ok(!mentor.includes('Insighta'));
  assert.deepEqual(navToolsForType('mentor', 'Dashboard', ALL_TOOLS), ['Overview', 'My Bookings', 'Analytics', 'Messages']);
  assert.equal(navToolsForType('mentor', 'BizMap', ALL_TOOLS), undefined);
  assert.deepEqual(navToolsForType('investor', 'Dashboard', ALL_TOOLS), ['Overview', 'Matches', 'Messages']);
  assert.deepEqual(navToolsForType('marketplace', 'Dashboard', ALL_TOOLS), ['Overview', 'Enquiries', 'Analytics', 'Messages']);
});

test('every tool a slice names has a route', () => {
  // WORKSPACE_ROUTES is the explicit map plus every entry in the tool catalog,
  // so both sources count as "has a route".
  const source = fs.readFileSync('src/lib/workspaceNavigation.ts', 'utf8')
    + fs.readFileSync('src/config/founderToolCatalog.ts', 'utf8');
  for (const type of ['mentor', 'marketplace', 'investor'] as UserType[]) {
    const slice = navSliceForType(type)!;
    for (const tools of Object.values(slice.tools)) {
      for (const tool of tools) {
        assert.ok(source.includes(`'${tool}'`) || source.includes(`${tool}:`), `${tool} has no route`);
      }
    }
  }
});

// --------------------------------------------------------------- SQL pins
test('every per type function is definer with a pinned search path', () => {
  for (const file of ['20260920140000_per_type_features.sql', '20260920160000_per_type_notifications.sql']) {
    const sql = fs.readFileSync(`supabase/migrations/${file}`, 'utf8');
    const functions = sql.split(/CREATE OR REPLACE FUNCTION/).slice(1);
    assert.ok(functions.length > 0, `${file} defines no functions`);
    for (const body of functions) {
      const header = body.slice(0, body.indexOf('$function$') >= 0 ? body.indexOf('$function$') : 400);
      assert.ok(/SECURITY DEFINER/.test(header), `a function in ${file} is not SECURITY DEFINER`);
      assert.ok(/SET search_path = public/.test(header), `a function in ${file} does not pin search_path`);
    }
  }
});

test('entity_views is owner scoped and deduplicated per day', () => {
  const sql = fs.readFileSync('supabase/migrations/20260920140000_per_type_features.sql', 'utf8');
  assert.ok(sql.includes('owner_user_id = auth.uid()'), 'entity_views is not scoped to the owner');
  assert.ok(/UNIQUE INDEX[\s\S]*viewed_on/.test(sql), 'there is no per day unique index');
  assert.ok(sql.includes('v_owner = v_viewer'), 'the owner own views are not excluded');
});

test('investor matches never returns an email address', () => {
  const sql = fs.readFileSync('supabase/migrations/20260920140000_per_type_features.sql', 'utf8');
  const start = sql.indexOf('FUNCTION public.investor_matches');
  const body = sql.slice(start, sql.indexOf('$function$;', start));
  assert.ok(!/\bemail\b/.test(body), 'investor_matches mentions email');
  assert.ok(body.includes("f.user_type IN ('founder', 'builder')"), 'investor_matches is not limited to founders and builders');
  assert.ok(body.includes("f.approval_status = 'approved'"), 'investor_matches includes unapproved accounts');
});
