import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { platformUpdates } from "../src/lib/workspacePolicy.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the Startup Pedia launch notification reaches the workspace updates card", () => {
  const updates = platformUpdates([
    {
      id: "n1",
      notification_type: "platform_update",
      created_at: "2026-10-25T23:42:22Z",
      metadata: {
        slug: "startup-pedia-launch-20261025",
        title: "New section: Startup Pedia",
        message: "New section: Startup Pedia is now available in Bonus.",
        route: "/startup-pedia",
      },
    },
  ]);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].section, "Startup Pedia");
  assert.equal(updates[0].route, "/startup-pedia");
});

test("dismissing the updates card hides only the updates seen so far", () => {
  // Keyed on the session alone, one dismissal hid every later update until the
  // next sign-in, so the Startup Pedia launch never showed.
  const session = read("src/components/WorkspaceUpdatesSession.tsx");
  assert.match(session, /const dismissalKey = `\$\{sessionId\}:\$\{latestId\}`/);
  assert.match(session, /localStorage\.setItem\(storageKey, dismissalKey\)/);
  assert.match(read("src/components/workspace/WorkspaceLive.tsx"), /<WorkspaceUpdatesSession latestId=\{updates\[0\]\.id\}>/);
});
