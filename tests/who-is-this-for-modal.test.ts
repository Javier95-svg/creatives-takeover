import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  WHO_IS_THIS_FOR_ACCOUNT_TYPES,
  WHO_IS_THIS_FOR_PROFILES,
} from "../src/components/whoIsThisForProfiles.ts";

test("the audience modal has five plain-language account types and two venture stages", () => {
  assert.deepEqual(WHO_IS_THIS_FOR_ACCOUNT_TYPES.map(({ id }) => id), ["founder", "builder", "mentor", "marketplace", "investor"]);
  assert.equal(WHO_IS_THIS_FOR_ACCOUNT_TYPES[3].label, "Marketplace");
  assert.deepEqual(WHO_IS_THIS_FOR_ACCOUNT_TYPES.map(({ access }) => access), ["open", "open", "invitation", "invitation", "open"]);
  assert.match(WHO_IS_THIS_FOR_ACCOUNT_TYPES[0].promise, /I have a project/);
  assert.match(WHO_IS_THIS_FOR_ACCOUNT_TYPES[1].promise, /I have an idea/);
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

});

test("the hero opens three separate audience tabs with a visual account guide", () => {
  const hero = readFileSync(new URL("../src/components/Hero.tsx", import.meta.url), "utf8");
  const dialog = readFileSync(
    new URL("../src/components/WhoIsThisForDialog.tsx", import.meta.url),
    "utf8",
  );
  const accountPanel = readFileSync(
    new URL("../src/components/WhoIsThisForAccountTypes.tsx", import.meta.url),
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
  assert.match(dialog, /\["Account types", "Pre-build", "Post-launch"\]/);
  assert.match(dialog, /role="tablist"/);
  assert.match(dialog, /role="tab"/);
  assert.match(dialog, /aria-selected=\{activeIndex === index\}/);
  assert.match(dialog, /activeIndex === 0 \? \(/);
  assert.match(dialog, /<WhoIsThisForAccountTypes/);
  assert.match(dialog, /\{profile \? <div id=\{`audience-panel-/);
  assert.doesNotMatch(dialog, /Have an idea or a project\? Start here\./);
  assert.match(dialog, /border-border\/70 bg-background p-0/);
  assert.doesNotMatch(dialog, /sticky bottom-0/);
  assert.match(dialog, /cta_name: "who_is_this_for_tool"/);

  assert.match(accountPanel, /Bring your idea\. Find out what to do next\./);
  // The banner shows how accounts open, not the idea-to-growth steps that
  // made it look like the pre-build banner.
  assert.match(accountPanel, /How accounts open/);
  assert.match(accountPanel, /ACCESS_GROUPS/);
  assert.match(accountPanel, /Account types at Creatives Takeover/);
  assert.match(accountPanel, /ROLE_ICONS/);
  assert.match(accountPanel, /ROLE_STYLES/);
  assert.match(accountPanel, /aria-pressed=\{selectedCard\}/);
  assert.match(accountPanel, /Invitation only/);
  assert.match(accountPanel, /selected\.access === "open"/);
  assert.match(accountPanel, /to="\/signup"/);

  assert.match(heroStyles, /\.ct-hero__audience-link\s*\{[\s\S]*?font-weight:\s*700;/);
  assert.doesNotMatch(heroStyles, /\.ct-hero__audience-link svg/);
});
