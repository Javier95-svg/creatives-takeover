import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getNextFounderProfileIndex,
  WHO_IS_THIS_FOR_ACCOUNT_TYPES,
  WHO_IS_THIS_FOR_AUTOPLAY_MS,
  WHO_IS_THIS_FOR_PROFILES,
} from "../src/components/whoIsThisForProfiles.ts";

test("the audience modal explains five account types and keeps two venture stages", () => {
  assert.equal(WHO_IS_THIS_FOR_AUTOPLAY_MS, 12_000);
  assert.deepEqual(WHO_IS_THIS_FOR_ACCOUNT_TYPES.map(({ id }) => id), ["founder", "builder", "mentor", "marketplace", "investor"]);
  assert.match(WHO_IS_THIS_FOR_ACCOUNT_TYPES[3].label, /Marketplace provider/);
  assert.deepEqual(WHO_IS_THIS_FOR_ACCOUNT_TYPES.map(({ access }) => access), ["open", "open", "invitation", "invitation", "open"]);
  assert.deepEqual(WHO_IS_THIS_FOR_ACCOUNT_TYPES.map(({ featured }) => featured), [true, true, false, false, false]);
  assert.match(WHO_IS_THIS_FOR_ACCOUNT_TYPES[2].next, /Invitation only/);
  assert.match(WHO_IS_THIS_FOR_ACCOUNT_TYPES[3].next, /Invitation only/);
  assert.match(WHO_IS_THIS_FOR_ACCOUNT_TYPES[4].next, /Create an account/);
  assert.equal(WHO_IS_THIS_FOR_PROFILES.length, 2);

  const [preBuild, postLaunch] = WHO_IS_THIS_FOR_PROFILES;
  assert.equal(preBuild.id, "pre_build");
  assert.equal(preBuild.headline, "You need evidence before you need code.");
  assert.equal(preBuild.indicators.length, 3);
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
  assert.equal(postLaunch.indicators.length, 3);
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
  const heroStyles = readFileSync(
    new URL("../src/components/hero-cinematic-spotlight.css", import.meta.url),
    "utf8",
  );

  assert.match(hero, /Who is this for\?/);
  assert.match(hero, /Who is this for\?[\s\r\n]*<\/button>/);
  assert.match(hero, /hero-who-is-this-for/);
  assert.match(hero, /setIsAudienceDialogOpen\(true\)/);
  assert.match(hero, /<WhoIsThisForDialog/);
  assert.doesNotMatch(hero, /handleStartupCycleClick|hero-startup-cycle-link/);

  assert.match(dialog, /Who is Creatives Takeover for\?/);
  assert.match(dialog, /Have an idea or a project\? Start here\./);
  assert.match(dialog, /Join as a Founder or Builder/);
  assert.match(dialog, /Investors can also create accounts\. Mentor and Marketplace provider accounts are invitation only\./);
  assert.match(dialog, /account\.featured/);
  assert.match(dialog, /Other ways to participate/);
  assert.match(dialog, /!account\.featured/);
  assert.match(dialog, /Founder &amp; Builder stages/);
  assert.match(dialog, /to="\/signup" onClick=\{handleJoinClick\}/);
  assert.match(dialog, /setIsPlaying\(false\)/);
  assert.doesNotMatch(dialog, /Choose the profile that most closely matches what you need to prove next\./);
  assert.match(dialog, /border-border\/70 bg-background p-0/);
  assert.doesNotMatch(dialog, /bg-background\/98/);
  assert.match(dialog, /usePrefersReducedMotion/);
  assert.match(dialog, /visibilitychange/);
  assert.match(dialog, /window\.setInterval/);
  assert.match(dialog, /Stop automatic profile rotation/);
  assert.match(dialog, /Resume automatic profile rotation/);
  assert.match(dialog, /Show previous founder profile/);
  assert.match(dialog, /Show next founder profile/);
  assert.match(dialog, /aria-live=\{isPlaying \? "off" : "polite"\}/);
  assert.match(dialog, /cta_name: "who_is_this_for_tool"/);

  assert.match(heroStyles, /\.ct-hero__audience-link\s*\{[\s\S]*?font-weight:\s*700;/);
  assert.doesNotMatch(heroStyles, /\.ct-hero__audience-link svg/);
});
