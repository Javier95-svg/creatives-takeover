import { expect, test, type Page } from '@playwright/test';

const encode = (value: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const authenticate = async (page: Page) => {
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
};

test('authenticated messages route survives unavailable V2 RPCs', async ({ page }) => {
  await authenticate(page);

  await page.route('**/rest/v1/rpc/get_inbox_v1*', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'RPC unavailable' }) })
  );
  await page.route('**/rest/v1/rpc/get_inbox_v2*', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'RPC unavailable' }) })
  );
  for (const table of ['conversations', 'conversation_user_settings', 'messages']) {
    await page.route(`**/rest/v1/${table}*`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/0' }, body: '[]' })
    );
  }

  await page.goto('/messages');
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await expect(page.getByText('Failed to load conversations. Please refresh the page.')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Chats', exact: true })).toBeVisible();
});

test('long inbox stays within the messages workspace frame', async ({ page }) => {
  await authenticate(page);
  const currentUserId = '11111111-1111-4111-8111-111111111111';
  const items = Array.from({ length: 14 }, (_, index) => {
    const suffix = String(index + 1).padStart(12, '0');
    const otherUserId = `22222222-2222-4222-8222-${suffix}`;
    return {
      id: `33333333-3333-4333-8333-${suffix}`,
      participants: [currentUserId, otherUserId],
      otherUser: { id: otherUserId, fullName: `Founder ${index + 1}`, username: `founder${index + 1}`, avatarUrl: null },
      lastMessageAt: new Date(Date.now() - index * 60_000).toISOString(),
      lastMessagePreview: `This intentionally long conversation preview ${index + 1} must remain inside the sidebar and finish with a visible ellipsis instead of being cut by the panel boundary`,
      unreadCount: 0,
      requestStatus: 'accepted',
      pinnedAt: null,
      mutedUntil: null,
      archivedAt: null,
      hiddenAt: null,
    };
  });

  const fulfillInbox = async (route: import('@playwright/test').Route) => {
    const body = route.request().postDataJSON() as { p_section?: string } | null;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body?.p_section === 'inbox' ? { items, nextCursor: null } : { items: [], nextCursor: null }),
    });
  };
  await page.route('**/rest/v1/rpc/get_inbox_v1*', fulfillInbox);
  await page.route('**/rest/v1/rpc/get_inbox_v2*', fulfillInbox);
  await page.route('**/rest/v1/user_presence*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.setViewportSize({ width: 1661, height: 765 });
  await page.goto('/messages');
  const workspace = page.locator('[aria-label="Messages workspace"], main .max-w-6xl').first();
  const lastFounder = page.getByText('Founder 14', { exact: true });
  await expect(workspace).toBeVisible();
  await expect(lastFounder).toHaveCount(1);
  const sidebar = workspace.locator('.w-80').first();
  const scrollArea = sidebar.locator('.min-h-0.flex-1').first();
  await expect(sidebar).toHaveCSS('overflow', 'hidden');
  const layout = await scrollArea.evaluate((element) => {
    const viewport = element.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    const sidebarElement = element.parentElement as HTMLElement;
    const workspaceElement = sidebarElement.closest('[aria-label="Messages workspace"], main .max-w-6xl') as HTMLElement;
    return {
      isScrollable: viewport.scrollHeight > viewport.clientHeight,
      sidebarBottom: sidebarElement.getBoundingClientRect().bottom,
      workspaceBottom: workspaceElement.getBoundingClientRect().bottom,
    };
  });
  expect(layout.isScrollable).toBe(true);
  expect(layout.sidebarBottom).toBeLessThanOrEqual(layout.workspaceBottom + 1);
  const firstPreview = page.getByTestId('conversation-preview').first();
  const previewLayout = await firstPreview.evaluate((element) => {
    const preview = element as HTMLElement;
    const sidebarElement = preview.closest('.w-80') as HTMLElement;
    const previewRect = preview.getBoundingClientRect();
    const sidebarRect = sidebarElement.getBoundingClientRect();
    const styles = getComputedStyle(preview);
    return {
      overflows: preview.scrollWidth > preview.clientWidth,
      textOverflow: styles.textOverflow,
      whiteSpace: styles.whiteSpace,
      previewRight: previewRect.right,
      sidebarRight: sidebarRect.right,
    };
  });
  expect(previewLayout.overflows).toBe(true);
  expect(previewLayout.textOverflow).toBe('ellipsis');
  expect(previewLayout.whiteSpace).toBe('nowrap');
  expect(previewLayout.previewRight).toBeLessThanOrEqual(previewLayout.sidebarRight - 8);
});

test('replies flow below a message image after the image loads', async ({ page }) => {
  await authenticate(page);
  const currentUserId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const conversationId = '33333333-3333-4333-8333-333333333333';
  const imageMessageId = '44444444-4444-4444-8444-444444444444';
  const replyMessageId = '55555555-5555-4555-8555-555555555555';
  const now = new Date();
  const conversation = {
    id: conversationId,
    participants: [currentUserId, otherUserId],
    otherUser: { id: otherUserId, fullName: 'Image Sender', username: 'image-sender', avatarUrl: null },
    lastMessageAt: now.toISOString(),
    lastMessagePreview: 'Thanks for the screenshot',
    unreadCount: 0,
    requestStatus: 'accepted',
    pinnedAt: null,
    mutedUntil: null,
    archivedAt: null,
    hiddenAt: null,
  };
  const messages = [
    {
      id: imageMessageId,
      conversation_id: conversationId,
      sender_id: otherUserId,
      content: 'Here is the screenshot',
      message_type: 'image',
      is_read: true,
      created_at: new Date(now.getTime() - 60_000).toISOString(),
      updated_at: new Date(now.getTime() - 60_000).toISOString(),
      deleted_at: null,
      edited_at: null,
      sender: { id: otherUserId, fullName: 'Image Sender', avatarUrl: null },
      attachment_rows: [{
        id: '66666666-6666-4666-8666-666666666666',
        message_id: imageMessageId,
        uploader_id: otherUserId,
        storage_path: 'regressions/tall-message-image.png',
        file_name: 'tall-message-image.png',
        mime_type: 'image/png',
        file_size: 1024,
        width: 480,
        height: 400,
      }],
      reaction_rows: [],
      receipt_rows: [],
    },
    {
      id: replyMessageId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: 'Thanks for the screenshot',
      message_type: 'text',
      is_read: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      deleted_at: null,
      edited_at: null,
      sender: { id: currentUserId, fullName: 'Runtime Test', avatarUrl: null },
      attachment_rows: [],
      reaction_rows: [],
      receipt_rows: [],
    },
  ];

  await page.route('**/rest/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  const fulfillInbox = async (route: import('@playwright/test').Route) => {
    const body = route.request().postDataJSON() as { p_section?: string } | null;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: body?.p_section === 'inbox' ? [conversation] : [], nextCursor: null }),
    });
  };
  await page.route('**/rest/v1/rpc/get_inbox_v1*', fulfillInbox);
  await page.route('**/rest/v1/rpc/get_inbox_v2*', fulfillInbox);
  await page.route('**/rest/v1/rpc/get_message_page_v1*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: messages, hasMore: false, oldestCursor: null }) })
  );
  await page.route('**/rest/v1/rpc/get_message_page_v2*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: messages, hasMore: false, oldestCursor: null }) })
  );
  await page.route('**/storage/v1/object/sign/message-attachments/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signedURL: '/object/sign/message-attachments/regressions/tall-message-image.png?token=test' }) })
  );
  await page.route('**/storage/v1/object/sign/message-attachments/regressions/tall-message-image.png?token=test', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="400"><rect width="480" height="400" fill="#345"/></svg>',
    });
  });

  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto(`/messages?conversationId=${conversationId}`);
  const image = page.getByRole('img', { name: 'tall-message-image.png' });
  await expect(image).toBeVisible();
  await expect(image).toHaveJSProperty('complete', true);

  const imageMessage = page.locator(`[data-message-id="${imageMessageId}"]`);
  const replyMessage = page.locator(`[data-message-id="${replyMessageId}"]`);
  await expect(imageMessage).toBeVisible();
  await expect(replyMessage).toBeVisible();
  await expect.poll(async () => {
    const imageBox = await imageMessage.boundingBox();
    const replyBox = await replyMessage.boundingBox();
    return imageBox && replyBox ? replyBox.y - (imageBox.y + imageBox.height) : -1;
  }).toBeGreaterThanOrEqual(0);
});

test('linked mentor identity overrides the generic public profile in messages', async ({ page }) => {
  await authenticate(page);
  const currentUserId = '11111111-1111-4111-8111-111111111111';
  const mentorUserId = '44444444-4444-4444-8444-444444444444';
  const conversation = {
    id: '55555555-5555-4555-8555-555555555555',
    participants: [currentUserId, mentorUserId],
    otherUser: { id: mentorUserId, fullName: 'Generic Profile Name', username: 'generic', avatarUrl: null },
    lastMessageAt: new Date().toISOString(),
    lastMessagePreview: 'Hello from a mentor',
    unreadCount: 0,
    requestStatus: 'accepted',
    pinnedAt: null,
    mutedUntil: null,
    archivedAt: null,
    hiddenAt: null,
  };
  const mentorPicture = 'https://images.example.invalid/mentor-profile.jpg';

  const fulfillMentorInbox = async (route: import('@playwright/test').Route) => {
    const body = route.request().postDataJSON() as { p_section?: string } | null;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: body?.p_section === 'inbox' ? [conversation] : [], nextCursor: null }),
    });
  };
  await page.route('**/rest/v1/rpc/get_inbox_v1*', fulfillMentorInbox);
  await page.route('**/rest/v1/rpc/get_inbox_v2*', fulfillMentorInbox);
  await page.route('**/rest/v1/mentors*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ user_id: mentorUserId, name: 'Mentor Profile Name', picture: mentorPicture }]),
    })
  );
  await page.route('**/rest/v1/user_presence*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route(mentorPicture, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/gif',
      body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64'),
    })
  );

  await page.goto('/messages');
  await expect(page.getByText('Mentor Profile Name', { exact: true })).toBeVisible();
  await expect(page.getByText('Generic Profile Name', { exact: true })).toHaveCount(0);
  await expect(page.locator(`img[src="${mentorPicture}"]`)).toHaveCount(1);
});
