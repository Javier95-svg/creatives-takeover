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
  const migration = read('../supabase/migrations/20260810130000_account_deletion_support.sql');

  assert.match(migration, /storage\.objects[\s\S]*owner_id = p_user_id::text/);
  assert.match(migration, /DELETE FROM public\.profiles WHERE id = p_user_id/);
  assert.match(migration, /RAISE EXCEPTION 'Account cleanup is blocked by %\.%'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.cleanup_account_data_v1\(uuid\)[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.cleanup_account_data_v1\(uuid\)[\s\S]*TO service_role/);
  assert.match(migration, /post_comments_post_id_fkey[\s\S]*ON DELETE CASCADE/);
  assert.match(migration, /discovery_calls_mentor_id_fkey[\s\S]*ON DELETE SET NULL/);
  assert.match(migration, /DELETE FROM public\.services WHERE delivered_by_user_id = p_user_id/);
});
