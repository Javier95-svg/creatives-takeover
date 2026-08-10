import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  getPasswordValidationError,
  MIN_PASSWORD_LENGTH,
} from '../src/lib/passwordPolicy.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('password policy enforces shared length and complexity rules', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 8);
  assert.match(getPasswordValidationError('short1') || '', /at least 8 characters/i);
  assert.match(getPasswordValidationError('lettersOnly') || '', /letter and one number/i);
  assert.match(getPasswordValidationError('12345678') || '', /letter and one number/i);
  assert.equal(getPasswordValidationError('founder8'), null);
});

test('signup and password reset use the shared password policy', () => {
  const signup = read('../src/pages/Signup.tsx');
  const reset = read('../src/pages/ResetPassword.tsx');
  const auth = read('../src/pages/Auth.tsx');
  const directSignup = read('../supabase/functions/signup-direct/index.ts');

  assert.match(signup, /getPasswordValidationError\(formData\.password\)/);
  assert.match(reset, /getPasswordValidationError\(formData\.password\)/);
  assert.match(auth, /getPasswordValidationError\(password\)/);
  assert.match(directSignup, /!\/\[A-Za-z\]\/\.test\(password\) \|\| !\/\\d\/\.test\(password\)/);
});

test('security settings exposes all three fields and invokes the backend', () => {
  const app = read('../src/App.tsx');
  const account = read('../src/pages/Account.tsx');
  const security = read('../src/pages/SecuritySettings.tsx');

  assert.match(app, /path="\/settings\/security" element=\{<SecuritySettings \/>\}/);
  assert.match(account, /to="\/settings\/security"/);
  assert.match(security, /"current-password", "Current password"/);
  assert.match(security, /"new-password", "New password"/);
  assert.match(security, /"confirm-new-password", "Confirm new password"/);
  assert.match(security, /newPassword !== confirmPassword/);
  assert.match(security, /functions\.invoke<ChangePasswordResponse>\("change-password"/);
});

test('dashboard side panel exposes the settings route and password entry point', () => {
  const app = read('../src/App.tsx');
  const sidebar = read('../src/components/dashboard/DashboardSidebar.tsx');
  const tabs = read('../src/components/dashboard/DashboardTabsHost.tsx');
  const settings = read('../src/pages/DashboardSettingsPage.tsx');

  assert.match(app, /<Route path="settings" element=\{<DashboardSettingsPage \/>\}/);
  assert.match(sidebar, /to="\/dashboard\/settings"/);
  assert.match(sidebar, />Settings<\/span>/);
  assert.match(tabs, /path: '\/dashboard\/settings', Component: DashboardSettingsPage/);
  assert.match(settings, /to="\/settings\/security"/);
  assert.match(settings, /Change password/);
});

test('backend verifies the current password before updating and emails only afterward', () => {
  const edge = read('../supabase/functions/change-password/index.ts');
  const config = read('../supabase/config.toml');

  const sessionCheck = edge.indexOf('auth.getUser(token)');
  const passwordCheck = edge.indexOf('auth.signInWithPassword');
  const userMatch = edge.indexOf('verification.user?.id !== user.id');
  const update = edge.indexOf('auth.admin.updateUserById');
  const email = edge.indexOf('resend.emails.send');

  assert.ok(sessionCheck > 0);
  assert.ok(passwordCheck > sessionCheck);
  assert.ok(userMatch > passwordCheck);
  assert.ok(update > userMatch);
  assert.ok(email > update);
  assert.match(edge, /CURRENT_PASSWORD_INCORRECT[\s\S]*Current password is incorrect\./);
  assert.match(edge, /to: \[user\.email\]/);
  assert.match(config, /\[functions\.change-password\][\s\S]*verify_jwt = true/);
});
