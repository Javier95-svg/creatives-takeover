import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('dashboard settings links to a dedicated guarded account deletion route', () => {
  const app = read('../src/App.tsx');
  const settings = read('../src/pages/DashboardSettingsPage.tsx');
  const deletion = read('../src/pages/DeleteAccountSettings.tsx');

  assert.match(app, /path="\/settings\/delete-account" element=\{<DeleteAccountSettings \/>\}/);
  assert.match(settings, /to="\/settings\/delete-account"/);
  assert.match(settings, /Delete account/);
  assert.match(deletion, /confirmation !== "DELETE"/);
  assert.match(deletion, /delete-acknowledgement/);
  assert.match(deletion, /AlertDialogTitle>Delete your account permanently\?/);
  assert.match(deletion, /functions\.invoke<DeleteAccountResponse>\("delete-account"/);
});

test('password identities are reverified by the backend before account deletion', () => {
  const edge = read('../supabase/functions/delete-account/index.ts');

  const sessionCheck = edge.indexOf('auth.getUser(token)');
  const providerCheck = edge.indexOf('identity.provider === "email"');
  const passwordCheck = edge.indexOf('auth.signInWithPassword');
  const userMatch = edge.indexOf('verification.user?.id !== user.id');
  const deletion = edge.indexOf('auth.admin.deleteUser');

  assert.ok(sessionCheck > 0);
  assert.ok(providerCheck > sessionCheck);
  assert.ok(passwordCheck > providerCheck);
  assert.ok(userMatch > passwordCheck);
  assert.ok(deletion > userMatch);
  assert.match(edge, /CURRENT_PASSWORD_INCORRECT[\s\S]*Current password is incorrect\./);
});

test('backend cancels billing and removes owned storage before deleting the auth user', () => {
  const edge = read('../supabase/functions/delete-account/index.ts');
  const config = read('../supabase/config.toml');

  const cancelBilling = edge.indexOf('cancelSubscriptions(stripe');
  const inventory = edge.indexOf('list_owned_storage_objects_for_account_deletion_v1');
  const storageRemoval = edge.indexOf('deleteOwnedStorageObjects(adminClient');
  const dataCleanup = edge.indexOf('cleanup_account_data_v1');
  const authDeletion = edge.indexOf('auth.admin.deleteUser');
  const notification = edge.indexOf('resend.emails.send');

  assert.ok(cancelBilling > 0);
  assert.ok(inventory > cancelBilling);
  assert.ok(storageRemoval > inventory);
  assert.ok(dataCleanup > storageRemoval);
  assert.ok(authDeletion > dataCleanup);
  assert.ok(notification > authDeletion);
  assert.match(config, /\[functions\.delete-account\][\s\S]*verify_jwt = true/);
});

test('account cleanup RPC is service-role only and rolls back blocked cleanup', () => {
  const supportMigration = read('../supabase/migrations/20260810130000_account_deletion_support.sql');
  const cleanupMigration = read('../supabase/migrations/20260811223000_optimize_account_deletion_cleanup.sql');

  assert.match(supportMigration, /storage\.objects[\s\S]*owner_id = p_user_id::text/);
  assert.match(supportMigration, /post_comments_post_id_fkey[\s\S]*ON DELETE CASCADE/);
  assert.match(supportMigration, /discovery_calls_mentor_id_fkey[\s\S]*ON DELETE SET NULL/);
  assert.match(cleanupMigration, /DELETE FROM public\.profiles WHERE id = p_user_id/);
  assert.match(cleanupMigration, /ERRCODE = '23503'[\s\S]*Account cleanup is blocked by public\.%I/);
  assert.match(cleanupMigration, /REVOKE ALL ON FUNCTION public\.cleanup_account_data_v1\(uuid\)[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(cleanupMigration, /GRANT EXECUTE ON FUNCTION public\.cleanup_account_data_v1\(uuid\)[\s\S]*TO service_role/);
  assert.match(cleanupMigration, /DELETE FROM public\.services WHERE delivered_by_user_id = p_user_id/);
});

test('account cleanup inventories and retries only tables owned by the target account', () => {
  const migration = read('../supabase/migrations/20260811223000_optimize_account_deletion_cleanup.sql');

  assert.match(migration, /classes\.relkind IN \('r', 'p'\)/);
  assert.match(migration, /NOT classes\.relispartition/);
  assert.match(migration, /IF has_owned_rows THEN[\s\S]*array_append\(owned_table_names, target\.table_name\)/);
  assert.match(migration, /maximum_passes := GREATEST\(cardinality\(owned_table_names\), 1\)/);
  assert.match(migration, /FOREACH target_table_name IN ARRAY owned_table_names/);
  assert.match(migration, /EXIT WHEN deleted_in_pass = 0/);
  assert.match(migration, /Account cleanup failed for public\.%I \[%s\]/);
  assert.doesNotMatch(migration, /FOR cleanup_pass IN 1\.\.8/);
});

test('cleanup failures include a request reference and database diagnostics in server logs', () => {
  const edge = read('../supabase/functions/delete-account/index.ts');

  assert.match(edge, /const requestId = crypto\.randomUUID\(\)/);
  assert.match(edge, /delete-account: data cleanup failed[\s\S]*code: cleanupError\.code[\s\S]*details: cleanupError\.details/);
  assert.match(edge, /code: "DATA_CLEANUP_FAILED",[\s\S]*requestId/);
});
