import assert from 'node:assert/strict';
import test from 'node:test';

import {
  escapeControlCharsInJsonStrings,
  htmlTracksFormSubmissions,
  parseJsonTolerant,
} from '../supabase/functions/_shared/mvp-model-output.ts';
import { htmlTracksFormSubmissions as appHtmlTracksFormSubmissions } from '../src/lib/mvp-builder/phase1.ts';

test('raw line breaks inside JSON strings are escaped, structure is kept', () => {
  // What Gemini returned on 2026-11-12: HTML with real newlines inside a string.
  const raw = '{\n  "project_type": "html_single",\n  "files": [{"path": "index.html", "content": "<html>\n\t<body>Hi</body>\n</html>"}]\n}';
  assert.throws(() => JSON.parse(raw));
  const parsed = parseJsonTolerant(raw) as { files: Array<{ content: string }> };
  assert.equal(parsed.files[0].content, '<html>\n\t<body>Hi</body>\n</html>');
});

test('escaped quotes and existing escapes are left alone', () => {
  const raw = '{"a": "say \\"hi\\"\nnext \\\\ line"}';
  assert.deepEqual(parseJsonTolerant(raw), { a: 'say "hi"\nnext \\ line' });
  assert.equal(escapeControlCharsInJsonStrings('{"a": 1}'), '{"a": 1}');
});

test('genuinely broken JSON still throws', () => {
  assert.throws(() => parseJsonTolerant('{"a": '));
});

for (const [name, check] of [['edge', htmlTracksFormSubmissions], ['app', appHtmlTracksFormSubmissions]] as const) {
  test(`${name}: data-ct-lead forms count as tracked by the platform`, () => {
    assert.equal(check('<form data-ct-lead data-ct-success="Thanks"><input name="email"></form>'), true);
    assert.equal(check('<main>No form here</main>'), true);
    assert.equal(check('<form id="x"></form><script>posthog.capture("form_submitted")</script>'), true);
  });

  test(`${name}: a form the platform does not submit must track form_submitted`, () => {
    assert.equal(check('<form id="contact"><input name="email"></form>'), false);
    assert.equal(check('<form data-ct-lead></form><form action="/x"></form>'), false);
  });
}
