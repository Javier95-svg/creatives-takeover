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
