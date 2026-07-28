import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getNextFounderProfileIndex,
  WHO_IS_THIS_FOR_AUTOPLAY_MS,
  WHO_IS_THIS_FOR_PROFILES,
} from "../src/components/whoIsThisForProfiles.ts";

test("the audience modal defines the two approved founder profiles and tool paths", () => {
  assert.equal(WHO_IS_THIS_FOR_AUTOPLAY_MS, 5_000);
  assert.equal(WHO_IS_THIS_FOR_PROFILES.length, 2);

  const [preBuild, postLaunch] = WHO_IS_THIS_FOR_PROFILES;
  assert.equal(preBuild.id, "pre_build");
  assert.equal(preBuild.headline, "You need evidence before you need code.");
  assert.equal(preBuild.indicators.length, 5);
  assert.deepEqual(
    preBuild.tools.map((tool) => [tool.key, tool.href]),
    [
      ["icp_builder", "/icp-builder"],
      ["demo_studio", "/demo-studio/try"],
      ["pmf_lab", "/pmf-lab"],
    ],
  );

  assert.equal(postLaunch.id, "post_launch");
  assert.equal(postLaunch.headline, "You shipped. Now growth still depends on you.");
  assert.equal(postLaunch.indicators.length, 5);
  assert.deepEqual(
    postLaunch.tools.map((tool) => [tool.key, tool.href]),
    [
      ["gtm_strategist", "/go-to-market"],
      ["traction_engine", "/traction-engine"],
    ],
  );

  assert.equal(getNextFounderProfileIndex(0), 1);
  assert.equal(getNextFounderProfileIndex(1), 0);
});

test("the hero opens the audience dialog and the dialog preserves its accessibility controls", () => {
  const hero = readFileSync(new URL("../src/components/Hero.tsx", import.meta.url), "utf8");
  const dialog = readFileSync(
    new URL("../src/components/WhoIsThisForDialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(hero, /Who is this for\?/);
  assert.match(hero, /hero-who-is-this-for/);
  assert.match(hero, /setIsAudienceDialogOpen\(true\)/);
  assert.match(hero, /<WhoIsThisForDialog/);
  assert.doesNotMatch(hero, /handleStartupCycleClick|hero-startup-cycle-link/);

  assert.match(dialog, /Who is Creatives Takeover for\?/);
  assert.match(dialog, /usePrefersReducedMotion/);
  assert.match(dialog, /visibilitychange/);
  assert.match(dialog, /window\.setInterval/);
  assert.match(dialog, /Stop automatic profile rotation/);
  assert.match(dialog, /Resume automatic profile rotation/);
  assert.match(dialog, /Show previous founder profile/);
  assert.match(dialog, /Show next founder profile/);
  assert.match(dialog, /aria-live=\{isPlaying \? "off" : "polite"\}/);
  assert.match(dialog, /cta_name: "who_is_this_for_tool"/);
});
