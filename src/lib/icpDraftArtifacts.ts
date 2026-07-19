import {
  buildGuidedSolutionSentence,
  buildMarketContextLabel,
  type GuidedIcpInputSchema,
} from "./icpBuilderSchema.ts";
import type {
  IcpBuilderMode,
  IcpBuilderSession,
  IcpConfidenceLevel,
  IcpDraftCompetitor,
  IcpDraftDocument,
  IcpDraftSectionEvidence,
  StoredIcpArtifact,
} from "./icpBuilderSession.ts";

type LegacyAnalysis = Record<string, unknown>;

export interface NormalizedIcpArtifactResult {
  artifact: StoredIcpArtifact | null;
  legacyAvailable: boolean;
  legacyAnalysis: LegacyAnalysis | null;
}

function inferPersonaName(roleLine: string) {
  const firstWord = roleLine.split(/\s+/).filter(Boolean)[0] ?? "Founder";
  return `${firstWord} ${firstWord.endsWith("r") ? "Riley" : "Robin"}`;
}

function normalizeSectionList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeConfidence(value: unknown, fallback: IcpConfidenceLevel = "medium"): IcpConfidenceLevel {
  return value === "high" || value === "medium" || value === "low" ? value : fallback;
}

function buildArtifactGatePreview(artifact: StoredIcpArtifact) {
  return {
    personaName: artifact.draftDocument.customer.personaName,
    roleLine: artifact.draftDocument.customer.roleLine,
    painLine: artifact.draftDocument.pain.quote,
  };
}

function buildSectionEvidence(
  value: Partial<IcpDraftSectionEvidence> | null | undefined,
  fallback: {
    confidence?: IcpConfidenceLevel;
    evidence: string;
    missingSignalPrompt?: string | null;
  },
): IcpDraftSectionEvidence {
  return {
    confidence: normalizeConfidence(value?.confidence, fallback.confidence ?? "medium"),
    evidence:
      typeof value?.evidence === "string" && value.evidence.trim().length > 0
        ? value.evidence
        : fallback.evidence,
    missingSignalPrompt:
      typeof value?.missingSignalPrompt === "string" ? value.missingSignalPrompt : fallback.missingSignalPrompt ?? null,
  };
}

function normalizeCompetitors(
  value: unknown,
  fallback: IcpDraftCompetitor[] = [],
): IcpDraftCompetitor[] {
  if (!Array.isArray(value)) return fallback;

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      name: typeof item.name === "string" && item.name.trim().length > 0 ? item.name : "Unnamed competitor",
      url: typeof item.url === "string" && item.url.trim().length > 0 ? item.url : null,
      doesWell:
        typeof item.doesWell === "string" && item.doesWell.trim().length > 0
          ? item.doesWell
          : typeof item.strengths === "string" && item.strengths.trim().length > 0
            ? item.strengths
            : "Recognized alternative in the broader category.",
      gap:
        typeof item.gap === "string" && item.gap.trim().length > 0
          ? item.gap
          : typeof item.weaknesses === "string" && item.weaknesses.trim().length > 0
            ? item.weaknesses
            : "The niche-specific gap still needs stronger founder evidence.",
    }))
    .filter((item) => item.name.trim().length > 0);
}

export function normalizeIcpDraftDocument(
  draft: Partial<IcpDraftDocument> | null | undefined,
  artifact?: Partial<StoredIcpArtifact> | null,
): IcpDraftDocument | null {
  if (!draft?.customer?.roleLine) return null;

  const confidenceLevel = normalizeConfidence(draft.confidence?.level, "medium");
  const roleLine = draft.customer.roleLine;
  const personaName =
    typeof draft.customer.personaName === "string" && draft.customer.personaName.trim().length > 0
      ? draft.customer.personaName
      : inferPersonaName(roleLine);
  const painQuote =
    typeof draft.pain?.quote === "string" && draft.pain.quote.trim().length > 0
      ? draft.pain.quote
      : "The founder has not yet described one pain sharp enough to anchor the product around.";
  const fallbackCompetitors = Array.isArray(draft.moat?.startupsToStudy)
    ? draft.moat.startupsToStudy
        .filter((item): item is { name: string; url: string | null } => Boolean(item?.name))
        .map((item) => ({
          name: item.name,
          url: item.url,
          doesWell: "Recognized alternative in the broader category.",
          gap: "The niche-specific gap still needs sharper founder evidence.",
        }))
    : [];

  return {
    gatePreview: {
      personaName: draft.gatePreview?.personaName || personaName,
      roleLine: draft.gatePreview?.roleLine || roleLine,
      painLine: draft.gatePreview?.painLine || painQuote,
    },
    decisionBrief: {
      primarySegment:
        typeof draft.decisionBrief?.primarySegment === "string" && draft.decisionBrief.primarySegment.trim()
          ? draft.decisionBrief.primarySegment
          : roleLine,
      nonFitSegment:
        typeof draft.decisionBrief?.nonFitSegment === "string" && draft.decisionBrief.nonFitSegment.trim()
          ? draft.decisionBrief.nonFitSegment
          : "Adjacent customers without the same urgent trigger are not the first segment to serve.",
      rankedPains: Array.from({ length: 3 }, (_, index) => {
        const item = draft.decisionBrief?.rankedPains?.[index];
        return {
          rank: index + 1,
          pain:
            typeof item?.pain === "string" && item.pain.trim()
              ? item.pain
              : index === 0
                ? painQuote
                : `Secondary pain ${index + 1} still needs interview evidence.`,
          evidence:
            typeof item?.evidence === "string" && item.evidence.trim()
              ? item.evidence
              : "Treat this ranking as an assumption until interviews confirm it.",
        };
      }),
      buyingTrigger:
        typeof draft.decisionBrief?.buyingTrigger === "string" && draft.decisionBrief.buyingTrigger.trim()
          ? draft.decisionBrief.buyingTrigger
          : draft.customer.actionTrigger || draft.pain?.triggerMoment || "The buying trigger still needs validation.",
      currentAlternative:
        typeof draft.decisionBrief?.currentAlternative === "string" && draft.decisionBrief.currentAlternative.trim()
          ? draft.decisionBrief.currentAlternative
          : draft.build?.replaces?.[0] || "The current alternative still needs to be named in interviews.",
      reachableChannels:
        normalizeSectionList(draft.decisionBrief?.reachableChannels).length > 0
          ? normalizeSectionList(draft.decisionBrief?.reachableChannels).slice(0, 5)
          : normalizeSectionList(draft.customer.whereToFind).slice(0, 5),
      interviewValidationPlan: Array.from({ length: 5 }, (_, index) => {
        const item = draft.decisionBrief?.interviewValidationPlan?.[index];
        const defaultQuestions = [
          "Tell me about the last time this problem happened.",
          "What did you do instead, and what did that cost?",
          "What made the problem urgent enough to act on?",
          "Where would you look for a solution like this?",
          "What proof would make you try or pay for a first version?",
        ];
        return {
          step: index + 1,
          question:
            typeof item?.question === "string" && item.question.trim() ? item.question : defaultQuestions[index],
          successSignal:
            typeof item?.successSignal === "string" && item.successSignal.trim()
              ? item.successSignal
              : "Capture a specific recent behavior, not a hypothetical preference.",
        };
      }),
    },
    customer: {
      personaName,
      roleLine,
      metaLine: draft.customer.metaLine || "",
      summary:
        typeof draft.customer.summary === "string" && draft.customer.summary.trim().length > 0
          ? draft.customer.summary
          : "The customer profile still needs sharper founder-specific context before it should guide execution.",
      behaviors: normalizeSectionList(draft.customer.behaviors),
      motivations: normalizeSectionList(draft.customer.motivations),
      whereToFind: normalizeSectionList(draft.customer.whereToFind),
      triggerContext:
        typeof draft.customer.triggerContext === "string" && draft.customer.triggerContext.trim().length > 0
          ? draft.customer.triggerContext
          : "The exact moment this customer feels the pain still needs clearer evidence.",
      actionTrigger:
        typeof draft.customer.actionTrigger === "string" && draft.customer.actionTrigger.trim().length > 0
          ? draft.customer.actionTrigger
          : "The draft needs a stronger founder signal for what makes this customer act now.",
      evidence: buildSectionEvidence(draft.customer.evidence, {
        confidence: confidenceLevel,
        evidence: "Customer profile inferred from the founder's niche, pain, workaround, and solution inputs.",
        missingSignalPrompt: "What moment makes this customer actively search for a better solution?",
      }),
    },
    pain: {
      quote: painQuote,
      rootCause:
        typeof draft.pain?.rootCause === "string" && draft.pain.rootCause.trim().length > 0
          ? draft.pain.rootCause
          : "The root cause still needs a sharper explanation tied to the founder's evidence.",
      whyItHurts:
        typeof draft.pain?.whyItHurts === "string" && draft.pain.whyItHurts.trim().length > 0
          ? draft.pain.whyItHurts
          : "The real consequence of this pain is still under-specified.",
      triggerMoment:
        typeof draft.pain?.triggerMoment === "string" && draft.pain.triggerMoment.trim().length > 0
          ? draft.pain.triggerMoment
          : "The triggering moment still needs a clearer founder example.",
      costOfInaction:
        typeof draft.pain?.costOfInaction === "string" && draft.pain.costOfInaction.trim().length > 0
          ? draft.pain.costOfInaction
          : "The cost of leaving this unsolved still needs to be made explicit.",
      evidence: buildSectionEvidence(draft.pain?.evidence, {
        confidence: confidenceLevel,
        evidence: "Pain diagnosis grounded in the founder's pain statement and current workaround.",
        missingSignalPrompt: "Describe one recent example where this pain caused delay, loss, or frustration.",
      }),
    },
    build: {
      valueProposition:
        typeof draft.build?.valueProposition === "string" && draft.build.valueProposition.trim().length > 0
          ? draft.build.valueProposition
          : "The first product promise still needs to be made more concrete.",
      replaces: normalizeSectionList(draft.build?.replaces),
      coreFeatures: Array.isArray(draft.build?.coreFeatures)
        ? draft.build.coreFeatures.filter(
            (feature): feature is { title: string; description: string } =>
              Boolean(feature?.title) && Boolean(feature?.description),
          )
        : [],
      outcome:
        typeof draft.build?.outcome === "string" && draft.build.outcome.trim().length > 0
          ? draft.build.outcome
          : "The immediate customer outcome still needs a sharper articulation.",
      evidence: buildSectionEvidence(draft.build?.evidence, {
        confidence: confidenceLevel,
        evidence: "Build recommendation grounded in the founder's stated problem and product direction.",
        missingSignalPrompt: "What should the customer stop doing manually if this product works exactly as intended?",
      }),
    },
    moat: {
      moatType:
        typeof draft.moat?.moatType === "string" && draft.moat.moatType.trim().length > 0
          ? draft.moat.moatType
          : "Founder advantage",
      edge:
        typeof draft.moat?.edge === "string" && draft.moat.edge.trim().length > 0
          ? draft.moat.edge
          : "The founder advantage still needs a clearer explanation tied to this niche.",
      edgeSource:
        typeof draft.moat?.edgeSource === "string" && draft.moat.edgeSource.trim().length > 0
          ? draft.moat.edgeSource
          : "The source of the advantage is not yet explicit enough.",
      whyHardToCopy:
        typeof draft.moat?.whyHardToCopy === "string" && draft.moat.whyHardToCopy.trim().length > 0
          ? draft.moat.whyHardToCopy
          : "Why this advantage is hard to copy still needs stronger proof.",
      incumbentGap:
        typeof draft.moat?.incumbentGap === "string" && draft.moat.incumbentGap.trim().length > 0
          ? draft.moat.incumbentGap
          : "The draft needs a sharper explanation of why current alternatives miss this niche.",
      startupsToStudy: Array.isArray(draft.moat?.startupsToStudy)
        ? draft.moat.startupsToStudy.filter(
            (item): item is { name: string; url: string | null } => Boolean(item?.name),
          )
        : [],
      evidence: buildSectionEvidence(draft.moat?.evidence, {
        confidence: confidenceLevel,
        evidence: "Moat inferred from the founder's edge statement and the niche-specific workflow gap.",
        missingSignalPrompt: "What access, trust, distribution, or lived insight do you have that a generic competitor does not?",
      }),
    },
    competition: {
      summary:
        typeof draft.competition?.summary === "string" && draft.competition.summary.trim().length > 0
          ? draft.competition.summary
          : "The competitive landscape still needs more signal before it can be stated confidently.",
      directCompetitors: normalizeCompetitors(draft.competition?.directCompetitors, fallbackCompetitors),
      exploitableGap:
        typeof draft.competition?.exploitableGap === "string" && draft.competition.exploitableGap.trim().length > 0
          ? draft.competition.exploitableGap
          : "The exploitable competitive gap still needs clearer founder or market evidence.",
      evidence: buildSectionEvidence(draft.competition?.evidence, {
        confidence: confidenceLevel === "low" ? "low" : "medium",
        evidence:
          artifact?.enrichment?.marketSignals?.length
            ? "Competition informed by founder inputs plus targeted market-signal enrichment."
            : "Competition inferred from founder inputs only; treat it as provisional until the current alternatives are more explicit.",
        missingSignalPrompt: "Name the tools, services, or manual alternatives this customer uses today so the competitive landscape can be sharpened.",
      }),
    },
    confidence: {
      level: confidenceLevel,
      summary:
        typeof draft.confidence?.summary === "string" && draft.confidence.summary.trim().length > 0
          ? draft.confidence.summary
          : "This draft should be treated as directional until stronger founder evidence is added.",
      missingSignals: normalizeSectionList(draft.confidence?.missingSignals),
    },
    nextActions: Array.isArray(draft.nextActions)
      ? draft.nextActions.filter(
          (action): action is { title: string; description: string; route: string } =>
            Boolean(action?.title) && Boolean(action?.description) && Boolean(action?.route),
        )
      : [],
    sources: Array.isArray(draft.sources)
      ? draft.sources
          .filter((source): source is NonNullable<typeof source> => Boolean(source?.title))
          .map((source) => ({
            type: source.type === "competitor" || source.type === "market" ? source.type : "community",
            title: String(source.title),
            url: typeof source.url === "string" && source.url.trim() ? source.url : null,
            detail: typeof source.detail === "string" && source.detail.trim() ? source.detail : null,
          }))
      : [],
  };
}

function normalizeArtifactShape(artifact: StoredIcpArtifact) {
  const draftDocument = normalizeIcpDraftDocument(artifact.draftDocument, artifact);
  if (!draftDocument) return null;

  return {
    ...artifact,
    version: artifact.version === 4 ? 4 : 3,
    draftDocument,
  } satisfies StoredIcpArtifact;
}

export function normalizeStoredArtifact(row: {
  analysis_data?: LegacyAnalysis | null;
  target_audience?: string | null;
  business_description?: string | null;
  verdict?: string | null;
}): NormalizedIcpArtifactResult {
  const analysisData = row.analysis_data ?? null;
  if (!analysisData) {
    return { artifact: null, legacyAvailable: false, legacyAnalysis: null };
  }

  if ((analysisData.version === 3 || analysisData.version === 4) && analysisData.draftDocument?.customer) {
    const artifact = normalizeArtifactShape(analysisData as StoredIcpArtifact);
    if (!artifact) {
      return { artifact: null, legacyAvailable: false, legacyAnalysis: null };
    }
    artifact.draftDocument.gatePreview = buildArtifactGatePreview(artifact);
    return { artifact, legacyAvailable: false, legacyAnalysis: null };
  }

  const artifact = mapLegacyAnalysisToArtifact(
    analysisData,
    row.target_audience ?? null,
    row.business_description ?? "",
    row.verdict ?? null,
  );

  return {
    artifact,
    legacyAvailable: Boolean(artifact),
    legacyAnalysis: artifact ? analysisData : null,
  };
}

export function mapLegacyAnalysisToArtifact(
  analysisData: LegacyAnalysis,
  targetAudience: string | null,
  businessDescription: string,
  verdict: string | null,
): StoredIcpArtifact | null {
  const topPain = Array.isArray(analysisData?.painPoints) ? analysisData.painPoints[0] : null;
  const nicheProfile = analysisData?.nicheProfile;
  const positioning = analysisData?.positioningStrategy ?? analysisData?.positioning;
  const nicheScore = analysisData?.nicheScore;

  if (!nicheProfile && !topPain && !positioning && !nicheScore && !analysisData?.draftDocument) {
    return null;
  }

  const roleLine =
    targetAudience ||
    nicheProfile?.nicheName ||
    nicheProfile?.demographics?.occupation ||
    "Ideal customer";
  const metaBits = [
    nicheProfile?.demographics?.industry,
    nicheProfile?.demographics?.location,
    nicheProfile?.demographics?.ageRange,
  ].filter(Boolean);
  const summary =
    nicheProfile?.nicheDescription ||
    targetAudience ||
    "A focused customer segment was identified in the saved ICP analysis.";
  const painSummary =
    topPain?.painPoint ||
    topPain?.painPointDescription ||
    analysisData?.draftDocument?.painPoint?.summary ||
    "The saved analysis identified a meaningful customer pain worth testing.";
  const buildSummary =
    positioning?.uniqueValueProposition ||
    positioning?.valueProposition ||
    analysisData?.draftDocument?.buildRecommendation?.summary ||
    "Build the smallest offer that removes the core pain directly.";
  const moatSummary =
    positioning?.positioningStatement ||
    positioning?.oneLiner ||
    analysisData?.draftDocument?.moat?.summary ||
    "The saved analysis found a wedge that differentiates this offer from current alternatives.";

  const artifact: StoredIcpArtifact = {
    version: 4,
    generatedAt: analysisData?.generatedAt ?? new Date().toISOString(),
    founderInputs: {
      mode: "guided",
      fastDescription: null,
      guided: {
        seed: businessDescription || "Legacy ICP analysis",
        persona: {
          role: roleLine,
          industry: nicheProfile?.demographics?.industry || "Industry not captured",
          experience: nicheProfile?.demographics?.ageRange || "Experience not captured",
        },
        specificity: targetAudience || roleLine,
        pain: painSummary,
        workaround: topPain?.currentSolution || topPain?.currentWorkaround || "",
        solutionCompletion:
          positioning?.uniqueValueProposition ||
          positioning?.valueProposition ||
          "solve the core pain in a simpler way",
        marketContext: "manual_or_no_product",
        founderEdge: positioning?.keyDifferentiators?.[0] || positioning?.differentiators?.[0] || "",
      },
    },
    draftDocument: {
      gatePreview: {
        personaName: inferPersonaName(roleLine),
        roleLine,
        painLine: painSummary,
      },
      customer: {
        personaName: inferPersonaName(roleLine),
        roleLine,
        metaLine: metaBits.join(" · "),
        summary,
        behaviors: [],
        motivations: [],
        whereToFind: normalizeSectionList(nicheProfile?.buyingBehavior?.preferredChannels).slice(0, 4),
        triggerContext: "The exact pain trigger still needs fresher founder evidence.",
        actionTrigger: "A clearer buying trigger still needs to be confirmed.",
        evidence: {
          confidence: "medium",
          evidence: "Customer profile mapped from a legacy ICP analysis.",
          missingSignalPrompt: "What exact moment makes this customer actively look for a better solution?",
        },
      },
      pain: {
        quote: painSummary,
        rootCause:
          topPain?.gapInCurrentSolution ||
          analysisData?.draftDocument?.painPoint?.bullets?.[0] ||
          "There is no reliable system of record for this problem.",
        whyItHurts:
          topPain?.whyUnresolved ||
          analysisData?.draftDocument?.painPoint?.bullets?.[1] ||
          "The customer feels the cost every time work slips or trust drops.",
        triggerMoment:
          topPain?.whenItShowsUp ||
          topPain?.frequency ||
          "The pain spikes when a customer or stakeholder expects clarity fast.",
        costOfInaction: "The founder still needs clearer evidence for the cost of leaving this pain unresolved.",
        evidence: {
          confidence: "medium",
          evidence: "Pain section mapped from the saved pain point and current workaround.",
          missingSignalPrompt: "Describe one recent example of how this pain caused delay, loss, or frustration.",
        },
      },
      build: {
        valueProposition: buildSummary,
        replaces: normalizeSectionList([topPain?.currentSolution, topPain?.currentWorkaround]).slice(0, 3),
        coreFeatures: normalizeSectionList(analysisData?.actionPlan)
          .slice(0, 3)
          .map((item, index) => ({
            title: `0${index + 1}`,
            description:
              typeof item === "string"
                ? item
                : typeof item === "object" && item !== null && "action" in item && typeof item.action === "string"
                  ? item.action
                  : "Translate the customer pain into one decisive capability.",
          })),
        outcome:
          analysisData?.draftDocument?.nextActions?.[0]?.description ||
          "The first version should make the customer feel more in control immediately.",
        evidence: {
          confidence: "medium",
          evidence: "Build recommendation mapped from the legacy value proposition and action plan.",
          missingSignalPrompt: "What should the customer stop doing manually once this product works?",
        },
      },
      moat: {
        moatType: "Founder expertise",
        edge: moatSummary,
        edgeSource: "The founder edge was inferred from the saved positioning analysis.",
        whyHardToCopy: "Why this edge is hard to copy needs fresher founder context.",
        incumbentGap:
          normalizeSectionList(positioning?.keyDifferentiators || positioning?.differentiators)[0] ||
          "Incumbents optimize for broader workflows, not this exact user and moment.",
        startupsToStudy: [],
        evidence: {
          confidence: "low",
          evidence: "Moat mapped from older positioning language and should be pressure-tested.",
          missingSignalPrompt: "What access, trust, or lived insight gives you an advantage that a competitor cannot quickly copy?",
        },
      },
      competition: {
        summary: "This legacy draft did not include a dedicated competitive landscape section.",
        directCompetitors: [],
        exploitableGap: "Competitive gap still needs named alternatives or external market evidence.",
        evidence: {
          confidence: "low",
          evidence: "Competition data was not preserved in the older artifact shape.",
          missingSignalPrompt: "Name the tools, services, or manual alternatives your customer uses today.",
        },
      },
      confidence: {
        level:
          nicheScore?.verdict === "Highly Viable"
            ? "high"
            : nicheScore?.verdict === "Promising" || verdict === "Promising"
              ? "medium"
              : "low",
        summary:
          nicheScore?.reasoning ||
          "This draft was mapped from an older saved analysis. Revalidate it against fresh customer evidence.",
        missingSignals: Array.isArray(analysisData?.recommendation?.openQuestions)
          ? analysisData.recommendation.openQuestions.slice(0, 3)
          : ["Run a few customer conversations to confirm the top pain and switching trigger."],
      },
      nextActions: normalizeSectionList(
        analysisData?.actionPlan?.map((action: unknown) =>
          typeof action === "object" && action !== null
            ? ("action" in action && typeof action.action === "string"
                ? action.action
                : "description" in action && typeof action.description === "string"
                  ? action.description
                  : undefined)
            : action,
        ),
      )
        .slice(0, 3)
        .map((action, index) => ({
          title: action,
          description: "Use the saved ICP analysis to drive the next execution step.",
          route: index === 0 ? "/pmf-lab" : "/demo-studio",
        })),
    },
    dashboardContext: {
      message: "We know who you’re building for — here’s what to do next.",
      suggestedStage: "IDENTITY",
      prioritizedTasks: [],
      recommendations: [],
    },
    enrichment: null,
  };

  const normalizedArtifact = normalizeArtifactShape(artifact);
  if (!normalizedArtifact) return null;

  normalizedArtifact.draftDocument.gatePreview = buildArtifactGatePreview(normalizedArtifact);
  normalizedArtifact.dashboardContext = buildDraftDashboardContext(normalizedArtifact);
  return normalizedArtifact;
}

export function buildDraftDashboardContext(artifact: StoredIcpArtifact) {
  const confidence = artifact.draftDocument.confidence.level;
  return {
    message: "We know who you’re building for — here’s what to do next.",
    suggestedStage: "IDENTITY" as const,
    prioritizedTasks: artifact.draftDocument.nextActions.slice(0, 5).map((action, index) => ({
      id: `icp-draft-task-${index + 1}`,
      title: action.title,
      description: action.description,
      priority: index === 0 ? "high" : index < 3 ? "medium" : "low",
      route: action.route,
    })),
    recommendations: [
      {
        title: "We know who you’re building for — here’s what to do next",
        description:
          confidence === "low"
            ? "Validate the pain fast before you commit to a build path."
            : "Turn the ICP Draft into a concrete next move without losing momentum.",
        reason:
          confidence === "low"
            ? "Low-confidence drafts should produce better evidence, not more assumptions."
            : "A sharper ICP should immediately change what you build or test next.",
        actionUrl: confidence === "low" ? "/pmf-lab" : artifact.draftDocument.nextActions[0]?.route || "/demo-studio",
        priority: 12,
        type: "action" as const,
      },
      {
        title: confidence === "low" ? "Pressure-test the pain in PMF Lab" : "Capture demand with Demo Studio",
        description:
          confidence === "low"
            ? "Run interviews and demand checks against the exact segment the draft recommends."
            : "Use the ICP Draft language to create a clear waitlist message before you build more.",
        reason: "The best next move should follow from the draft, not from generic startup advice.",
        actionUrl: confidence === "low" ? "/pmf-lab" : "/demo-studio",
        priority: 11,
        type: "action" as const,
      },
      {
        title: "Get founder-context help from a mentor",
        description: "Use the draft to ask sharper questions about the segment, pain, and offer.",
        reason: "A first ICP usually improves fastest when someone challenges the assumptions directly.",
        actionUrl: "/mentorship/mentor-marketplace",
        priority: 10,
        type: "mentor" as const,
      },
    ],
  };
}

export interface IcpDashboardSnapshot {
  industry: string;
  personaName: string;
  roleLine: string;
  corePainPoint: string;
  suggestedStage: string;
  confidenceLevel: string;
  valueProposition: string;
}

export function buildIcpDashboardSnapshot(artifact: StoredIcpArtifact): IcpDashboardSnapshot {
  return {
    industry:
      artifact.founderInputs.guided?.persona.industry ||
      artifact.draftDocument.customer.metaLine ||
      "Emerging market",
    personaName: artifact.draftDocument.customer.personaName,
    roleLine: artifact.draftDocument.customer.roleLine,
    corePainPoint: artifact.draftDocument.pain.quote,
    suggestedStage: artifact.dashboardContext?.suggestedStage || "IDENTITY",
    confidenceLevel: artifact.draftDocument.confidence.level,
    valueProposition: artifact.draftDocument.build.valueProposition,
  };
}

export function buildBuilderSessionFromArtifact(artifact: StoredIcpArtifact, savedAnalysisId: string | null): IcpBuilderSession {
  const mode: IcpBuilderMode = artifact.founderInputs.mode;
  const guided = artifact.founderInputs.guided ?? {
    seed: "",
    persona: { role: "", industry: "", experience: "" },
    specificity: "",
    pain: "",
    workaround: "",
    solutionCompletion: "",
    marketContext: "manual_or_no_product",
    founderEdge: "",
  };

  return {
    version: 4,
    mode,
    currentScreen: mode === "fast" ? "fast_input" : "guided_seed",
    fastDescription: artifact.founderInputs.fastDescription ?? "",
    guided,
    personaSuggestion: guided.persona
      ? {
          role: guided.persona.role,
          industry: guided.persona.industry,
          experience: guided.persona.experience,
          suggestedPain: artifact.draftDocument.pain.quote,
        }
      : null,
    personaEditedSignificantly: false,
    draftPreview: artifact,
    unlockRequired: false,
    savedAnalysisId,
    updatedAt: Date.now(),
  };
}

export function buildDraftTitle(artifact: StoredIcpArtifact) {
  return `${artifact.draftDocument.customer.personaName} ICP Draft`;
}

export function buildDraftSummary(artifact: StoredIcpArtifact) {
  return artifact.draftDocument.build.valueProposition;
}

export function buildGuidedSummary(guided: GuidedIcpInputSchema) {
  return [
    `Startup idea: ${guided.seed}`,
    `Persona: ${guided.persona.role} in ${guided.persona.industry} (${guided.persona.experience})`,
    `Core frustration: ${guided.pain}`,
    `Current workaround: ${guided.workaround}`,
    guided.specificity ? `Specific segment: ${guided.specificity}` : null,
    guided.solutionCompletion
      ? `Solution sentence: ${buildGuidedSolutionSentence(guided.persona.role, guided.solutionCompletion)}`
      : null,
    guided.marketContext ? `Market context: ${buildMarketContextLabel(guided.marketContext)}` : null,
    guided.founderEdge ? `Founder edge: ${guided.founderEdge}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}
