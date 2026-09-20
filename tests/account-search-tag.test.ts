import test from 'node:test';
import assert from 'node:assert/strict';
import { accountTag } from '../src/lib/accountSearchTag.ts';

test('an account carries exactly one tag', () => {
  // Every account has a founder segment, so without precedence a mentor would
  // show two tags. One per account is the rule.
  assert.deepEqual(accountTag({ isMentor: true, founderSegment: 'builder' }), { label: 'Mentor', variant: 'outline' });
  assert.deepEqual(accountTag({ isMarketplace: true, founderSegment: 'founder' }), { label: 'Marketplace', variant: 'outline' });
});

test('mentors and marketplace providers are never labelled Founder or Builder', () => {
  for (const segment of ['founder', 'builder'] as const) {
    assert.equal(accountTag({ isMentor: true, founderSegment: segment })?.label, 'Mentor');
    assert.equal(accountTag({ isMarketplace: true, founderSegment: segment })?.label, 'Marketplace');
  }
});

test('mentor outranks marketplace for anyone who is both', () => {
  assert.equal(accountTag({ isMentor: true, isMarketplace: true, founderSegment: 'founder' })?.label, 'Mentor');
});

test('regular accounts carry their segment', () => {
  assert.deepEqual(accountTag({ founderSegment: 'founder' }), { label: 'Founder', variant: 'secondary' });
  assert.deepEqual(accountTag({ founderSegment: 'builder' }), { label: 'Builder', variant: 'secondary' });
});

test('an account with no segment carries no tag', () => {
  assert.equal(accountTag({}), null);
  assert.equal(accountTag({ founderSegment: null }), null);
});

test('an approved investor is tagged, an unapproved one is not', () => {
  // The claim is theirs until an admin agrees with it. Showing it before then
  // would present a request to the network as a fact.
  assert.deepEqual(accountTag({ userType: 'investor', approvalStatus: 'approved' }), { label: 'Investor', variant: 'outline' });
  assert.equal(accountTag({ userType: 'investor', approvalStatus: 'pending' }), null);
  assert.equal(accountTag({ userType: 'investor', approvalStatus: 'rejected' }), null);
  for (const type of ['mentor', 'marketplace'] as const) {
    assert.equal(accountTag({ userType: type, approvalStatus: 'pending' }), null, type);
  }
});

test('a live directory listing outranks the account type', () => {
  // Someone can hold a published mentor profile whatever they answered in the
  // quiz, and the listing is the thing the network can actually see.
  assert.deepEqual(
    accountTag({ isMentor: true, userType: 'investor', approvalStatus: 'approved' }),
    { label: 'Mentor', variant: 'outline' },
  );
  assert.deepEqual(
    accountTag({ isMarketplace: true, userType: 'founder' }),
    { label: 'Marketplace', variant: 'outline' },
  );
});

test('user_type supersedes the older founder segment', () => {
  assert.deepEqual(accountTag({ userType: 'builder', founderSegment: 'founder' }), { label: 'Builder', variant: 'secondary' });
  // Accounts that predate user_type still tag from the segment alone.
  assert.deepEqual(accountTag({ founderSegment: 'founder' }), { label: 'Founder', variant: 'secondary' });
  assert.equal(accountTag({}), null);
});
