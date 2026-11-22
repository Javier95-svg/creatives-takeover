import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const ARTIFACT = {
  version: 5,
  generatedAt: "2026-07-28T12:00:00.000Z",
  founderInputs: {
    mode: "fast",
    fastDescription: "A research workspace for small product teams interviewing customers before deciding what to build.",
    guided: null,
  },
  draftDocument: {
    gatePreview: {
      personaName: "Product Lead Priya",
      roleLine: "Product lead at an early-stage B2B SaaS company",
      painLine: "Customer interview evidence is scattered and rarely changes the roadmap.",
    },
    decisionBrief: {
      primarySegment: "Product leads at early-stage B2B SaaS companies",
      nonFitSegment: "Large research teams with a dedicated research repository",
      rankedPains: [
        { rank: 1, pain: "Evidence is scattered", evidence: "Founder hypothesis" },
        { rank: 2, pain: "Decisions are hard to audit", evidence: "Model inference" },
        { rank: 3, pain: "Insights arrive too late", evidence: "Model inference" },
      ],
      buyingTrigger: "A roadmap decision is challenged because nobody can find the supporting interviews.",
      currentAlternative: "Spreadsheets, call notes, and Slack",
      reachableChannels: ["Product communities", "Founder networks"],
      interviewValidationPlan: Array.from({ length: 5 }, (_, index) => ({
        step: index + 1,
        question: `Interview question ${index + 1}`,
        successSignal: "A recent, specific behavior",
      })),
    },
    customer: {
      personaName: "Product Lead Priya",
      roleLine: "Product lead at an early-stage B2B SaaS company",
      metaLine: "B2B SaaS · 5–30 people",
      summary: "Owns product decisions without a dedicated research operations team.",
      behaviors: ["Runs interviews", "Shares roadmap updates"],
      motivations: ["Make defensible decisions"],
      whereToFind: ["Product communities"],
      triggerContext: "A roadmap review exposes weak evidence.",
      actionTrigger: "A high-stakes build decision needs proof.",
      evidence: {
        confidence: "medium",
        evidence: "The segment comes from the founder's description.",
        missingSignalPrompt: "When did this last happen?",
        provenance: "founder_input",
        sourceIds: [],
      },
    },
    pain: {
      quote: "Customer interview evidence is scattered and rarely changes the roadmap.",
      rootCause: "Notes are stored by call instead of by decision.",
      whyItHurts: "The team repeats research and debates from memory.",
      triggerMoment: "A roadmap review asks for proof.",
      costOfInaction: "The team builds the wrong workflow.",
      evidence: {
        confidence: "medium",
        evidence: "The pain comes from the founder's statement.",
        missingSignalPrompt: "Find a recent example.",
        provenance: "founder_input",
        sourceIds: [],
      },
    },
    build: {
      valueProposition: "Turn interviews into decision-ready evidence.",
      replaces: ["Spreadsheets", "Scattered call notes"],
      coreFeatures: [{ title: "Evidence inbox", description: "Organize signals by decision." }],
      outcome: "A product lead can defend the next roadmap choice.",
      evidence: {
        confidence: "medium",
        evidence: "The recommendation is synthesized from founder input.",
        missingSignalPrompt: "Which decision matters first?",
        provenance: "model_inference",
        sourceIds: [],
      },
    },
    moat: {
      moatType: "Workflow focus",
      edge: "Connect every signal to a decision.",
      edgeSource: "Founder experience",
      whyHardToCopy: "Decision history compounds.",
      incumbentGap: "Repositories optimize for storage.",
      startupsToStudy: [],
      evidence: {
        confidence: "low",
        evidence: "The moat is inferred and needs validation.",
        missingSignalPrompt: "What compounds?",
        provenance: "model_inference",
        sourceIds: [],
      },
    },
    competition: {
      summary: "Research repositories serve larger teams.",
      directCompetitors: [],
      exploitableGap: "Decision-first evidence for small teams.",
      evidence: {
        confidence: "medium",
        evidence: "Market context is supported by a retrieved source.",
        missingSignalPrompt: "Interview switchers.",
        provenance: "external_source",
        sourceIds: ["source-1"],
      },
    },
    confidence: {
      level: "medium",
      summary: "The customer and pain are plausible, but interviews must verify urgency.",
      missingSignals: ["A recent buying trigger", "Evidence of switching"],
    },
    nextActions: Array.from({ length: 5 }, (_, index) => ({
      title: `Customer interview task ${index + 1}`,
      description: `Validate assumption ${index + 1}.`,
      route: "/dashboard/tasks",
    })),
    sources: [{
      sourceId: "source-1",
      type: "market",
      title: "Product research operations guide",
      url: "https://example.com/research-guide",
      detail: "Small teams struggle to operationalize interview evidence.",
    }],
  },
  dashboardContext: {
    message: "Start with customer interviews.",
    suggestedStage: "IDENTITY",
    prioritizedTasks: [],
    recommendations: [],
  },
  enrichment: {
    contradictionFlag: false,
    marketSignals: ["Small teams struggle to operationalize interview evidence."],
    mentorDomain: null,
  },
};

const encodeJwtPart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const NOW_SECONDS = Math.floor(Date.now() / 1000);
const FAKE_USER = {
  id: "00000000-0000-4000-8000-000000000002",
  aud: "authenticated",
  role: "authenticated",
  email: "icp-e2e@example.com",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "ICP E2E" },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
// JWT-shaped, so the auth client accepts it as a signed-in session.
const FAKE_SESSION = {
  access_token: `${encodeJwtPart({ alg: "HS256", typ: "JWT" })}.${encodeJwtPart({
    aud: "authenticated",
    exp: NOW_SECONDS + 3600,
    iat: NOW_SECONDS,
    sub: FAKE_USER.id,
    email: FAKE_USER.email,
    role: "authenticated",
  })}.e2e-signature`,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: NOW_SECONDS + 3600,
  refresh_token: "e2e-fake-refresh-token",
  user: FAKE_USER,
};

const IDEA =
  "I am building a research workspace for small B2B SaaS product teams. They interview customers but keep evidence across call notes, spreadsheets, and Slack. Roadmap decisions are debated from memory and research gets repeated. The workspace links every customer signal to a product decision and its evidence.";

const json = (body: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

/**
 * Backend mocks shared by every tab of the context. `confirmEmail` makes
 * sign-up behave as it does in production with "Confirm email" on: an account
 * with no session, and password sign-in refused until the link is clicked.
 */
async function mockBackend(context: BrowserContext, { confirmEmail = false } = {}) {
  const saves: string[] = [];
  // Keep unrelated authenticated workspace hydration deterministic. The
  // specific handlers below are registered later and take priority.
  await context.route("**/rest/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: route.request().method() === "HEAD" ? "" : "[]",
    }),
  );
  await context.route("**/functions/v1/**", (route) => route.fulfill(json({ code: "NOT_MOCKED" }, 404)));
  await context.route("**/auth/v1/token**", (route) =>
    route.fulfill(
      confirmEmail && route.request().url().includes("grant_type=password")
        ? json({ code: "email_not_confirmed", error_code: "email_not_confirmed", msg: "Email not confirmed" }, 400)
        : json(FAKE_SESSION),
    ),
  );
  await context.route("**/auth/v1/user", (route) => route.fulfill(json(FAKE_USER)));
  // The signed-in workspace shell waits for this before rendering the tool.
  await context.route("**/rest/v1/rpc/account_context**", (route) =>
    route.fulfill(json({
      userType: "founder",
      approvalStatus: "approved",
      hasCategoryAccess: true,
      roleProfile: {},
      requiresProject: false,
      hasProject: false,
      startupName: null,
      investorMatchVisible: false,
      investmentStage: null,
    })),
  );
  await context.route("**/auth/v1/logout**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**/functions/v1/icp-analyzer", async (route) => {
    const body = route.request().postDataJSON() as { operation?: string };
    if (body.operation === "save_existing_artifact") saves.push(route.request().url());
    await route.fulfill(json({
      success: true,
      status: "draft_ready",
      artifact: ARTIFACT,
      ...(body.operation === "save_existing_artifact" ? { analysisId: "icp-e2e-activation" } : {}),
    }));
  });
  await context.route("**/rest/v1/icp_analysis_results**", (route) => {
    const row = {
      id: "icp-e2e-activation",
      user_id: FAKE_USER.id,
      analysis_data: ARTIFACT,
      target_audience: ARTIFACT.draftDocument.customer.roleLine,
      business_description: ARTIFACT.founderInputs.fastDescription,
      verdict: "Promising",
      created_at: new Date().toISOString(),
    };
    const wantsObject = route.request().headers().accept?.includes("application/vnd.pgrst.object+json");
    return route.fulfill(json(wantsObject ? row : [row]));
  });
  // PMF Lab opens one evidence case per ICP draft.
  await context.route("**/rest/v1/prebuild_validation_contexts**", (route) => {
    const row = {
      id: "e2e-validation-context",
      user_id: FAKE_USER.id,
      icp_analysis_id: "icp-e2e-activation",
      label: null,
      is_explicitly_unscoped: false,
      status: "active",
      created_at: new Date().toISOString(),
    };
    const wantsObject = route.request().headers().accept?.includes("application/vnd.pgrst.object+json");
    return route.fulfill(json(wantsObject ? row : [row]));
  });
  await context.route("**/rest/v1/profiles**", (route) => {
    if (route.request().method() !== "GET") return route.fulfill(json([]));
    const profile = {
      id: FAKE_USER.id,
      onboarding_completed: false,
      onboarding_steps_completed: null,
      quiz_completed: false,
      quiz_current_stage: null,
      quiz_biggest_challenge: null,
      dashboard_bootstrap_source: "icp_unlock",
      subscription_tier: "free",
      user_preferences: {
        firstArtifactType: "icp_analysis",
        firstArtifactId: "icp-e2e-activation",
        firstArtifactResumeUrl: "/icp/draft/icp-e2e-activation",
      },
    };
    const wantsObject = route.request().headers().accept?.includes("application/vnd.pgrst.object+json");
    return route.fulfill(json(wantsObject ? profile : [profile]));
  });
  await context.route("**/functions/v1/signup-direct", (route) =>
    route.fulfill(json({ success: false, code: "UNAVAILABLE" }, 503)),
  );
  // The SDK adds ?redirect_to=..., so match any query string. With "Confirm
  // email" on, Supabase answers with the user and no session.
  await context.route("**/auth/v1/signup**", (route) =>
    route.fulfill(json(confirmEmail ? { ...FAKE_USER, confirmation_sent_at: new Date().toISOString() } : FAKE_SESSION)),
  );
  return { saves };
}

async function generateGuestDraft(page: Page) {
  await page.goto("/icp-builder", { waitUntil: "commit" });
  await page.getByRole("textbox").fill(IDEA);
  await page.getByRole("button", { name: /Generate my free draft/i }).click();
  await page.getByRole("button", { name: /ICP draft/ }).click();
}

const HANDOFF_KEY = "ct_icp_builder_email_handoff_v1";

test("a guest reads the whole ICP draft and can sign up to save it without leaving the page", async ({ page }) => {
  test.slow();
  await mockBackend(page.context());
  await generateGuestDraft(page);

  // Since 2026-11-22 guests read the whole draft: what to build and the moat
  // are visible and interactive, not blurred behind the account.
  await expect(page.getByText("Turn interviews into decision-ready evidence.").first()).toBeVisible();
  await expect(page.getByText("Decision history compounds.").first()).toBeVisible();
  await expect(page.locator("[inert]")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Product research operations guide/ }).first()).toHaveAttribute(
    "href",
    "https://example.com/research-guide",
  );

  // The ask is to save, and sign-up opens in place rather than on /signup.
  const saveCard = page.getByRole("region", { name: "Save this draft and get your next step" });
  await expect(saveCard).toBeVisible();
  await saveCard.getByRole("button", { name: "Save my draft" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/icp-builder/);

  // The dialog offers Google and an inline email form; neither leaves the page.
  await page.getByRole("button", { name: /Use email instead/i }).click();
  await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
  await expect(page.getByPlaceholder("Create a password")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
  await expect(page).toHaveURL(/\/icp-builder/);
});

test("an email sign-up confirmed in a new tab saves the guest draft there", async ({ context }) => {
  test.slow();
  const { saves } = await mockBackend(context, { confirmEmail: true });

  // Tab 1: the guest drafts, then signs up by email and is told to confirm.
  const guestTab = await context.newPage();
  await generateGuestDraft(guestTab);
  await guestTab
    .getByRole("region", { name: "Save this draft and get your next step" })
    .getByRole("button", { name: "Save my draft" })
    .click();
  await guestTab.getByRole("button", { name: /Use email instead/i }).click();
  await guestTab.getByPlaceholder("you@company.com").fill(FAKE_USER.email.toUpperCase());
  await guestTab.getByPlaceholder("Create a password").fill("a-long-e2e-password-1");
  await guestTab.getByRole("button", { name: /Continue with email/i }).click();
  await expect(guestTab).toHaveURL(/\/login/);
  const handoff = await guestTab.evaluate((key) => window.localStorage.getItem(key), HANDOFF_KEY);
  expect(JSON.parse(handoff ?? "null")).toMatchObject({ version: 1, email: FAKE_USER.email });
  await guestTab.close();

  // Tab 2: the confirmation link signs them in and lands on the unlock path,
  // with none of tab 1's session storage. The draft is saved here.
  const confirmedTab = await context.newPage();
  await confirmedTab.addInitScript((session) => {
    window.localStorage.setItem("sb-dummy-auth-token", JSON.stringify(session));
  }, FAKE_SESSION);
  await confirmedTab.goto("/icp-builder?unlock=1", { waitUntil: "commit" });
  await expect(confirmedTab).toHaveURL(/\/icp\/draft\/icp-e2e-activation/, { timeout: 45_000 });
  expect(saves).toHaveLength(1);
  // Single use: nothing is left for another tab or account to claim.
  expect(await confirmedTab.evaluate((key) => window.localStorage.getItem(key), HANDOFF_KEY)).toBeNull();
});

test("a different account on the same browser cannot take the draft", async ({ context }) => {
  test.slow();
  const { saves } = await mockBackend(context);
  const page = await context.newPage();
  await page.addInitScript(({ session, draft, key }) => {
    window.localStorage.setItem("sb-dummy-auth-token", JSON.stringify(session));
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      email: "someone-else@example.com",
      expiresAt: Date.now() + 60_000,
      session: {
        version: 5,
        sessionId: "other-account-draft",
        createdAt: Date.now(),
        expiresAt: Date.now() + 60_000,
        ownerUserId: null,
        mode: "fast",
        currentScreen: "draft_preview",
        fastDescription: "An idea from another account",
        guided: {},
        personaSuggestion: null,
        personaEditedSignificantly: false,
        draftPreview: draft,
        unlockRequired: true,
        savedAnalysisId: null,
        updatedAt: Date.now(),
      },
    }));
  }, { session: FAKE_SESSION, draft: ARTIFACT, key: HANDOFF_KEY });
  await page.goto("/icp-builder?unlock=1", { waitUntil: "commit" });
  await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1_500);
  expect(saves).toHaveLength(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), HANDOFF_KEY)).not.toBeNull();
});
