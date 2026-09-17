import test from 'node:test';
import assert from 'node:assert/strict';
import { accountRoute } from '../src/lib/accountSearchRoute.ts';

test('mentors open the mentorship profile, everyone else the account profile', () => {
  assert.equal(
    accountRoute({ username: 'RamonaChihaia', isMentor: true, mentorName: 'Ramona Chihaia' }),
    '/mentorship/ramona-chihaia',
  );
  assert.equal(
    accountRoute({ username: 'petartijan', isMentor: false, mentorName: null }),
    '/profile/petartijan',
  );
});

test('the slug comes from the mentor record, not the profile name', () => {
  // These pairs are real: the mentor record and the profile disagree for 13 of
  // the active mentors, and /mentorship/:slug only matches the mentor record.
  for (const [mentorName, username, expected] of [
    ['Samuel Starkman', 'SamStarkman', '/mentorship/samuel-starkman'],
    ['Selma Fetic', 'sf', '/mentorship/selma-fetic'],
    ['Felipe de Sousa França', 'felipefranca', '/mentorship/felipe-de-sousa-franca'],
    ['Claudia Ioana Muresan', 'claudiaioana', '/mentorship/claudia-ioana-muresan'],
  ] as const) {
    assert.equal(accountRoute({ username, isMentor: true, mentorName }), expected);
  }
});

test('falls back to the account profile when the mentor name is unavailable', () => {
  // The v1 search response carries no mentor name, so a fallback response must
  // still link somewhere real rather than to a mentorship URL it cannot build.
  assert.equal(
    accountRoute({ username: 'daianatokpayeva', isMentor: true, mentorName: null }),
    '/profile/daianatokpayeva',
  );
  assert.equal(
    accountRoute({ username: 'daianatokpayeva', isMentor: true, mentorName: '   ' }),
    '/profile/daianatokpayeva',
  );
});

test('marketplace providers open their service listing', () => {
  assert.equal(
    accountRoute({ username: 'daryakablash', isMarketplace: true, serviceSlug: 'get-marketing' }),
    '/marketplace/get-marketing',
  );
  assert.equal(
    accountRoute({ username: 'harshladani', isMarketplace: true, serviceSlug: 'botpro-solutions' }),
    '/marketplace/botpro-solutions',
  );
  // v1 carries no slug, so a fallback response links to the account profile.
  assert.equal(
    accountRoute({ username: 'daryakablash', isMarketplace: true, serviceSlug: null }),
    '/profile/daryakablash',
  );
  assert.equal(
    accountRoute({ username: 'daryakablash', isMarketplace: true, serviceSlug: '  ' }),
    '/profile/daryakablash',
  );
});

test('mentorship wins over marketplace when someone is both', () => {
  // The mentor page carries the booking flow, so it is the more useful landing.
  assert.equal(
    accountRoute({
      username: 'someone', isMentor: true, mentorName: 'Ramona Chihaia',
      isMarketplace: true, serviceSlug: 'get-marketing',
    }),
    '/mentorship/ramona-chihaia',
  );
});

test('an account with no handle is not linkable', () => {
  assert.equal(accountRoute({ username: null, isMentor: false, mentorName: null }), undefined);
  assert.equal(accountRoute({ username: '', isMentor: false, mentorName: null }), undefined);
});

test('handles that need escaping stay valid in the profile URL', () => {
  assert.equal(accountRoute({ username: 'a b', isMentor: false }), '/profile/a%20b');
});
