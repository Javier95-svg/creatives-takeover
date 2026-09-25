import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { USER_TYPES, USER_TYPE_LABEL, hasCategoryAccess, isUserType, type UserType } from '../src/lib/accountTypes.ts';
import {
  ROLE_PROFILE_SCHEMA, PROJECT_NAME_FIELD, describeRoleProfile,
  missingRoleFields, sanitizeRoleProfile, storedRoleFields, usesProjectName,
} from '../src/lib/roleProfileSchema.ts';
import { personaChips, personaFocus, personaHome, personaInterestSummary } from '../src/lib/personaHome.ts';
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
    sectors: ['FinTech', 'HealthTech', 'made up'],
    stages: ['Seed', 'Series Z'],
    expertise: ['Pricing'],
    projectName: 'Should not be here',
  });
  assert.deepEqual(clean, { sectors: ['FinTech', 'HealthTech'], stages: ['Seed'] });
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

test('missing fields validates complete, actionable role applications', () => {
  assert.equal(missingRoleFields('founder', {}).length, 0);
  assert.equal(missingRoleFields('mentor', {}).length, 4);
  assert.equal(missingRoleFields('mentor', { expertise: ['Pricing'] }).length, 3);
  assert.equal(missingRoleFields('mentor', { expertise: ['Pricing'], stages: ['Validation'], experience: 'Relevant results', engagement: 'both' }).length, 0);
  assert.equal(missingRoleFields('investor', { sectors: ['FinTech'], stages: ['Seed'], geography: 'Global', activity: 'actively_investing' }).length, 0);
  assert.equal(missingRoleFields('marketplace', { services: ['Design'], category: 'invalid', idealCustomer: 'Founders', portfolio: 'Example', capacity: 'available' }).length, 1);
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

test('reviewed home shows the stated interest without changing account type', () => {
  assert.equal(personaInterestSummary('mentor', { expertise: ['Pricing', 'Hiring'] }), 'Pricing, Hiring');
  assert.equal(personaInterestSummary('investor', { sectors: ['FinTech'] }), 'FinTech');
  assert.equal(personaInterestSummary('founder', { sectors: ['FinTech'] }), null);
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

// ------------------------------------------------- the four closed gaps
// Each of these pins a gap that was open after the first pass, so a later
// change cannot quietly reopen one.

test('the quiz asks a reviewed type for its fields before filing the request', () => {
  const quiz = fs.readFileSync('src/components/AdaptiveOnboardingForm.tsx', 'utf8');
  // Two stages, and the application is only submitted from the second.
  assert.match(quiz, /reviewStage/);
  assert.match(quiz, /setReviewStage\('details'\)/);
  assert.match(quiz, /missingRoleFields\(answers\.founderSegment, roleDraft\)/);
  assert.match(quiz, /roleProfile: sanitizeRoleProfile\(answers\.founderSegment, roleDraft\)/);
  // The submit is downstream of the missing-field guard, not before it.
  assert.ok(
    quiz.indexOf('missingRoleFields(answers.founderSegment, roleDraft)') < quiz.indexOf('await submitAccountApplication'),
    'the request is filed before the required fields are checked',
  );
});

test('a reviewed type is never asked for a startup brief or a project name', () => {
  const quiz = fs.readFileSync('src/components/AdaptiveOnboardingForm.tsx', 'utf8');
  const stepZero = quiz.slice(quiz.indexOf('const validateStepAt'), quiz.indexOf("if (step === 1"));
  // The reviewed early return has to come before the brief and project checks,
  // or a mentor cannot get past step 0 without inventing a startup.
  const reviewedGuard = stepZero.indexOf('isReviewedType(answers.founderSegment)');
  const briefCheck = stepZero.indexOf('answers.startupBrief.trim().length');
  const projectCheck = stepZero.indexOf('answers.projectName.trim()');
  assert.ok(reviewedGuard >= 0, 'step 0 does not branch on the reviewed types');
  assert.ok(reviewedGuard < briefCheck, 'the startup brief is demanded before the reviewed branch');
  assert.ok(reviewedGuard < projectCheck, 'a project name is demanded before the reviewed branch');
});

test('the sidebar reads copy through the per type resolvers', () => {
  const sidebar = fs.readFileSync('src/components/workspace/WorkspaceSidebar.tsx', 'utf8');
  assert.match(sidebar, /sectionSloganFor\(userType, label\)/);
  assert.match(sidebar, /routeDescriptionFor\(userType, tool\)/);
  // The founder-voiced constants must not be read directly any more, or the
  // override would be silently bypassed.
  assert.ok(!sidebar.includes('WORKSPACE_SECTION_SLOGANS['), 'the sidebar still reads founder slogans directly');
  assert.ok(!sidebar.includes('WORKSPACE_ROUTE_DESCRIPTIONS['), 'the sidebar still reads founder descriptions directly');
});

test('the dashboard Overview branches by account type', () => {
  const dashboard = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
  assert.match(dashboard, /AccountOverview/);
  assert.match(dashboard, /FounderDashboard/);
  // Founders and builders must still reach the page they had.
  assert.match(dashboard, /return <FounderDashboard \/>;/);
});

test('every new email channel has a sender that consults it', () => {
  const gaps = fs.readFileSync('supabase/migrations/20260920180000_close_per_type_gaps.sql', 'utf8');
  // The discovery call request email is gated at the enqueue.
  assert.match(gaps, /notif_pref_enabled\(v_mentor_user, 'discovery_call_request_email_enabled'\)/);
  // The other two are queued through the shared dispatcher with their channel.
  assert.match(gaps, /'listing_enquiry_email_enabled'/);
  assert.match(gaps, /'investor_match_email_enabled'/);
  // And their in-app halves are gated too.
  assert.match(gaps, /notif_pref_enabled\(NEW\.counterparty_user_id, 'listing_enquiry_in_app_enabled'\)/);
  assert.match(gaps, /notif_pref_enabled\(v_investor\.id, 'investor_match_in_app_enabled'\)/);

  const sender = fs.readFileSync('supabase/functions/send-account-activity-email/index.ts', 'utf8');
  assert.match(sender, /verify_outbox_secret/);
  assert.match(sender, /listing_enquiry/);
  assert.match(sender, /investor_match/);
  // The recipient address is read from auth, never from the queued row.
  assert.match(sender, /auth\.admin\.getUserById\(delivery\.recipient_id\)/);
});

test('only the request email is suppressible, never a transactional one', () => {
  const gaps = fs.readFileSync('supabase/migrations/20260920180000_close_per_type_gaps.sql', 'utf8');
  const enqueue = gaps.slice(gaps.indexOf('FUNCTION public.enqueue_discovery_call_notification_v2'));
  // A confirmation, reschedule or cancellation must not be gated by a toggle.
  assert.match(enqueue, /p_recipient_role = 'mentor' AND p_template_key = 'request_created'/);
  assert.ok(!/p_template_key = 'booking_confirmed'/.test(enqueue), 'a transactional email is being gated');
});

test('a mentor answers from their own inbox without a mailed token', () => {
  const service = fs.readFileSync('supabase/functions/discovery-call-service/index.ts', 'utf8');
  const block = service.slice(service.indexOf('if (action === "mentorRespond")'), service.indexOf('if (action === "acceptMentorCounter"'));
  // Ownership is proved from the session, not from anything the client sent.
  assert.match(block, /\.eq\("mentors\.user_id", user\.id\)/);
  assert.match(block, /errorCode: "FORBIDDEN"/);
  // The unchanged state machine still does the work.
  assert.match(block, /respond_to_discovery_call_request_v4/);
  // Accepting mints the founder's management token, as the email path does.
  assert.match(block, /decision === "accept" \? await actionToken\(\) : null/);

  const page = fs.readFileSync('src/pages/account/MentorBookings.tsx', 'utf8');
  assert.match(page, /respondToBooking/);
  assert.match(page, /Accept/);
  assert.match(page, /Decline/);
});

test('mentor_bookings returns the slots an answer needs', () => {
  const gaps = fs.readFileSync('supabase/migrations/20260920180000_close_per_type_gaps.sql', 'utf8');
  const fn = gaps.slice(gaps.indexOf('FUNCTION public.mentor_bookings'), gaps.indexOf('FUNCTION public.enqueue_discovery_call_notification_v2'));
  assert.match(fn, /discovery_call_scheduling_slots/);
  assert.match(fn, /'roundId'/);
  // Still scoped to the caller's own mentor rows.
  assert.match(fn, /m\.user_id = auth\.uid\(\)/);
});

test('submitting an application cannot blank saved role answers', () => {
  const gaps = fs.readFileSync('supabase/migrations/20260920180000_close_per_type_gaps.sql', 'utf8');
  const fn = gaps.slice(gaps.indexOf('FUNCTION public.submit_account_application'), gaps.indexOf('FUNCTION public.mentor_bookings'));
  assert.match(fn, /p_role_profile = '\{\}'::jsonb/);
  assert.match(fn, /THEN COALESCE\(role_profile, '\{\}'::jsonb\)/);
});
