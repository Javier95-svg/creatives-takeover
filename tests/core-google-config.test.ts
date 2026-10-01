import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coreGoogleConfig } from '../supabase/functions/_shared/core-google-config.ts';
const legacy = { GOOGLE_CALENDAR_CLIENT_ID:'existing-id', GOOGLE_CALENDAR_CLIENT_SECRET:'existing-secret' };
const read = (values: Record<string,string>) => (name: string) => values[name];
test('reuses a complete existing Calendar OAuth app when core credentials are absent', () => {
  assert.deepEqual(coreGoogleConfig(read(legacy)), {clientId:'existing-id',clientSecret:'existing-secret'});
});
test('uses a dedicated core app without mixing credential pairs', () => {
  assert.deepEqual(coreGoogleConfig(read({...legacy,CORE_GOOGLE_CLIENT_ID:'new-id',CORE_GOOGLE_CLIENT_SECRET:'new-secret'})), {clientId:'new-id',clientSecret:'new-secret'});
  assert.throws(()=>coreGoogleConfig(read({...legacy,CORE_GOOGLE_CLIENT_ID:'new-id'})), /both/);
  assert.throws(()=>coreGoogleConfig(read({})), /not configured/);
});
