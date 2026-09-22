import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BIZMAP_STAGE_ORDER, FOUNDER_STAGE_LABELS, founderStageLabel } from '../src/lib/bizmapStageOrder.ts';

const profile = readFileSync('src/pages/Profile.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20260918120000_profile_stage_and_connections.sql', 'utf8');
const connectionListMigration = readFileSync('supabase/migrations/20260922213000_list_profile_connections.sql', 'utf8');
const connectionsDialog = readFileSync('src/components/profile/ConnectionsDialog.tsx', 'utf8');

test('a profile stage is one of the seven cycle stages', () => {
  // The old label title-cased the free-text business_stage column, which holds
  // ten unvalidated values in production including 'growing' and 'scaling'.
  // Nothing outside the cycle can be produced now.
  assert.equal(FOUNDER_STAGE_LABELS.length, BIZMAP_STAGE_ORDER.length);
  assert.deepEqual([...FOUNDER_STAGE_LABELS],
    ['Identity', 'Prototyping', 'Validation', 'Building', 'Launch', 'Traction', 'Fundraise']);
  for (let stage = 1; stage <= 7; stage += 1) {
    assert.equal(founderStageLabel(stage), FOUNDER_STAGE_LABELS[stage - 1], String(stage));
  }
});

test('an unknown stage produces nothing rather than a wrong stage', () => {
  for (const value of [null, undefined, 0, 8, -1, 3.5, Number.NaN]) {
    const label = founderStageLabel(value as number | null | undefined);
    assert.ok(label === null || (FOUNDER_STAGE_LABELS as readonly string[]).includes(label), String(value));
  }
  assert.equal(founderStageLabel(null), null);
  assert.equal(founderStageLabel(8), null);
});

test('the profile reads the quiz placement before the free text', () => {
  assert.match(profile, /founderStageLabel\(profile\.assigned_stage\) \?\? getPublicStageLabel/);
  assert.match(profile, /'assigned_stage',/, 'the column has to be selected');
});

test('the profile counts connections rather than followers', () => {
  // Following is not a platform concept; connections are, and they are mutual.
  assert.doesNotMatch(profile, />Followers</);
  assert.match(profile, />Connections</);
  assert.match(profile, /connection_count/);
  assert.doesNotMatch(profile, /\{profile\.followers_count\}/, 'the stat must not read the follower column');
});

test('connections are counted in both directions and readable for any profile', () => {
  // friend_requests RLS limits SELECT to rows the viewer is part of, which is
  // right, so a visitor could never count somebody else's connections from the
  // client. Hence a definer function, and hence a pinned search_path.
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.connection_count/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path = public/);
  assert.match(migration, /status = 'accepted'/);
  assert.match(migration, /sender_id = target_id OR receiver_id = target_id/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.connection_count\(uuid\) TO anon, authenticated;/);
  // The view can only gain columns at the end, so assigned_stage sits last.
  assert.match(migration, /seo_indexable,[\s\S]*assigned_stage\s*\nFROM profiles p;/);
});

test('only the account owner can open the connection list from their profile', () => {
  assert.match(profile, /isOwnProfile \? \([\s\S]*setShowConnectionsDialog\(true\)/);
  assert.match(profile, /View your \$\{connectionCount \?\? 0\} connections/);
  assert.match(profile, /<ConnectionsDialog/);
});

test('the connection dialog lists accepted accounts and links to their profiles', () => {
  assert.match(connectionsDialog, /rpc\('my_connections'/);
  assert.match(connectionsDialog, /connections\.map/);
  assert.match(connectionsDialog, /encodeURIComponent\(connection\.username\)/);
  assert.match(connectionsDialog, /No connections yet/);
  assert.match(connectionsDialog, /Try again/);
});

test('the connection list is owner-scoped and includes both request directions', () => {
  assert.match(connectionListMigration, /FUNCTION public\.my_connections\(\)/);
  assert.match(connectionListMigration, /fr\.status = 'accepted'/);
  assert.match(connectionListMigration, /fr\.sender_id = auth\.uid\(\) OR fr\.receiver_id = auth\.uid\(\)/);
  assert.match(connectionListMigration, /WHEN fr\.sender_id = auth\.uid\(\) THEN fr\.receiver_id/);
  assert.match(connectionListMigration, /REVOKE ALL ON FUNCTION public\.my_connections\(\) FROM PUBLIC, anon/);
  assert.match(connectionListMigration, /GRANT EXECUTE ON FUNCTION public\.my_connections\(\) TO authenticated/);
});

test('connections are deduplicated consistently in the list and count', () => {
  assert.match(connectionListMigration, /GROUP BY 1/);
  assert.match(connectionListMigration, /COUNT\(DISTINCT CASE/);
});

test('the profile clears the workspace header instead of sitting flush against it', () => {
  // pt-header-offset is zeroed inside the workspace, because it reserves space
  // for the legacy nav that renders as null there.
  assert.match(profile, /pt-header-offset nav-offset-roomy/);
  const css = readFileSync('src/components/workspace-route-frame.css', 'utf8');
  const roomy = css.indexOf('.workspace-route-content .nav-offset-roomy');
  const zeroed = css.indexOf('.workspace-route-content .pt-header-offset');
  assert.ok(roomy > zeroed, 'nav-offset-roomy must come after pt-header-offset to win the cascade');
});
