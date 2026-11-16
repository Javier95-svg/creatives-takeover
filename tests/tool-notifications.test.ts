import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NOTIFICATION_TOOLS, notificationTool, toolNotificationText } from '../src/lib/toolNotifications.ts';

test('tool notifications are recognised by metadata.tool, older ones by their type, and nothing else is', () => {
  assert.equal(notificationTool({ notification_type: 'customer_research_ready', metadata: {} }), 'gtm_strategist', 'sent before metadata.tool existed');
  assert.equal(notificationTool({ notification_type: 'customer_research_ready', metadata: { tool: 'gtm_strategist' } }), 'gtm_strategist');
  assert.equal(notificationTool({ notification_type: 'icp_draft_ready', metadata: { tool: 'icp_builder' } }), 'icp_builder', 'any tool can name itself');
  assert.equal(notificationTool({ notification_type: 'like', metadata: {} }), null, 'people stay people');
  assert.equal(notificationTool({ notification_type: 'platform_update', metadata: { route: '/icp-builder' } }), null, 'announcements keep their own image');
  assert.equal(notificationTool({ notification_type: 'x', metadata: { tool: 'not_a_tool' } }), null);
  assert.deepEqual(Object.values(NOTIFICATION_TOOLS).map((tool) => tool.name), ['ICP Builder', 'Demo Studio', 'PMF Lab', 'MVP Builder', 'GTM Strategist', 'Traction Engine']);
});

test('the tool name leads the text, once', () => {
  assert.equal(toolNotificationText('gtm_strategist', '22 companies are ready to contact for Early-Stage Startup Incubators'),
    'GTM Strategist: 22 companies are ready to contact for Early-Stage Startup Incubators');
  assert.equal(toolNotificationText('gtm_strategist', 'GTM Strategist: done'), 'GTM Strategist: done');
});

test('the bell shows the tool icon instead of the photo, and GTM tags its notifications', () => {
  const bell = readFileSync(new URL('../src/components/community/NotificationBell.tsx', import.meta.url), 'utf8');
  assert.match(bell, /\{tool \? <ToolNotificationIcon tool=\{tool\} \/> : \(/);
  assert.match(bell, /toolNotificationText\(tool, getNotificationText\(notification\)\)/);
  const pipeline = readFileSync(new URL('../supabase/functions/_shared/gtm-research-pipeline.ts', import.meta.url), 'utf8');
  assert.match(pipeline, /notification_type: "customer_research_ready",[\s\S]{0,300}tool: "gtm_strategist"/);
});
