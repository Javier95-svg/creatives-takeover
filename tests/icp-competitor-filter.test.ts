import assert from 'node:assert/strict';
import test from 'node:test';

import {
  competitorQuery,
  keywordStems,
  rejectCompetitor,
  selectCompetitors,
} from '../supabase/functions/_shared/icp-competitor-filter.ts';

const idea = 'A booking and payments app for independent dog groomers who work from a van';

// The results a production draft actually received on 2026-11-11.
const observed = [
  {
    url: 'https://www.facebook.com/WagNTailsMobileConversions/videos/we-hope-you-enjoyed/1786605986110653',
    title: '2.2K views | We hope you enjoyed Mobile Grooming Month!',
    snippet: 'Purpose-built mobile grooming vans for three decades.',
  },
  {
    url: 'https://www.wayland.ma.us/DocumentCenter/View/20744/Business-Certificates-as-of-9292026',
    title: 'DBA NAME',
    snippet: 'Business certificates, including a dog grooming business.',
  },
  {
    url: 'https://www.protectivity.com/product/dog-grooming-insurance',
    title: 'UK Dog Grooming Insurance | Mobile Grooming Insurance',
    snippet: 'Cover for mobile dog groomers.',
  },
  {
    url: 'https://wemu.io/solutions/pets',
    title: 'Dog grooming software — bookings, pet records, reminders | Wemu',
    snippet: 'Online booking and reminders for groomers.',
  },
];

test('the non-competitors a real draft listed are rejected, each for its reason', () => {
  assert.equal(rejectCompetitor(observed[0], idea), 'social_or_ugc');
  assert.equal(rejectCompetitor(observed[1], idea), 'public_sector');
  assert.equal(rejectCompetitor(observed[2], idea), 'not_a_product');
});

test('the real booking tool in the same results is kept', () => {
  assert.equal(rejectCompetitor(observed[3], idea), null);
  assert.deepEqual(selectCompetitors(observed, idea, 3).map((item) => item.url), ['https://wemu.io/solutions/pets']);
});

test('pages about another topic are off topic, and documents are never competitors', () => {
  assert.equal(rejectCompetitor({ url: 'https://example.com/crm', title: 'Best CRM software for dentists', snippet: '' }, idea), 'off_topic');
  assert.equal(rejectCompetitor({ url: 'https://example.com/grooming-guide.pdf', title: 'Grooming booking app guide', snippet: '' }, idea), 'document');
});

test('a non-software idea does not require software words', () => {
  const cafe = 'A quiet cafe with bookable desks for remote workers in Lisbon';
  assert.equal(rejectCompetitor({ url: 'https://deskcafe.pt', title: 'Desk cafe Lisbon for remote workers', snippet: '' }, cafe), null);
  assert.match(competitorQuery(cafe), /companies alternatives$/);
});

test('one result per host, and the query is short and product-oriented', () => {
  const twice = [observed[3], { ...observed[3], url: 'https://wemu.io/pricing' }];
  assert.equal(selectCompetitors(twice, idea, 5).length, 1);
  assert.equal(competitorQuery(idea), `${idea} software alternatives`);
  assert.ok(keywordStems(idea).includes('groom'));
});
