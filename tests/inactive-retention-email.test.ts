import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildAuthenticatedReturnUrl,
  buildInactiveEmail,
  isInactiveSequence,
  selectReturnAnchor,
  type InactiveTouchIndex,
} from "../supabase/functions/_shared/inactive-retention-email.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const preferencesUrl = "https://creatives-takeover.com/login?return=%2Faccount%23notification-preferences";
const unsubscribeUrl = "https://creatives-takeover.com/unsubscribe?user_id=user&token=token";

test("only planned inactive sequences use the adaptive campaign", () => {
  for (const sequence of [
    "routine_reminder",
    "activation_day7",
    "weekly_digest",
    "reengagement",
    "reengagement_30d",
    "reengagement_60d",
  ]) {
    assert.equal(isInactiveSequence(sequence), true, sequence);
  }

  for (const sequence of ["activation_day0", "weekly_scorecard", "credit_warning", "celebration"]) {
    assert.equal(isInactiveSequence(sequence), false, sequence);
  }
});

test("return anchors prioritize trigger-specific routine, messages, artifacts, mentors, and calls", () => {
  const routine = selectReturnAnchor({
    sequence: "routine_reminder",
    routineGoal: "validate_idea",
    routineDaysSinceCheckin: 4,
    unreadMessageCount: 3,
    artifactPath: "/demo-studio/projects/one",
  });
  assert.equal(routine.kind, "routine");
  assert.equal(routine.path, "/dashboard/routine");
  assert.match(routine.resumeLine, /4 days ago/);

  const messages = selectReturnAnchor({
    sequence: "reengagement_30d",
    unreadMessageCount: 2,
    artifactPath: "/demo-studio/projects/one",
    savedMentorName: "A Mentor",
  });
  assert.equal(messages.kind, "messages");

  const artifact = selectReturnAnchor({
    sequence: "reengagement_30d",
    artifactLabel: "My product demo",
    artifactPath: "/demo-studio/projects/one",
    savedMentorName: "A Mentor",
  });
  assert.equal(artifact.kind, "artifact");
  assert.equal(artifact.path, "/demo-studio/projects/one");

  const mentor = selectReturnAnchor({ sequence: "reengagement_30d", savedMentorName: "A Mentor", hasDiscoveryCall: true });
  assert.equal(mentor.kind, "mentor");

  const call = selectReturnAnchor({ sequence: "reengagement_30d", hasDiscoveryCall: true });
  assert.equal(call.kind, "call");
});

test("unknown users receive a truthful capability fallback and external artifact paths are rejected", () => {
  const fallback = selectReturnAnchor({ sequence: "reengagement_60d" });
  assert.equal(fallback.kind, "capability");
  assert.equal(fallback.path, "/dashboard");

  const unsafe = selectReturnAnchor({
    sequence: "reengagement_30d",
    artifactLabel: "Saved project",
    artifactPath: "https://attacker.example/steal",
  });
  assert.equal(unsafe.kind, "artifact");
  assert.equal(unsafe.path, "/dashboard");
});

test("all four human-written touches are short, distinct, personal notes with one primary CTA", () => {
  const anchor = selectReturnAnchor({
    sequence: "routine_reminder",
    routineGoal: "launch_product",
    routineDaysSinceCheckin: 8,
  });
  const templateKeys = new Set<string>();

  for (const touchIndex of [1, 2, 3, 4] as InactiveTouchIndex[]) {
    const email = buildInactiveEmail({
      firstName: "Javier Alonso",
      touchIndex,
      anchor,
      ctaUrl: "https://creatives-takeover.com/login?return=%2Fdashboard%2Froutine",
      preferencesUrl,
      unsubscribeUrl,
    });

    templateKeys.add(email.templateKey);
    assert.ok(email.subject.length <= 55, email.subject);
    assert.doesNotMatch(email.subject, /Alonso/);
    assert.ok(email.text.split(/\s+/).filter(Boolean).length <= 120, email.text);
    assert.equal((email.html.match(/background:#0f172a/g) || []).length, 1);
    assert.doesNotMatch(email.html, /<h[1-6]|<ul|<li/i);
    assert.match(email.html, /Manage preferences/);
    assert.match(email.html, /unsubscribe/);
    assert.match(email.text, /Javier\nFounder, Creatives Takeover/);
  }

  assert.equal(templateKeys.size, 4);
});

test("saved artifact, unread message, pause, long-dormant, and no-context templates render without invented claims", () => {
  const cases = [
    selectReturnAnchor({ sequence: "reengagement", unreadMessageCount: 1 }),
    selectReturnAnchor({ sequence: "weekly_digest", artifactLabel: "Validation draft", artifactPath: "/decision-sprint" }),
    selectReturnAnchor({ sequence: "reengagement_30d" }),
  ];

  for (const anchor of cases) {
    for (const touchIndex of [1, 3, 4] as InactiveTouchIndex[]) {
      const email = buildInactiveEmail({
        firstName: "Sam",
        touchIndex,
        anchor,
        ctaUrl: "https://creatives-takeover.com/login?return=%2Fdashboard",
        preferencesUrl,
        unsubscribeUrl,
      });
      assert.doesNotMatch(email.text, /new mentors|new features|founders are|everyone is|limited time/i);
      assert.ok(email.preheader.length > 0);
      assert.ok(email.ctaLabel.length > 0);
    }
  }
});

test("authenticated CTA preserves the destination and attribution through login", () => {
  const logId = "11111111-1111-4111-8111-111111111111";
  const url = buildAuthenticatedReturnUrl({
    appUrl: "https://creatives-takeover.com",
    targetPath: "/dashboard/routine?day=today",
    logId,
    templateKey: "inactive_resume_routine",
  });
  const login = new URL(url);
  assert.equal(login.pathname, "/login");

  const returnPath = login.searchParams.get("return");
  assert.ok(returnPath);
  const destination = new URL(returnPath!, "https://creatives-takeover.com");
  assert.equal(destination.pathname, "/dashboard/routine");
  assert.equal(destination.searchParams.get("day"), "today");
  assert.equal(destination.searchParams.get("retention_email_id"), logId);
  assert.equal(destination.searchParams.get("utm_source"), "retention_email");
  assert.equal(destination.searchParams.get("utm_content"), "inactive_resume_routine");
});

test("migration provides atomic campaign state, pause, return reset, metrics, and cron cleanup", () => {
  const migration = read("../supabase/migrations/20260810140000_retention_email_quality.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.retention_campaign_state/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.claim_inactive_retention_email/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /claim_expires_at/);
  assert.match(migration, /now\(\) \+ interval '60 days'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.record_retention_email_return/);
  assert.match(migration, /touch_index = 0/);
  assert.match(migration, /An organic platform return is also a successful reset/);
  assert.match(migration, /public\.notif_pref_enabled/);
  assert.match(migration, /dormant-winback-daily/);
  assert.match(migration, /check-dormant-users-daily/);
  assert.match(migration, /meaningful_action_rate_pct/);
  assert.match(migration, /inactive_email_comparison/);
  assert.match(migration, /previous_30d/);
  assert.match(migration, /bounces_30d/);
  assert.match(migration, /complaints_30d/);
});

test("canonical sender and frontend enforce campaign claims and authenticated attribution", () => {
  const sender = read("../supabase/functions/send-retention-email/index.ts");
  const attribution = read("../src/components/RetentionEmailAttribution.tsx");
  const app = read("../src/App.tsx");
  const lifecycle = read("../supabase/functions/email-sequences/index.ts");

  assert.match(sender, /claim_inactive_retention_email/);
  assert.match(sender, /finalize_inactive_retention_email/);
  assert.match(sender, /fail_inactive_retention_email/);
  assert.match(sender, /RETENTION_REPLY_TO/);
  assert.match(sender, /Javier from Creatives Takeover/);
  assert.match(sender, /EMAIL_SEQUENCE_UNSUBSCRIBE_SECRET/);
  assert.match(attribution, /record_retention_email_return/);
  assert.match(app, /<RetentionEmailAttribution/);
  assert.match(lifecycle, /checkin_day7", filter: \(profile\) => wasActiveAfterSignup\(profile\)/);
  assert.doesNotMatch(lifecycle, /\{ day: 14, sequence: "reengagement_day14"/);
  assert.doesNotMatch(lifecycle, /\{ day: 30, sequence: "winback_day30"/);
});
