import { expect, test, type Page } from '@playwright/test';

const PHOTO = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
type Post = { id: string; content: string; publish_at: string; image_path: string | null };

async function setup(page: Page) {
  const state = { posts: [] as Post[], failSave: false, saves: 0, uploads: 0 };
  await page.route('**/src/main.tsx', (route) => route.fulfill({ contentType: 'application/javascript', body: 'import "/e2e/fixtures/profile-posts-harness.tsx";' }));
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    let body: unknown = [];
    if (url.pathname.endsWith('/profile_posts')) {
      if (method === 'POST') {
        state.saves++;
        if (state.failSave) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated save failure' }) });
        const payload = route.request().postDataJSON();
        state.posts.push({ ...payload, id: String(state.saves), publish_at: payload.publish_at || new Date().toISOString() });
        return route.fulfill({ status: 201, body: '' });
      }
      if (method === 'DELETE') {
        state.posts = state.posts.filter((post) => `eq.${post.id}` !== url.searchParams.get('id'));
        return route.fulfill({ status: 204, body: '' });
      }
      const future = url.searchParams.get('publish_at')?.startsWith('gt.');
      body = state.posts.filter((post) => future ? Date.parse(post.publish_at) > Date.now() : Date.parse(post.publish_at) <= Date.now());
    } else if (url.pathname.endsWith('/user_photos')) {
      body = [{ id: 'legacy-photo', caption: 'Our very first prototype', image_url: '/test-photo.png', created_at: '2026-01-01T12:00:00Z' }];
    } else if (url.pathname.endsWith('/community_posts')) {
      body = [{ id: 'community-post', title: 'Lessons from customer interviews', content: 'We spoke to ten founders.', created_at: '2026-01-02T12:00:00Z' }];
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/storage/v1/**', (route) => {
    if (route.request().url().includes('/object/sign/')) {
      const { paths } = route.request().postDataJSON();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(paths.map((path: string) => ({ path, signedURL: '/test-photo.png', error: null }))) });
    }
    state.uploads++;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ Key: 'photo' }) });
  });
  await page.route('**/test-photo.png', (route) => route.fulfill({ contentType: 'image/png', body: PHOTO }));
  return state;
}

test('owner publishes text, emoji and photo, while keeping existing content', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/');
  await expect(page.getByText('Our very first prototype')).toBeVisible();
  await expect(page.getByText('We spoke to ten founders.')).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Your journey update' });
  await input.fill('We shipped our first prototype ');
  await input.press('End');
  await page.getByRole('button', { name: 'Add emoji' }).click();
  await page.getByRole('button', { name: 'Rocket', exact: true }).click();
  await expect(input).toHaveValue('We shipped our first prototype 🚀');
  await page.getByLabel('Attach a photo').setInputFiles({ name: 'prototype.png', mimeType: 'image/png', buffer: PHOTO });
  await expect(page.getByAltText('Photo attached to your update')).toBeVisible();
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(input).toHaveValue('');
  await expect(page.getByText('We shipped our first prototype 🚀', { exact: true })).toBeVisible();
  expect(state.saves).toBe(1);
  expect(state.uploads).toBe(1);
  expect(state.posts[0].image_path).toMatch(/^11111111-1111-4111-8111-111111111111\/.+\.png$/);
  await page.screenshot({ path: 'test-results/profile-posts-desktop.png', fullPage: true });
});

test('schedules in local time, persists across reload, and can be cancelled', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Your journey update' }).fill('Tomorrow’s launch');
  await page.getByRole('button', { name: 'Schedule post', exact: true }).click();
  await page.getByLabel('Publish later', { exact: true }).fill('2099-10-23T14:00');
  const expectedTime = await page.evaluate(() => new Date('2099-10-23T14:00').toISOString());
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect(page.locator('summary')).toContainText('Scheduled posts (1)');
  expect(state.posts[0].publish_at).toBe(expectedTime);
  await page.reload();
  await page.locator('summary').click();
  await expect(page.getByText('Tomorrow’s launch', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel scheduled post' }).click();
  await page.getByRole('button', { name: 'Remove post', exact: true }).click();
  await expect(page.locator('summary')).toHaveCount(0);
  expect(state.posts).toHaveLength(0);
});

test('failed saves preserve the draft and visitors have no publishing controls', async ({ page }) => {
  const state = await setup(page);
  state.failSave = true;
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Your journey update' });
  await input.fill('Do not lose this update');
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByText(/Could not save your post/)).toBeVisible();
  await expect(input).toHaveValue('Do not lose this update');
  await page.goto('/?visitor');
  await expect(page.getByText('Our very first prototype')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your journey update' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete post' })).toHaveCount(0);
});

test('mobile composer fits without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Your journey update' })).toBeVisible();
  await page.getByRole('button', { name: 'Schedule post', exact: true }).click();
  await expect(page.getByLabel('Publish later', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/profile-posts-mobile.png', fullPage: true });
});

test('existing photos and community posts remain visible before the database rollout', async ({ page }) => {
  await setup(page);
  await page.route('**/rest/v1/profile_posts**', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST205', message: 'Table not found' }) }));
  await page.goto('/');
  await expect(page.getByText('Our very first prototype')).toBeVisible();
  await expect(page.getByText('We spoke to ten founders.')).toBeVisible();
  await expect(page.getByText('Posting is temporarily unavailable.', { exact: false })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your journey update' })).toHaveCount(0);
});
