export type EntryMode = "fast" | "guided";

export interface GuidedInput {
  seed: string;
  persona: {
    role: string;
    industry: string;
    experience: string;
  };
  specificity?: string;
  pain: string;
  workaround: string;
  solutionCompletion?: string;
  marketContext?: "different_customer" | "too_expensive_or_complex" | "manual_or_no_product" | "new_problem_recently";
  founderEdge?: string;
}

export interface FastInput {
  description: string;
}

export interface DraftRequestShape {
  entryMode: EntryMode;
  fastInput?: FastInput | null;
  guidedInput?: GuidedInput | null;
  personaEditedSignificantly?: boolean;
}

export interface DraftSource {
  type: "community" | "competitor" | "market";
  title: string;
  url: string | null;
  detail: string | null;
}

export interface DraftEnrichment {
  marketSignals: string[];
  competitorLinks: Array<{ name: string; url: string | null }>;
  sources: DraftSource[];
}

type SectionConfidence = "high" | "medium" | "low";

type SectionEvidence = {
  confidence: SectionConfidence;
  evidence: string;
  missingSignalPrompt: string | null;
};

type DraftDocument = {
  gatePreview: {
    personaName: string;
    roleLine: string;
    painLine: string;
  };
  customer: {
    personaName: string;
    roleLine: string;
    metaLine: string;
    summary: string;
    behaviors: string[];
    motivations: string[];
    whereToFind: string[];
    triggerContext: string;
    actionTrigger: string;
    evidence: SectionEvidence;
  };
  pain: {
    quote: string;
    rootCause: string;
    whyItHurts: string;
    triggerMoment: string;
    costOfInaction: string;
    evidence: SectionEvidence;
  };
  build: {
    valueProposition: string;
    replaces: string[];
    coreFeatures: Array<{ title: string; description: string }>;
    outcome: string;
    evidence: SectionEvidence;
  };
  moat: {
    moatType: string;
    edge: string;
    edgeSource: string;
    whyHardToCopy: string;
    incumbentGap: string;
    startupsToStudy: Array<{ name: string; url: string | null }>;
    evidence: SectionEvidence;
  };
  competition: {
    summary: string;
    directCompetitors: Array<{ name: string; url: string | null; doesWell: string; gap: string }>;
    exploitableGap: string;
    evidence: SectionEvidence;
  };
  confidence: {
    level: SectionConfidence;
    summary: string;
    missingSignals: string[];
  };
  nextActions: Array<{ title: string; description: string; route: string }>;
  sources: DraftSource[];
};

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeConfidence(value: unknown, fallback: SectionConfidence = "medium"): SectionConfidence {
  return value === "high" || value === "medium" || value === "low" ? value : fallback;
}

function normalizeList(value: unknown, maxItems = 5) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => item.trim());
}

function normalizeRoutes(route: unknown, fallback: string) {
  const value = typeof route === "string" ? route.toLowerCase() : "";
  if (value.includes("pmf")) return "/pmf-lab";
  if (value.includes("waitlist")) return "/demo-studio";
  if (value.includes("mvp")) return "/mvp-builder";
  if (value.includes("gtm") || value.includes("go-to-market")) return "/go-to-market";
  if (value.includes("mentor")) return "/mentorship/mentor-marketplace";
  return fallback;
}

function buildSectionEvidence(
  value: Partial<SectionEvidence> | null | undefined,
  fallback: {
    confidence?: SectionConfidence;
    evidence: string;
    missingSignalPrompt?: string | null;
  },
): SectionEvidence {
  return {
    confidence: normalizeConfidence(value?.confidence, fallback.confidence ?? "medium"),
    evidence: cleanText(value?.evidence, fallback.evidence),
    missingSignalPrompt:
      typeof value?.missingSignalPrompt === "string" ? value.missingSignalPrompt : fallback.missingSignalPrompt ?? null,
  };
}

function inferNamedAlternatives(text: string) {
  const segments = text
    .split(/,|\/|\+|\band\b/gi)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 2);

  return Array.from(new Set(segments)).slice(0, 5);
}

function describeMarketContext(value: GuidedInput["marketContext"] | null | undefined) {
  switch (value) {
    case "different_customer":
      return "Existing solutions target a different customer profile.";
    case "too_expensive_or_complex":
      return "Existing solutions are too expensive or too complex for this niche.";
    case "manual_or_no_product":
      return "Customers still solve this manually or with stitched-together workflows.";
    case "new_problem_recently":
      return "The problem has become urgent only recently.";
    default:
      return "Market context is still unclear.";
  }
}

function buildFounderEvidence(request: DraftRequestShape) {
  if (request.entryMode === "guided" && request.guidedInput) {
    const guided = request.guidedInput;
    const namedAlternatives = inferNamedAlternatives(guided.workaround);
    const missingSignals = [
      namedAlternatives.length === 0 ? "No named alternatives were provided." : null,
      guided.founderEdge.trim().length < 20 ? "Founder edge may still be too broad." : null,
    ].filter((value): value is string => Boolean(value));

    return {
      entryMode: "guided" as const,
      founderLanguageAnchor: guided.seed,
      role: guided.persona.role,
      industry: guided.persona.industry,
      experience: guided.persona.experience,
      segment: guided.specificity,
      pain: guided.pain,
      workaround: guided.workaround,
      namedAlternatives,
      solutionDirection: guided.solutionCompletion,
      founderEdge: guided.founderEdge,
      marketContext: describeMarketContext(guided.marketContext),
      missingSignals,
      personaEditedSignificantly: Boolean(request.personaEditedSignificantly),
    };
  }

  const description = request.fastInput?.description?.trim() || "";
  const missingSignals = [
    description.length < 140 ? "Founder description is relatively short." : null,
    /\b(competitor|asana|clickup|notion|excel|spreadsheet|email|whatsapp|slack)\b/i.test(description)
      ? null
      : "No clear current alternative is named in the founder description.",
  ].filter((value): value is string => Boolean(value));

  return {
    entryMode: "fast" as const,
    founderLanguageAnchor: description,
    role: "",
    industry: "",
    experience: "",
    segment: "",
    pain: "",
    workaround: "",
    namedAlternatives: inferNamedAlternatives(description),
    solutionDirection: "",
    founderEdge: "",
    marketContext: "Market context must be inferred from the founder description.",
    missingSignals,
    personaEditedSignificantly: false,
  };
}

function buildDraftPrompt(request: DraftRequestShape, enrichment: DraftEnrichment) {
  const evidence = buildFounderEvidence(request);
  const competitorBlock = enrichment.competitorLinks.length > 0
    ? enrichment.competitorLinks.map((item) => `- ${item.name}${item.url ? ` (${item.url})` : ""}`).join("\n")
    : "- No reliable competitor links were found from enrichment.";
  const marketSignalBlock = enrichment.marketSignals.length > 0
    ? enrichment.marketSignals.map((signal) => `- ${signal}`).join("\n")
    : "- No external market signals were available for this run.";
  const sourceBlock = enrichment.sources.length > 0
    ? enrichment.sources
        .map((source) => `- [${source.type}] ${source.title}${source.detail ? ` (${source.detail})` : ""}${source.url ? ` — ${source.url}` : ""}`)
        .join("\n")
    : "- No real evidence sources were retrieved for this run.";

  return `You are generating a founder-ready ICP Draft strong enough to replace a paid strategy session.
Return valid JSON only.

The draft must explicitly answer:
1. The single most important pain point to solve first.
2. The exact ideal customer profile with behavior, motivation, and trigger context.
3. The founder's unfair advantage or moat, tied to this niche.
4. The competitive landscape: direct competitors, what they do well, and the specific gap the founder can exploit.

Critical rules:
- Every claim must be anchored in the founder evidence below.
- Use the founder's own language when possible.
- If evidence is insufficient, say so explicitly.
- Never fake precision or fill a gap with vague startup language.
- Competition must only name plausible direct competitors. If confidence is low, keep the list short or empty and explain what signal is missing.
- Keep the document sharp and readable in under 5 minutes.

Return this exact JSON shape:
{
  "status":"draft_ready",
  "draftDocument":{
    "gatePreview":{"personaName":"string","roleLine":"string","painLine":"string"},
    "customer":{
      "personaName":"string",
      "roleLine":"string",
      "metaLine":"string",
      "summary":"string",
      "behaviors":["string"],
      "motivations":["string"],
      "whereToFind":["string"],
      "triggerContext":"string",
      "actionTrigger":"string",
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null"}
    },
    "pain":{
      "quote":"string",
      "rootCause":"string",
      "whyItHurts":"string",
      "triggerMoment":"string",
      "costOfInaction":"string",
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null"}
    },
    "build":{
      "valueProposition":"string",
      "replaces":["string"],
      "coreFeatures":[{"title":"string","description":"string"}],
      "outcome":"string",
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null"}
    },
    "moat":{
      "moatType":"string",
      "edge":"string",
      "edgeSource":"string",
      "whyHardToCopy":"string",
      "incumbentGap":"string",
      "startupsToStudy":[{"name":"string","url":"string|null"}],
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null"}
    },
    "competition":{
      "summary":"string",
      "directCompetitors":[{"name":"string","url":"string|null","doesWell":"string","gap":"string"}],
      "exploitableGap":"string",
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null"}
    },
    "confidence":{"level":"high|medium|low","summary":"string","missingSignals":["string"]},
    "nextActions":[{"title":"string","description":"string","route":"waitlist|pmf|mvp|gtm|mentor"}]
  },
  "enrichment":{"contradictionFlag":boolean,"mentorDomain":"string|null"}
}

Rules for output quality:
- The pain section must commit to one primary pain only.
- The customer section must describe a real buyer/operator in a real moment, not a broad market.
- The moat section must identify the source of the edge and why it is hard to copy.
- The competition section must be sharp, not encyclopedic.
- coreFeatures must be exactly 3 items.
- nextActions must be concrete and usable in the next week.

Founder evidence:
- Entry mode: ${evidence.entryMode}
- Founder language anchor: ${evidence.founderLanguageAnchor}
- Role: ${evidence.role || "Not explicit"}
- Industry: ${evidence.industry || "Not explicit"}
- Experience: ${evidence.experience || "Not explicit"}
- Segment: ${evidence.segment || "Not explicit"}
- Pain evidence: ${evidence.pain || "Not explicit"}
- Workaround evidence: ${evidence.workaround || "Not explicit"}
- Named alternatives: ${evidence.namedAlternatives.length > 0 ? evidence.namedAlternatives.join(", ") : "None explicitly named"}
- Solution direction: ${evidence.solutionDirection || "Not explicit"}
- Founder edge: ${evidence.founderEdge || "Not explicit"}
- Market context: ${evidence.marketContext}
- Persona heavily edited by founder: ${evidence.personaEditedSignificantly ? "yes" : "no"}
- Missing founder signals: ${evidence.missingSignals.length > 0 ? evidence.missingSignals.join(" | ") : "None"}

Research enrichment:
Competitor links:
${competitorBlock}

Market signals:
${marketSignalBlock}

Real evidence sources (verbatim community discussions and competitor pages retrieved for this run):
${sourceBlock}

When real evidence sources are present, ground the pain quote, behaviors, "where to find them", and competitor claims in them, and prefer the customers' actual wording. Never invent a source or a URL that is not listed above.`;
}

function buildDashboardContext(draftDocument: DraftDocument) {
  const level = draftDocument.confidence.level ?? "medium";
  const defaultRoute = level === "low" ? "/pmf-lab" : "/demo-studio";

  return {
    message: "We know who you’re building for — here’s what to do next.",
    suggestedStage: "IDENTITY",
    prioritizedTasks: draftDocument.nextActions.slice(0, 5).map((action, index) => ({
      id: `icp-draft-task-${index + 1}`,
      title: cleanText(action.title, `Next action ${index + 1}`),
      description: cleanText(action.description, "Use the ICP Draft to move from analysis into execution."),
      priority: index === 0 ? "high" : index < 3 ? "medium" : "low",
      route: normalizeRoutes(action.route, defaultRoute),
    })),
    recommendations: [
      {
        title: "We know who you’re building for — here’s what to do next",
        description:
          level === "low"
            ? "Validate the pain fast before you commit to a build path."
            : "Turn the draft into a concrete next move without losing momentum.",
        reason:
          level === "low"
            ? "Low-confidence drafts should produce better evidence, not more assumptions."
            : "A sharper ICP should immediately change what you build or test next.",
        actionUrl: draftDocument.nextActions[0]?.route ? normalizeRoutes(draftDocument.nextActions[0].route, defaultRoute) : defaultRoute,
        priority: 12,
        type: "action",
      },
      {
        title: level === "low" ? "Pressure-test the pain in PMF Lab" : "Capture demand with Demo Studio",
        description:
          level === "low"
            ? "Run interviews and demand checks against the exact segment the draft recommends."
            : "Use the ICP Draft language to create a demo brief, VSL script, and proof page before you build more.",
        reason: "The best next move should follow from the draft, not from generic startup advice.",
        actionUrl: level === "low" ? "/pmf-lab" : "/demo-studio",
        priority: 11,
        type: "action",
      },
      {
        title: "Get founder-context help from a mentor",
        description: "Use the draft to ask sharper questions about the segment, pain, competition, and offer.",
        reason: "A first ICP usually improves fastest when someone challenges the assumptions directly.",
        actionUrl: "/mentorship/mentor-marketplace",
        priority: 10,
        type: "mentor",
      },
    ],
  };
}

function normalizeDraftDocument(parsed: Record<string, any>, enrichment: DraftEnrichment): DraftDocument {
  const overallConfidence = normalizeConfidence(parsed?.confidence?.level, "medium");

  return {
    gatePreview: {
      personaName: cleanText(parsed?.gatePreview?.personaName, cleanText(parsed?.customer?.personaName, "Ideal customer")),
      roleLine: cleanText(parsed?.gatePreview?.roleLine, cleanText(parsed?.customer?.roleLine, "Founder-aligned buyer")),
      painLine: cleanText(parsed?.gatePreview?.painLine, cleanText(parsed?.pain?.quote, "The core pain still needs sharper founder evidence.")),
    },
    customer: {
      personaName: cleanText(parsed?.customer?.personaName, "Ideal customer"),
      roleLine: cleanText(parsed?.customer?.roleLine, "Founder-aligned buyer"),
      metaLine: cleanText(parsed?.customer?.metaLine, ""),
      summary: cleanText(parsed?.customer?.summary, "The customer profile still needs a more specific description."),
      behaviors: normalizeList(parsed?.customer?.behaviors, 4),
      motivations: normalizeList(parsed?.customer?.motivations, 3),
      whereToFind: normalizeList(parsed?.customer?.whereToFind, 5),
      triggerContext: cleanText(parsed?.customer?.triggerContext, "The trigger context still needs clearer founder evidence."),
      actionTrigger: cleanText(parsed?.customer?.actionTrigger, "The specific buying trigger still needs to be clarified."),
      evidence: buildSectionEvidence(parsed?.customer?.evidence, {
        confidence: overallConfidence,
        evidence: "Customer profile grounded in the founder evidence provided.",
        missingSignalPrompt: "What moment makes this customer actively search for a better solution?",
      }),
    },
    pain: {
      quote: cleanText(parsed?.pain?.quote, "The founder still needs to name one pain sharp enough to build around."),
      rootCause: cleanText(parsed?.pain?.rootCause, "The root cause still needs a sharper explanation."),
      whyItHurts: cleanText(parsed?.pain?.whyItHurts, "The consequence of this pain still needs clearer detail."),
      triggerMoment: cleanText(parsed?.pain?.triggerMoment, "The trigger moment still needs a clearer founder example."),
      costOfInaction: cleanText(parsed?.pain?.costOfInaction, "The cost of leaving this pain unsolved still needs to be made explicit."),
      evidence: buildSectionEvidence(parsed?.pain?.evidence, {
        confidence: overallConfidence,
        evidence: "Pain diagnosis grounded in the founder's pain and workaround inputs.",
        missingSignalPrompt: "Describe one recent moment where this pain caused delay, lost trust, or lost money.",
      }),
    },
    build: {
      valueProposition: cleanText(parsed?.build?.valueProposition, "The first product promise still needs to be made more concrete."),
      replaces: normalizeList(parsed?.build?.replaces, 4),
      coreFeatures: Array.isArray(parsed?.build?.coreFeatures)
        ? parsed.build.coreFeatures
            .filter((item: any) => item && typeof item === "object")
            .slice(0, 3)
            .map((item: any, index: number) => ({
              title: cleanText(item?.title, `0${index + 1}`),
              description: cleanText(item?.description, "Translate the customer pain into one decisive capability."),
            }))
        : [],
      outcome: cleanText(parsed?.build?.outcome, "The immediate customer outcome still needs a sharper articulation."),
      evidence: buildSectionEvidence(parsed?.build?.evidence, {
        confidence: overallConfidence,
        evidence: "Build recommendation grounded in the founder's stated problem and solution direction.",
        missingSignalPrompt: "What should the customer stop doing manually once this product works?",
      }),
    },
    moat: {
      moatType: cleanText(parsed?.moat?.moatType, "Founder advantage"),
      edge: cleanText(parsed?.moat?.edge, "The founder advantage still needs a clearer niche-specific explanation."),
      edgeSource: cleanText(parsed?.moat?.edgeSource, "The source of the advantage is not yet explicit enough."),
      whyHardToCopy: cleanText(parsed?.moat?.whyHardToCopy, "Why this advantage is hard to copy still needs stronger proof."),
      incumbentGap: cleanText(parsed?.moat?.incumbentGap, "The incumbent gap still needs to be stated more sharply."),
      startupsToStudy: Array.isArray(parsed?.moat?.startupsToStudy)
        ? parsed.moat.startupsToStudy
            .filter((item: any) => item && typeof item === "object" && typeof item.name === "string")
            .slice(0, 3)
            .map((item: any) => ({
              name: cleanText(item?.name, "Reference"),
              url: typeof item?.url === "string" && item.url.trim().length > 0 ? item.url : null,
            }))
        : [],
      evidence: buildSectionEvidence(parsed?.moat?.evidence, {
        confidence: overallConfidence,
        evidence: "Moat statement grounded in the founder's edge and workflow positioning.",
        missingSignalPrompt: "What access, trust, distribution, or lived insight do you have that others do not?",
      }),
    },
    competition: {
      summary: cleanText(parsed?.competition?.summary, "The competitive landscape still needs more signal before it can be stated confidently."),
      directCompetitors: Array.isArray(parsed?.competition?.directCompetitors)
        ? parsed.competition.directCompetitors
            .filter((item: any) => item && typeof item === "object" && typeof item.name === "string")
            .slice(0, 3)
            .map((item: any) => ({
              name: cleanText(item?.name, "Competitor"),
              url: typeof item?.url === "string" && item.url.trim().length > 0 ? item.url : null,
              doesWell: cleanText(item?.doesWell, "Recognized alternative in the broader category."),
              gap: cleanText(item?.gap, "The niche-specific gap still needs clearer evidence."),
            }))
        : enrichment.competitorLinks.slice(0, 3).map((item) => ({
            name: item.name,
            url: item.url,
            doesWell: "Recognized alternative in the broader category.",
            gap: "The niche-specific gap still needs clearer evidence.",
          })),
      exploitableGap: cleanText(parsed?.competition?.exploitableGap, "The exploitable competitive gap still needs clearer founder or market evidence."),
      evidence: buildSectionEvidence(parsed?.competition?.evidence, {
        confidence: overallConfidence === "low" ? "low" : "medium",
        evidence:
          enrichment.marketSignals.length > 0 || enrichment.competitorLinks.length > 0
            ? "Competition informed by founder evidence plus targeted market-signal enrichment."
            : "Competition inferred from founder evidence only; treat this section as provisional.",
        missingSignalPrompt: "Name the tools, services, or manual alternatives this customer uses today so the competitive landscape can be sharpened.",
      }),
    },
    confidence: {
      level: overallConfidence,
      summary: cleanText(parsed?.confidence?.summary, "This draft should be treated as directional until stronger founder evidence is added."),
      missingSignals: normalizeList(parsed?.confidence?.missingSignals, 5),
    },
    nextActions: Array.isArray(parsed?.nextActions)
      ? parsed.nextActions
          .filter((item: any) => item && typeof item === "object")
          .slice(0, 5)
          .map((item: any, index: number) => ({
            title: cleanText(item?.title, `Next action ${index + 1}`),
            description: cleanText(item?.description, "Use the ICP Draft to move from analysis into execution."),
            route: normalizeRoutes(item?.route, overallConfidence === "low" ? "/pmf-lab" : "/demo-studio"),
          }))
      : [],
    // Citations are attached deterministically from real retrieved evidence so
    // they always render, regardless of what the model echoes back.
    sources: enrichment.sources.slice(0, 8),
  };
}

export async function generateIcpDraftArtifact({
  openaiApiKey,
  request,
  enrichment,
}: {
  openaiApiKey: string;
  request: DraftRequestShape;
  enrichment?: Partial<DraftEnrichment>;
}) {
  const resolvedEnrichment: DraftEnrichment = {
    marketSignals: enrichment?.marketSignals ?? [],
    competitorLinks: enrichment?.competitorLinks ?? [],
    sources: enrichment?.sources ?? [],
  };

  // Hard timeout so a hung OpenAI request fails fast and clean instead of
  // letting the client hit its own timeout with no diagnostic.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 38000);
  let completion: Response;
  try {
    completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.35,
        // A full 4-section ICP draft overruns a low ceiling -> the JSON gets
        // truncated and JSON.parse throws. Give it enough room to complete.
        max_tokens: 6000,
        messages: [
          { role: "system", content: "Return valid JSON only." },
          { role: "user", content: buildDraftPrompt(request, resolvedEnrichment) },
        ],
      }),
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!completion.ok) {
    const errBody = await completion.text().catch(() => "");
    throw new Error(`OpenAI API Error: ${completion.status} ${errBody.slice(0, 200)}`.trim());
  }

  const aiData = await completion.json();
  const choice = aiData?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned an empty ICP draft response");
  }
  if (choice?.finish_reason === "length") {
    throw new Error("ICP draft response was truncated before completion");
  }
  let parsed: ReturnType<typeof JSON.parse>;
  try {
    parsed = JSON.parse(content);
  } catch (parseError) {
    throw new Error(
      `Failed to parse ICP draft JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
    );
  }
  const draftDocument = normalizeDraftDocument(parsed?.draftDocument ?? {}, resolvedEnrichment);

  return {
    status: "draft_ready",
    artifact: {
      version: 4,
      generatedAt: new Date().toISOString(),
      founderInputs: {
        mode: request.entryMode,
        fastDescription: request.entryMode === "fast" ? request.fastInput?.description ?? null : null,
        guided: request.entryMode === "guided" ? request.guidedInput ?? null : null,
      },
      draftDocument,
      dashboardContext: buildDashboardContext(draftDocument),
      enrichment: {
        contradictionFlag: Boolean(parsed?.enrichment?.contradictionFlag),
        marketSignals: resolvedEnrichment.marketSignals,
        mentorDomain: typeof parsed?.enrichment?.mentorDomain === "string" ? parsed.enrichment.mentorDomain : null,
      },
    },
  };
}
