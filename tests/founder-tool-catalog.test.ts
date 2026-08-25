import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FOUNDER_TOOL_CATALOG,
  FOUNDER_TOOLS_BY_KEY,
  getCoreFounderToolsForStage,
  getFounderToolsForProduct,
} from '../src/config/founderToolCatalog.ts';

test('canonical catalog has unique keys, routes, and analytics keys', () => {
  for (const field of ['key', 'route', 'analyticsKey'] as const) {
    const values = FOUNDER_TOOL_CATALOG.map((tool) => tool[field]);
    assert.equal(new Set(values).size, values.length, `${field} must be unique`);
  }
});

test('BizMap and Insighta ownership follows the PMF journey', () => {
  assert.deepEqual(
    getFounderToolsForProduct('bizmap').filter((tool) => tool.role === 'core').map((tool) => tool.key),
    ['icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'directories'],
  );
  assert.equal(FOUNDER_TOOLS_BY_KEY.traction_engine.productArea, 'insighta');
  assert.equal(FOUNDER_TOOLS_BY_KEY.traction_engine.stage, 'TRACTION');
  assert.equal(FOUNDER_TOOLS_BY_KEY.tech_stack.role, 'support');
  assert.equal(FOUNDER_TOOLS_BY_KEY.directories.role, 'core');
  assert.equal(FOUNDER_TOOLS_BY_KEY.first_customer_sprint.role, 'support');
  assert.deepEqual(
    getCoreFounderToolsForStage('FUNDRAISING').map((tool) => tool.key),
    ['vc_search', 'pitch_deck_analyzer', 'insighta_test'],
  );
  assert.equal(FOUNDER_TOOLS_BY_KEY.insighta_test.stage, 'FUNDRAISING');
});

test('canonical visible names are standardized', () => {
  assert.equal(FOUNDER_TOOLS_BY_KEY.traction_engine.name, 'Traction Engine');
  assert.equal(FOUNDER_TOOLS_BY_KEY.tech_stack.name, 'Tech Stack Builder');
  assert.equal(FOUNDER_TOOLS_BY_KEY.insighta_test.name, 'Insighta Test');
});

test('navigation, dashboard, pricing, SEO, FAQs, and Pulse consume the catalog contract', () => {
  const catalogConsumers = [
    '../src/components/Navigation.tsx',
    '../src/config/dashboardToolRegistry.ts',
    '../src/components/PricingComparison.tsx',
    '../src/pages/Blog.tsx',
    '../src/config/pulseRoutes.ts',
  ];

  for (const relativePath of catalogConsumers) {
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    assert.match(source, /founderToolCatalog/, `${relativePath} must consume the canonical catalog`);
  }

  const faq = readFileSync(new URL('../src/components/SearchableFAQ.tsx', import.meta.url), 'utf8');
  assert.match(faq, /What is Insighta Test\?/);
  assert.doesNotMatch(faq, /Insighta Test is our landing page and value proposition testing tool/);
});
