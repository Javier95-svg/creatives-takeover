import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

// Every business inquiry form posts to contact-form-submission, which emails
// admin@ and javier@ and saves the row (verified end to end 2026-10-18).
const aboutForm = read('../src/components/ContactUs.tsx');
const institutionForm = read('../src/components/audience/InstitutionContactForm.tsx');
const contactFunction = read('../supabase/functions/contact-form-submission/index.ts');

test('both inquiry forms post to contact-form-submission', () => {
  assert.match(aboutForm, /functions\.invoke\('contact-form-submission'/);
  assert.match(institutionForm, /functions\.invoke\("contact-form-submission"/);
});

test('notifications always go to admin@ and javier@', () => {
  const required = contactFunction.match(/REQUIRED_ADMIN_RECIPIENTS = \[([\s\S]*?)\]/);
  assert.ok(required, 'REQUIRED_ADMIN_RECIPIENTS not found');
  assert.match(required[1], /"admin@creatives-takeover\.com"/);
  assert.match(required[1], /"javier@creatives-takeover\.com"/);
});

test('the /about form checks its dropdowns before sending', () => {
  // The dropdowns are not native inputs, so `required` is not enforced by the
  // browser, and the function rejects an empty role or reason without saving.
  const submit = aboutForm.slice(aboutForm.indexOf('const handleSubmit'), aboutForm.indexOf("functions.invoke('contact-form-submission'"));
  assert.match(submit, /!formData\.role/);
  assert.match(submit, /!formData\.reason/);
  assert.match(submit, /return;/);
  assert.match(aboutForm, /id="role-error"/);
  assert.match(aboutForm, /id="reason-error"/);
});

test('the institution form always sends a role, a reason and a message', () => {
  // Type has a default, reason is a prop default, and the message is built from
  // the organization fields, so the function's required fields are never empty.
  assert.match(institutionForm, /reason = "partnership"/);
  assert.match(institutionForm, /role: type\.role/);
  assert.match(institutionForm, /fields\.message\.trim\(\) \|\| "No message\."/);
});
