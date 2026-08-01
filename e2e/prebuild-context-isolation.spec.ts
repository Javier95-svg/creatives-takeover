import { expect, test, type Page, type Route } from '@playwright/test';

const userId = '77777777-7777-4777-8777-777777777777';
const now = Math.floor(Date.now() / 1000);
const user = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'two-ideas@example.invalid',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Two Idea Founder' },
  identities: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const contexts = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', user_id: userId, icp_analysis_id: '11111111-1111-4111-8111-111111111111', label: 'Idea Alpha', is_explicitly_unscoped: false, status: 'active', created_at: '2026-08-01T12:00:00Z' },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', user_id: userId, icp_analysis_id: '22222222-2222-4222-8222-222222222222', label: 'Idea Beta', is_explicitly_unscoped: false, status: 'active', created_at: '2026-08-01T11:00:00Z' },
];

async function authenticate(page: Page) {
  const session = {
    access_token: 'e2e-context-access-token', refresh_token: 'e2e-context-refresh-token',
    expires_at: now + 3600, expires_in: 3600, token_type: 'bearer', user,
  };
  await page.addInitScript((stored) => {
    window.localStorage.setItem('sb-dummy-auth-token', JSON.stringify(stored));
  }, session);
  await page.route('**/auth/v1/user', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
}

const objectResponse = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: 'application/vnd.pgrst.object+json', body: JSON.stringify(body) });
const listResponse = (route: Route, body: unknown[] = []) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(0, body.length - 1)}/${body.length}` }, body: JSON.stringify(body) });

test('authenticated founder keeps two pre-build ideas isolated through PMF hydration', async ({ page }) => {
  await authenticate(page);
  const scopedRequests: string[] = [];

  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    const wantsObject = (route.request().headers().accept || '').includes('vnd.pgrst.object');
    if (table === 'prebuild_validation_contexts') {
      const idFilter = url.searchParams.get('id');
      if (idFilter?.startsWith('eq.')) {
        const row = contexts.find((item) => item.id === idFilter.slice(3)) ?? null;
        return objectResponse(route, row);
      }
      return listResponse(route, contexts);
    }

    if (['pmf_surveys', 'pmf_customer_discovery', 'pmf_analysis_results', 'pmf_interviews', 'pmf_context_evidence', 'demo_studio_projects'].includes(table || '')) {
      scopedRequests.push(url.toString());
    }
    return wantsObject ? objectResponse(route, null) : listResponse(route);
  });
  await page.route('**/functions/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, success: true, handoff: null }) }));

  await page.goto('/pmf-lab');
  await expect(page.getByRole('heading', { name: 'Which idea are you evaluating?' })).toBeVisible();
  await expect(page.getByText('Idea Alpha')).toBeVisible();
  await expect(page.getByText('Idea Beta')).toBeVisible();

  await page.getByText('Idea Alpha').click();
  await expect(page).toHaveURL(new RegExp(`context=${contexts[0].id}`));
  await expect.poll(() => scopedRequests.some((url) => url.includes(`validation_context_id=eq.${contexts[0].id}`))).toBe(true);
  expect(scopedRequests.filter((url) => url.includes(`validation_context_id=eq.${contexts[1].id}`))).toHaveLength(0);

  scopedRequests.length = 0;
  await page.goto('/pmf-lab');
  await page.getByText('Idea Beta').click();
  await expect(page).toHaveURL(new RegExp(`context=${contexts[1].id}`));
  await expect.poll(() => scopedRequests.some((url) => url.includes(`validation_context_id=eq.${contexts[1].id}`))).toBe(true);
  const firstBetaRequest = scopedRequests.findIndex((url) => url.includes(`validation_context_id=eq.${contexts[1].id}`));
  expect(firstBetaRequest).toBeGreaterThanOrEqual(0);
  expect(scopedRequests.slice(firstBetaRequest).filter((url) => url.includes(`validation_context_id=eq.${contexts[0].id}`))).toHaveLength(0);
});
