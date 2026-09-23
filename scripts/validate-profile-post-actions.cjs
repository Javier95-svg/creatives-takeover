const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require('esbuild');
// This is a DOM interaction test; the optional native canvas addon is unused.
try { require.cache[require.resolve('canvas')] = { exports: {} }; } catch {}
const { JSDOM } = require('jsdom');

async function main() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://example.test/profile/alice', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Node', 'NodeFilter', 'DocumentFragment', 'MutationObserver', 'CustomEvent', 'Event', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
  }
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { act } = React;
  const { createRoot } = require('react-dom/client');
  const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
  const { MemoryRouter } = require('react-router-dom');
  const calls = [];
  let resolveReaction;
  let failReaction = false;
  let commentRows = [];
  let copied;
  let model = { source: 'journey', id: 'post-1', likes: 0, comments: 0, reposts: 0, liked: false, reposted: false };
  globalThis.__postTestAuth = { user: { id: 'viewer' } };
  globalThis.__postTestRpc = async (name, args) => {
    calls.push({ name, args });
    if (name === 'set_profile_post_reaction') {
      await new Promise((resolve) => { resolveReaction = resolve; });
      if (failReaction) return { error: new Error('Network error') };
      const flag = args.p_kind === 'like' ? 'liked' : 'reposted';
      const count = args.p_kind === 'like' ? 'likes' : 'reposts';
      model = { ...model, [flag]: args.p_active, [count]: args.p_active ? 1 : 0 };
    }
    if (name === 'list_profile_post_comments') return { data: commentRows, error: null };
    if (name === 'add_profile_post_comment') {
      commentRows = [{ id: args.p_comment_id, user_id: 'viewer', content: args.p_content, name: 'Viewer', created_at: new Date().toISOString() }];
      model = { ...model, comments: 1 };
    }
    return { data: null, error: null };
  };
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text) => { copied = text; } }, configurable: true });
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../src/components/profile/ProfilePostActions.tsx')],
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    alias: { '@': path.resolve(__dirname, '../src') },
    plugins: [{ name: 'test-backend', setup(builder) {
      builder.onResolve({ filter: /^@\/(contexts\/AuthContext|integrations\/supabase\/client)$/ }, (args) => ({ path: args.path, namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ contents: args.path.includes('AuthContext') ? 'export const useAuth = () => globalThis.__postTestAuth;' : 'export const supabase = { rpc: (...args) => globalThis.__postTestRpc(...args) };' }));
    } }],
  });
  const compiled = new Module(path.join(__dirname, 'profile-actions-test-bundle.cjs'), module);
  compiled.filename = path.join(__dirname, 'profile-actions-test-bundle.cjs');
  compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, compiled.filename);
  const { ProfilePostActions } = compiled.exports;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRoot(document.getElementById('root'));
  function render() {
    root.render(React.createElement(QueryClientProvider, { client }, React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(ProfilePostActions, {
      key: globalThis.__postTestAuth.user?.id || 'guest', source: 'journey', postId: 'post-1', metrics: model,
      shareUrl: 'https://example.test/profile/alice?post=journey:post-1', refresh: async () => render(),
    }))));
  }
  const button = (label) => document.querySelector(`button[aria-label="${label}"]`);
  const flush = () => new Promise((resolve) => setTimeout(resolve, 20));
  await act(async () => render());
  assert.equal(document.querySelector('[aria-label="Post actions"]').children.length, 4);
  assert.equal(calls.length, 0, 'comments are not fetched until opened');
  await act(async () => button('Like post').click());
  assert.equal(button('Unlike post').getAttribute('aria-pressed'), 'true', 'like responds before server confirmation');
  assert.equal(button('Unlike post').textContent, '1');
  await act(async () => { resolveReaction(); await flush(); });
  assert.equal(button('Unlike post').textContent, '1');
  failReaction = true;
  await act(async () => button('Unlike post').click());
  assert.equal(button('Like post').textContent, '0');
  await act(async () => { resolveReaction(); await flush(); });
  assert.equal(button('Unlike post').textContent, '1', 'failed mutations roll back');
  failReaction = false;
  await act(async () => button('Repost to your profile').click());
  assert.equal(button('Undo repost').textContent, '1');
  await act(async () => { resolveReaction(); await flush(); });
  await act(async () => { button('Comments').click(); await flush(); });
  assert.ok(calls.some((call) => call.name === 'list_profile_post_comments'));
  await act(async () => {
    const input = document.querySelector('textarea');
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(input, 'A helpful comment');
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  await act(async () => { document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); await flush(); });
  assert.ok(calls.some((call) => call.name === 'add_profile_post_comment' && call.args.p_content === 'A helpful comment'));
  assert.equal(document.querySelector('textarea').value, '');
  assert.ok(document.body.textContent.includes('A helpful comment'));
  await act(async () => button('Share post').click());
  assert.equal(copied, 'https://example.test/profile/alice?post=journey:post-1');
  globalThis.__postTestAuth = { user: null };
  await act(async () => render());
  const before = calls.length;
  await act(async () => button('Unlike post').click());
  assert.ok(document.body.textContent.includes('Join the conversation'));
  assert.equal(calls.length, before, 'guest interactions request sign-in without a mutation');
  await act(async () => root.unmount());
  client.clear();
  dom.window.close();
  console.log('PASS: four actions, optimistic feedback, rollback, repost, lazy comments, comment submission, share link, guest sign-in');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
