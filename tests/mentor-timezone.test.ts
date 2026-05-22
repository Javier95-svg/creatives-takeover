import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getMentorTimezoneOffset,
  getTimezoneOptions,
  isMentorInExactTimezone,
  parseTimezoneOffset,
} from '../src/utils/mentorTimezone.ts';

const bstReferenceDate = new Date('2026-05-22T12:00:00Z');

test('timezone parsing accepts numeric and GMT offset values', () => {
  assert.equal(parseTimezoneOffset('1'), 1);
  assert.equal(parseTimezoneOffset('GMT+1'), 1);
  assert.equal(parseTimezoneOffset('GMT+5:30'), 5.5);
  assert.equal(parseTimezoneOffset('GMT-3'), -3);
});

test('timezone options group countries by their exact current GMT offset', () => {
  const gmtPlusOne = getTimezoneOptions(bstReferenceDate).find(
    (option) => option.value === '1',
  );

  assert.ok(gmtPlusOne);
  assert.ok(gmtPlusOne.countries.includes('United Kingdom'));
  assert.ok(gmtPlusOne.countries.includes('Nigeria'));
  assert.ok(!gmtPlusOne.countries.includes('France'));
});

test('mentor timezone offset follows daylight saving time', () => {
  assert.equal(
    getMentorTimezoneOffset(
      { name: 'Marc Bright', nationality: 'United Kingdom' },
      bstReferenceDate,
    ),
    1,
  );
});

test('mentor timezone fallback countries match card-level nationality fallbacks', () => {
  assert.equal(
    getMentorTimezoneOffset(
      { name: 'Sophia Lopez Pimenta', nationality: undefined },
      bstReferenceDate,
    ),
    1,
  );
  assert.equal(
    getMentorTimezoneOffset(
      { name: 'Carolina Barthalot', nationality: undefined },
      bstReferenceDate,
    ),
    2,
  );
});

test('mentor timezone filter requires the exact current offset', () => {
  assert.equal(
    isMentorInExactTimezone(
      { name: 'Marc Bright', nationality: 'United Kingdom' },
      1,
      bstReferenceDate,
    ),
    true,
  );
  assert.equal(
    isMentorInExactTimezone(
      { name: 'Vashti Joseph', nationality: 'France' },
      1,
      bstReferenceDate,
    ),
    false,
  );
  assert.equal(
    isMentorInExactTimezone(
      { name: 'Dikshit Kukreja', nationality: 'India' },
      1,
      bstReferenceDate,
    ),
    false,
  );
});
