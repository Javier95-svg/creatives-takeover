import { expect, test } from '@playwright/test';

const encode = (value: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

test('authenticated messages route survives unavailable V2 RPCs', async ({ page }) => {
  const now = Math.floor(Date.now() / 1000);
  const userId = '11111111-1111-4111-8111-111111111111';
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
    sub: userId,
    email: 'runtime-test@example.invalid',
    role: 'authenticated',
    user_metadata: { full_name: 'Runtime Test' },
  })}.test-signature`;

  await page.addInitScript(({ session }) => {
    window.localStorage.setItem('sb-dummy-auth-token', JSON.stringify(session));
  }, {
    session: {
      access_token: accessToken,
      refresh_token: 'runtime-test-refresh-token',
      expires_at: now + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'runtime-test@example.invalid',
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: 'Runtime Test' },
        created_at: new Date().toISOString(),
      },
    },
  });

  await page.goto('/messages');
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Messages', exact: true })).toBeVisible();
});
