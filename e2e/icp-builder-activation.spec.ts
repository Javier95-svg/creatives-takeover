import { expect, test } from "@playwright/test";

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

const FAKE_SESSION = {
  access_token: "e2e-fake-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "e2e-fake-refresh-token",
  user: {
    id: "00000000-0000-4000-8000-000000000002",
    aud: "authenticated",
    role: "authenticated",
    email: "icp-e2e@example.com",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "ICP E2E" },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

test("a guest reads the whole ICP draft and can sign up to save it without leaving the page", async ({ page }) => {
  test.slow();
  // Keep unrelated authenticated workspace hydration deterministic. The
  // activation-specific handlers below are registered later and take priority.
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: route.request().method() === "HEAD" ? "" : "[]",
    }),
  );
  await page.route("**/functions/v1/**", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_MOCKED" }),
    }),
  );
  await page.route("**/auth/v1/token**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FAKE_SESSION),
    }),
  );
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FAKE_SESSION.user),
    }),
  );
  await page.route("**/functions/v1/icp-analyzer", async (route) => {
    const body = route.request().postDataJSON() as { operation?: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        status: "draft_ready",
        artifact: ARTIFACT,
        ...(body.operation === "save_existing_artifact" ? { analysisId: "icp-e2e-activation" } : {}),
      }),
    });
  });

  await page.route("**/rest/v1/icp_analysis_results**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "icp-e2e-activation",
        analysis_data: ARTIFACT,
        target_audience: ARTIFACT.draftDocument.customer.roleLine,
        business_description: ARTIFACT.founderInputs.fastDescription,
        verdict: "Promising",
      }),
    });
  });
  await page.route("**/rest/v1/profiles**", (route) => {
    if (route.request().method() !== "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }

    const profile = {
      id: FAKE_SESSION.user.id,
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
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(wantsObject ? profile : [profile]),
    });
  });
  await page.route("**/functions/v1/signup-direct", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ success: false, code: "UNAVAILABLE" }),
    }),
  );
  // The SDK adds ?redirect_to=..., so match any query string.
  await page.route("**/auth/v1/signup**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FAKE_SESSION),
    }),
  );

  await page.goto("/icp-builder", { waitUntil: "commit" });
  await page.getByRole("textbox").fill(
    "I am building a research workspace for small B2B SaaS product teams. They interview customers but keep evidence across call notes, spreadsheets, and Slack. Roadmap decisions are debated from memory and research gets repeated. The workspace links every customer signal to a product decision and its evidence.",
  );
  await page.getByRole("button", { name: /Generate my free draft/i }).click();

  // Since 2026-11-22 guests read the whole draft: what to build and the moat
  // are visible and interactive, not blurred behind the account.
  await page.getByRole("button", { name: /ICP draft/ }).click();
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
