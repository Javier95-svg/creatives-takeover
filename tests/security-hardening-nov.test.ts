import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20261117070000_security_hardening_nov.sql');

// Security review 2026-11-17.
test('provider emails are not readable from listings; only an admin or a paying member gets one', () => {
  assert.match(migration, /REVOKE SELECT ON public\.services FROM anon, authenticated;/);
  const grant = migration.match(/GRANT SELECT \(([\s\S]*?)\) ON public\.services TO anon, authenticated;/);
  assert.ok(grant, 'column grant on services');
  assert.doesNotMatch(grant[1], /delivered_by_email/);
  assert.match(grant[1], /has_contact_email/);
  assert.match(migration, /t\.feature = 'Service Marketplace Email'[\s\S]{0,80}t\.metadata->>'serviceId' = s\.id::text/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.service_contact_email\(uuid\) FROM PUBLIC, anon;/);

  const services = read('src/hooks/useServices.ts');
  assert.doesNotMatch(services, /\.select\(\s*(["']\*["'])?\s*\)/, 'select("*") or select() on services is refused now');
  assert.doesNotMatch(services.match(/export const SERVICE_COLUMNS = \[[\s\S]*?\]/)?.[0] ?? '', /delivered_by_email/);
  // Every column the app reads must be granted.
  const appColumns = (services.match(/export const SERVICE_COLUMNS = \[([\s\S]*?)\]/)?.[1] ?? '').match(/"[a-z_]+"/g)!.map((c) => c.slice(1, -1));
  for (const column of appColumns) assert.match(grant[1], new RegExp(`\\b${column}\\b`), `${column} is granted`);

  const contact = read('src/hooks/useServiceMarketplaceContact.ts');
  assert.match(contact, /fetchServiceContactEmail\(service\.id\)/);
  assert.doesNotMatch(contact, /providerEmail/);
  assert.match(read('src/pages/community/AdminServiceEditor.tsx'), /fetchServiceContactEmail\(serviceId\)/);
});

test('anonymous feedback, deck listing and app tokens are closed', () => {
  assert.match(migration, /CREATE POLICY "Users can view their own feedback" ON public\.user_feedback\s+FOR SELECT USING \(\(SELECT auth\.uid\(\)\) = user_id\);/);
  assert.match(migration, /bucket_id = 'service-pitch-decks' AND public\.is_service_marketplace_admin\(\)/);
  assert.match(migration, /DROP POLICY IF EXISTS "Anyone can view service pitch decks" ON storage\.objects;/);
  assert.match(migration, /REVOKE ALL ON public\.stripe_connections FROM anon, authenticated;/);
  assert.match(migration, /REVOKE ALL ON public\.user_integrations FROM anon, authenticated;/);
});

test('usage functions answer only for the signed-in member', () => {
  for (const fn of ['get_feature_usage', 'has_completed_todays_challenge', 'can_view_accelerator', 'can_view_vc']) {
    const body = migration.match(new RegExp(`FUNCTION public\\.${fn}\\([\\s\\S]*?\\$function\\$;`))?.[0] ?? '';
    assert.match(body, /IF auth\.uid\(\) IS NOT NULL AND p_user_id IS DISTINCT FROM auth\.uid\(\) THEN/, fn);
  }
  for (const fn of ['get_monthly_accelerator_view_count', 'get_monthly_vc_view_count', 'get_monthly_directory_view_count']) {
    const body = migration.match(new RegExp(`FUNCTION public\\.${fn}\\([\\s\\S]*?\\$function\\$;`))?.[0] ?? '';
    assert.match(body, /AND \(auth\.uid\(\) IS NULL OR p_user_id = auth\.uid\(\)\)/, fn);
    assert.match(migration, new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${fn}\\(uuid\\) FROM PUBLIC, anon;`), fn);
  }
  assert.match(migration, /SET search_path = public, extensions, pg_temp/);
  assert.match(migration, /d\.deptype = 'e'/, 'extension functions are left alone');
});

test('the browser-sent signup notice endpoint is gone', () => {
  assert.equal(existsSync(new URL('../supabase/functions/notify-admin/index.ts', import.meta.url)), false);
  assert.doesNotMatch(read('supabase/config.toml'), /\[functions\.notify-admin\]/);
});
