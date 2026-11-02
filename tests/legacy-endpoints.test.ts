import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

test('legacy price and reward endpoints have no active business logic or app callers', () => {
  const retired = ['create-payment', 'verify-payment', 'sprint-commitment-manager'];
  for (const name of retired) {
    const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
    assert.match(source, /status: 410/, name);
    assert.doesNotMatch(source, /STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|credits\s*[,=:]|price_cents\s*[,=:]/, name);
  }

  const callers = sourceFiles('src').concat(sourceFiles('api')).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return retired.filter((name) => new RegExp(`functions\\.invoke(?:<[^>]+>)?\\(\\s*['\"]${name}['\"]`).test(source))
      .map((name) => `${file}: ${name}`);
  });
  assert.deepEqual(callers, []);
});
