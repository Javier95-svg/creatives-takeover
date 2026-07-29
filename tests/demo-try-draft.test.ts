import test from "node:test";
import assert from "node:assert/strict";

import {
  readTryDraft,
  saveTryDraft,
  type TryDraft,
  type TryDraftV1,
} from "../src/lib/demoStudio/tryDraft.ts";

function installSessionStorage() {
  const values = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage },
  });
}

const step = {
  dataUrl: "data:image/jpeg;base64,AA==",
  title: "See the workflow",
  caption: "Move from problem to outcome.",
  speaker_notes: "Narrate the transition.",
  hotspot_label: "Next",
};

test("legacy v1 demo drafts restore as uploaded screenshot artifacts", () => {
  installSessionStorage();
  const legacy: TryDraftV1 = {
    v: 1,
    productName: "Legacy product",
    contextUrl: "",
    steps: [step],
  };

  assert.equal(saveTryDraft(legacy), true);
  assert.deepEqual(readTryDraft(), {
    ...legacy,
    v: 2,
    assetMode: "uploaded_screenshots",
  });
});

test("v2 demo drafts preserve generated-placeholder quality state", () => {
  installSessionStorage();
  const draft: TryDraft = {
    v: 2,
    productName: "Interview brief",
    contextUrl: "https://example.com",
    assetMode: "generated_placeholders",
    steps: [step],
  };

  assert.equal(saveTryDraft(draft), true);
  assert.deepEqual(readTryDraft(), draft);
});
