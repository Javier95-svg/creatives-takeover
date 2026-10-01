import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestImportMapping, suggestDealStage, weeklyDisciplineSeries } from '../src/lib/coreToolsExperience.ts';

test('mapping recognizes common columns but leaves ambiguous aliases for the founder', () => {
  const mapping = suggestImportMapping(['Response ID', 'Submitted at', 'Email Address', 'Full Name', 'Customer Name', 'Comments']);
  assert.equal(mapping.id, 'Response ID');
  assert.equal(mapping.date, 'Submitted at');
  assert.equal(mapping.email, 'Email Address');
  assert.equal(mapping.feedback, 'Comments');
  assert.equal(mapping.respondent, undefined);
  assert.equal(suggestImportMapping(['email', 'Email']).email, undefined);
});

test('unknown CRM stages are never guessed from provider-specific identifiers', () => {
  assert.equal(suggestDealStage('Closed Won'), 'customer');
  assert.equal(suggestDealStage('closedlost'), 'lost');
  assert.equal(suggestDealStage('1234567'), '');
  assert.equal(suggestDealStage('Interested but not qualified'), '');
});

test('weekly history preserves genuine zeroes, missing weeks, and calculation boundaries', () => {
  const series = weeklyDisciplineSeries([
    {week_start_date:'2026-09-28',combined_score:80,calculation_version:2},
    {week_start_date:'2026-09-14',combined_score:0,calculation_version:2},
    {week_start_date:'2026-09-21',combined_score:95,calculation_version:1},
  ]);
  assert.equal(series.length,6);
  assert.deepEqual(series.slice(-3),[{date:'2026-09-14',score:0},{date:'2026-09-21',score:null},{date:'2026-09-28',score:80}]);
  assert.deepEqual(weeklyDisciplineSeries([{week_start_date:'2026-09-28',combined_score:99,calculation_version:1}]),[]);
});
