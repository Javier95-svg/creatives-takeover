import { expect, test } from '@playwright/test';

test('podcast YouTube iframe becomes visible when playback is ready', async ({ page }) => {
  await page.route('**/*.supabase.co/**', async (route) => {
    const isPodcastRequest = new URL(route.request().url()).pathname.includes('/rest/v1/podcast_episodes');
    await route.fulfill({
      contentType: 'application/json',
      body: isPodcastRequest ? JSON.stringify([
        {
          id: 'episode-1',
          title: 'Visible video regression check',
          description: 'A browser-level check for the podcast player.',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          youtube_video_id: 'dQw4w9WgXcQ',
          hashtags: [],
          is_published: true,
          sort_order: 1,
          created_at: '2026-08-13T00:00:00.000Z',
          updated_at: '2026-08-13T00:00:00.000Z',
        },
      ]) : JSON.stringify({ user: null, session: null }),
    });
  });

  // Reproduce the important YouTube API behavior: Player replaces the supplied
  // host element with an iframe. The iframe inherits the host's initial classes.
  await page.route('https://www.youtube.com/iframe_api', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.YT = {
          PlayerState: { BUFFERING: 3, PLAYING: 1, CUED: 5 },
          Player: function (element, options) {
            var iframe = document.createElement('iframe');
            iframe.className = element.className;
            iframe.title = 'YouTube test player';
            iframe.dataset.played = 'false';
            element.replaceWith(iframe);
            var player = {
              playVideo: function () { iframe.dataset.played = 'true'; },
              destroy: function () { iframe.remove(); }
            };
            setTimeout(function () {
              options.events.onReady({ target: player, data: 0 });
            }, 0);
            return player;
          }
        };
        window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();
      `,
    });
  });

  await page.goto('/podcast', { waitUntil: 'commit' });
  await page.getByRole('button', { name: 'Play Visible video regression check' }).click();

  const player = page.locator('iframe[title="YouTube test player"]');
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute('data-played', 'true');
  await expect(player).toHaveCSS('opacity', '1');
});
