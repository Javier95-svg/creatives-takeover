import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Local UI-only checks. Fixture mode is injected into the test page, never
// shipped or represented as live application data.
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : process.platform === 'win32' ? { executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' } : {}) });
await mkdir('artifacts/pulse-home', { recursive: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => { errors.push(error.message); console.error('Page error:', error.message); });
try {
  for (const concept of ['founder-guide', 'command-center', 'guided-journey']) {
    for (const theme of ['dark', 'light']) {
      for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
        await page.setViewportSize(viewport);
        await page.goto(`http://127.0.0.1:8080/prototypes/${concept}`);
        await page.getByRole('heading', { level: 1 }).waitFor();
        await page.evaluate(theme => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, theme);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const composer = await page.getByRole('textbox', { name: 'Message Pulse' }).boundingBox();
        assert.ok(composer && composer.y > 0 && composer.y + composer.height < viewport.height);
        await page.getByRole('searchbox', { name: 'Search accounts by first name, last name or username' }).waitFor({ state: 'visible' });
        await page.screenshot({ path: `artifacts/pulse-home/${concept}-${theme}-${viewport.width}.png` });
      }
    }
  }
  // Browser zoom can put desktop layouts inside the global tablet breakpoint.
  // Verify actual computed typography there, not only desktop screenshots.
  for (const width of [780, 820, 1024]) {
    await page.setViewportSize({ width, height: 600 });
    await page.goto('http://127.0.0.1:8080/prototypes/founder-guide');
    await page.locator('.pulse-home-headline').waitFor();
    const sizes = await page.evaluate(() => ({
      title: parseFloat(getComputedStyle(document.querySelector('.pulse-home-headline')).fontSize),
      description: parseFloat(getComputedStyle(document.querySelector('.pulse-home-input-hint')).fontSize),
    }));
    assert.ok(sizes.title / sizes.description >= 3, `Hero hierarchy at ${width}px: ${JSON.stringify(sizes)}`);
    assert.equal(await page.locator('.pulse-home-signature').count(), 0);
    assert.equal(await page.locator('.pulse-home-subtitle').count(), 0);
    assert.equal(await page.getByRole('textbox', { name: 'Message Pulse' }).getAttribute('placeholder'), "What's in Your Mind Today?");
    assert.equal(await page.locator('.pulse-home-wave span').first().evaluate(el => getComputedStyle(el).animationName), 'pulse-home-wave-idle');
    await page.screenshot({ path: `artifacts/pulse-home/hero-tablet-${width}.png` });
    const backdrop = await page.locator('.pulse-home-wallpaper').boundingBox();
    await page.locator('.pulse-home-content').evaluate(el => { el.scrollTop = el.scrollHeight; });
    assert.ok(await page.locator('.pulse-home-content').evaluate(el => el.scrollTop > 0));
    assert.deepEqual(await page.locator('.pulse-home-wallpaper').boundingBox(), backdrop, 'Wallpaper must remain behind the entire visible panel while scrolling');
    await page.screenshot({ path: `artifacts/pulse-home/shortcuts-tablet-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:8080/prototypes/founder-guide');
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.equal(await page.locator('.pulse-home-glow').first().evaluate(el => getComputedStyle(el).animationName), 'none');
  assert.equal(await page.locator('.pulse-home-wave span').first().evaluate(el => getComputedStyle(el).animationName), 'none');
  const shortcuts = page.getByRole('navigation', { name: 'Quick starts' });
  assert.equal(await shortcuts.getByRole('link').count(), 8);
  for (const [label, route] of [
    ['Help me define my customer', '/icp-builder'], ['Find me a mentor', '/mentorship'],
    ['Find me a co-founder', '/co-founder/create'], ['What should I focus on next?', '/dashboard'],
    ['Help me create a demo', '/demo-studio'], ['Help me validate my idea', '/pmf-lab'],
    ['Help me build my MVP', '/mvp-builder'], ['Help me plan my launch', '/go-to-market'],
  ]) assert.equal(await shortcuts.getByRole('link', { name: label, exact: true }).getAttribute('href'), route);
  await shortcuts.getByRole('link', { name: 'Help me define my customer', exact: true }).click();
  await page.waitForURL('**/icp-builder');
  assert.equal(await page.locator('.workspace-shell').count(), 0, 'Preview navigation must not enable a production shell while signed out');
  await page.goto('http://127.0.0.1:8080/prototypes/founder-guide');
  await page.getByRole('textbox', { name: 'Message Pulse' }).focus();
  assert.equal(await page.getByRole('textbox', { name: 'Message Pulse' }).inputValue(), '');
  assert.equal(await page.getByRole('textbox', { name: 'Message Pulse' }).evaluate(el => el === document.activeElement), true);

  await page.evaluate(async () => {
    const loadedModule = file => performance.getEntriesByType('resource').map(entry => entry.name).find(url => url.includes(`/node_modules/.vite/deps/${file}?`));
    const reactModule = await import(loadedModule('react.js') || '/node_modules/.vite/deps/react.js');
    const React = reactModule.default ?? reactModule;
    const clientModule = await import(loadedModule('react-dom_client.js') || '/node_modules/.vite/deps/react-dom_client.js');
    const { createRoot } = clientModule.default ?? clientModule;
    const { PulseHomeView } = await import('/src/components/pulse/PulseHomeView.tsx');
    const home = document.querySelector('[aria-label="Pulse home"]');
    home.style.display = 'none';
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;flex:1;min-height:0';
    home.parentElement.append(container);
    function Fixture() {
      const [messages, setMessages] = React.useState([]);
      return React.createElement(PulseHomeView, { concept: 'founder-guide', name: 'QA fixture', priorities: [{ id: 'one', title: 'Review customer interviews', route: '/dashboard/tasks' }], messages,
        onSend: content => setMessages([{ id: 'user', role: 'user', content }, { id: 'assistant', role: 'assistant', content: 'Fixture response: define the customer and pain before testing your assumptions.', actions: [{ kind: 'tool', id: 'icp_builder', title: 'ICP Builder', reason: 'Define your customer.', route: '/icp-builder' }] }]),
        onNew: () => setMessages([]),
      });
    }
    createRoot(container).render(React.createElement(Fixture));
  });
  await page.waitForFunction(() => document.querySelectorAll('[aria-label="Message Pulse"]').length === 2);
  await page.getByRole('textbox', { name: 'Message Pulse' }).last().fill('Who is my customer?');
  await page.getByRole('textbox', { name: 'Message Pulse' }).last().press('Enter');
  const chat = page.getByRole('log', { name: 'Conversation with Pulse' });
  await chat.waitFor();
  assert.match(await chat.innerText(), /Who is my customer/);
  const priorities = page.getByRole('button', { name: 'Today’s priorities' });
  assert.equal(await priorities.getAttribute('aria-expanded'), 'false');
  await priorities.click();
  assert.equal(await priorities.getAttribute('aria-expanded'), 'true');
  assert.equal(await chat.getByRole('link').getAttribute('href'), '/icp-builder');
  await page.screenshot({ path: 'artifacts/pulse-home/conversation-fixture.png' });
  await page.getByRole('button', { name: 'New conversation' }).click();
  assert.equal(await chat.count(), 0);
  await page.getByRole('textbox', { name: 'Message Pulse' }).last().fill('Who is my customer?');
  await page.getByRole('textbox', { name: 'Message Pulse' }).last().press('Enter');
  await page.getByRole('log').getByRole('link').click();
  await page.waitForURL('**/icp-builder');
  await page.getByRole('heading', { name: /Application configuration required/ }).waitFor();
  assert.equal(await page.locator('.workspace-shell').count(), 0);
  for (const width of [375, 390, 767]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('http://127.0.0.1:8080/prototypes/founder-guide');
    await page.getByRole('button', { name: 'Open navigation', exact: true }).waitFor();
    assert.equal(await page.getByRole('navigation', { name: 'Product navigation' }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await page.getByRole('link', { name: 'Referrals', exact: true }).waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('link', { name: 'Referrals', exact: true }).getAttribute('href'), '/dashboard/referral');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Search accounts', exact: true }).click();
    await page.getByRole('searchbox').fill('QA');
    const results = await page.getByLabel('Account search results').boundingBox();
    assert.ok(results && results.x >= 0 && results.x + results.width <= width, 'Mobile search fits the screen');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `artifacts/pulse-home/workspace-mobile-${width}.png` });
  }
  await page.evaluate(() => sessionStorage.setItem('ct-workspace-preview', 'founder-guide'));
  await page.goto('http://127.0.0.1:8080/');
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  assert.equal(await page.locator('.workspace-shell').count(), 0, 'Stale preview storage cannot replace marketing');
  assert.equal(await page.locator('[aria-label="Pulse home"]').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: 12 desktop layouts; tablet typography; 3 mobile drawers/search layouts; reduced motion; composer; conversation fixture; navigation and signed-out preview-storage isolation.');
} finally { await browser.close(); }
