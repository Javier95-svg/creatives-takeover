import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

type GovernedEvent = {
  stage: string;
  owner: string;
  source: 'client' | 'server' | 'both';
  sourceFile: string;
  requiredProperties: string[];
};

type JourneyManifest = {
  schemaVersion: number;
  identity: {
    resetOnSignOut: boolean;
    prohibitedProperties: string[];
  };
  naming: {
    eventPattern: string;
    propertyPattern: string;
  };
  events: Record<string, GovernedEvent>;
  funnels: Array<{ key: string; steps: string[] }>;
  cohorts: Array<{
    key: string;
    definition: {
      event?: string;
      includedEvent?: string;
      excludedEvent?: string;
      baseCohort?: string;
    };
  }>;
  dashboards: Array<{
    key: string;
    insights: string[];
    externalMonitor?: string;
  }>;
  alerts: Array<{
    key: string;
    system: 'posthog' | 'supabase';
    event?: string;
    view?: string;
  }>;
};

const manifestUrl = new URL('../analytics/posthog/customer-journey.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as JourneyManifest;
const repoUrl = new URL('../', import.meta.url);

test('customer journey manifest is a complete, PII-safe event contract', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.identity.resetOnSignOut, true);

  const eventPattern = new RegExp(manifest.naming.eventPattern);
  const propertyPattern = new RegExp(manifest.naming.propertyPattern);
  const prohibited = new Set(manifest.identity.prohibitedProperties);
  const eventNames = Object.keys(manifest.events);

  assert.ok(eventNames.length >= 25, 'expected the critical journey taxonomy to be governed');

  for (const [eventName, definition] of Object.entries(manifest.events)) {
    assert.match(eventName, eventPattern, `${eventName} must use canonical snake_case`);
    assert.ok(definition.stage, `${eventName} must have a journey stage`);
    assert.ok(definition.owner, `${eventName} must have an owner`);
    assert.ok(['client', 'server', 'both'].includes(definition.source));

    const sourceUrl = new URL(definition.sourceFile.replaceAll('\\', '/'), repoUrl);
    assert.ok(existsSync(sourceUrl), `${eventName} source file must exist`);
    const source = readFileSync(sourceUrl, 'utf8');
    assert.ok(source.includes(eventName), `${eventName} must exist in ${definition.sourceFile}`);

    for (const property of definition.requiredProperties) {
      assert.match(property, propertyPattern, `${eventName}.${property} must use canonical naming`);
      assert.equal(prohibited.has(property), false, `${eventName}.${property} must not contain PII`);
      assert.ok(source.includes(property), `${eventName}.${property} must exist in ${definition.sourceFile}`);
    }
  }
});

test('funnels, cohorts, dashboards, and alerts only reference governed definitions', () => {
  const events = new Set(Object.keys(manifest.events));
  const funnels = new Set(manifest.funnels.map((funnel) => funnel.key));
  const cohorts = new Set(manifest.cohorts.map((cohort) => cohort.key));

  assert.equal(funnels.size, manifest.funnels.length, 'funnel keys must be unique');
  assert.equal(cohorts.size, manifest.cohorts.length, 'cohort keys must be unique');

  for (const funnel of manifest.funnels) {
    assert.ok(funnel.steps.length >= 2, `${funnel.key} needs at least two steps`);
    funnel.steps.forEach((event) => assert.ok(events.has(event), `${funnel.key} references ${event}`));
  }

  for (const cohort of manifest.cohorts) {
    for (const event of [
      cohort.definition.event,
      cohort.definition.includedEvent,
      cohort.definition.excludedEvent,
    ].filter(Boolean) as string[]) {
      assert.ok(events.has(event), `${cohort.key} references ${event}`);
    }
    if (cohort.definition.baseCohort) {
      assert.ok(cohorts.has(cohort.definition.baseCohort));
    }
  }

  for (const dashboard of manifest.dashboards) {
    dashboard.insights.forEach((insight) => {
      assert.ok(events.has(insight) || funnels.has(insight), `${dashboard.key} references ${insight}`);
    });
  }

  for (const alert of manifest.alerts) {
    if (alert.event) assert.ok(events.has(alert.event), `${alert.key} references ${alert.event}`);
    if (alert.view) {
      assert.ok(
        manifest.dashboards.some((dashboard) => dashboard.externalMonitor === alert.view),
        `${alert.key} monitor must be attached to a managed dashboard`,
      );
    }
  }
});

test('server delivery health is durable, aggregated, restricted, and non-blocking', () => {
  const emitter = readFileSync(
    new URL('../supabase/functions/_shared/analytics.ts', import.meta.url),
    'utf8',
  );
  const migration = readFileSync(
    new URL('../supabase/migrations/20260722150000_analytics_delivery_health.sql', import.meta.url),
    'utf8',
  );

  assert.match(emitter, /record_analytics_delivery_health/);
  assert.match(emitter, /status: 'sent'/);
  assert.match(emitter, /status: 'skipped'/);
  assert.match(emitter, /status: 'failed'/);
  assert.match(emitter, /await recordDeliveryHealth\(eventName, outcomes\)/);
  assert.match(emitter, /edgeRuntime\.waitUntil\(deliver\(\)\)/);

  assert.match(migration, /analytics_delivery_health_hourly/);
  assert.match(migration, /analytics_delivery_health_24h/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL[\s\S]*FROM anon, authenticated/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.doesNotMatch(migration, /user_id|distinct_id|email/);
});
