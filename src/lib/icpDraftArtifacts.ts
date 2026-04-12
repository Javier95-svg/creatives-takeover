import {
  buildGuidedSolutionSentence,
  buildMarketContextLabel,
  type GuidedIcpInputSchema,
} from "@/lib/icpBuilderSchema";
import type { IcpBuilderMode, IcpBuilderSession, StoredIcpArtifact } from "@/lib/icpBuilderSession";

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

function buildArtifactGatePreview(artifact: StoredIcpArtifact) {
  return {
    personaName: artifact.draftDocument.customer.personaName,
    roleLine: artifact.draftDocument.customer.roleLine,
    painLine: artifact.draftDocument.pain.quote,
  };
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

  if (analysisData.version === 3 && analysisData.draftDocument?.customer) {
    const artifact = analysisData as StoredIcpArtifact;
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
    version: 3,
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
        whereToFind: normalizeSectionList(nicheProfile?.buyingBehavior?.preferredChannels).slice(0, 4),
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
      },
      build: {
        valueProposition: buildSummary,
        replaces: normalizeSectionList([
          topPain?.currentSolution,
          topPain?.currentWorkaround,
        ]).slice(0, 3),
        coreFeatures: normalizeSectionList(analysisData?.actionPlan)
          .slice(0, 3)
          .map((item, index) => ({
            title: `0${index + 1}`,
            description:
              typeof item === "string"
                ? item
                : typeof item?.action === "string"
                  ? item.action
                  : "Translate the customer pain into one decisive capability.",
          })),
        outcome:
          analysisData?.draftDocument?.nextActions?.[0]?.description ||
          "The first version should make the customer feel more in control immediately.",
      },
      moat: {
        moatType: "Founder expertise",
        edge: moatSummary,
        incumbentGap:
          normalizeSectionList(positioning?.keyDifferentiators || positioning?.differentiators)[0] ||
          "Incumbents optimize for broader workflows, not this exact user and moment.",
        startupsToStudy: [],
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
          route: index === 0 ? "/pmf-lab" : "/waitlist",
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

  artifact.draftDocument.gatePreview = buildArtifactGatePreview(artifact);
  artifact.dashboardContext = buildDraftDashboardContext(artifact);
  return artifact;
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
        actionUrl: confidence === "low" ? "/pmf-lab" : artifact.draftDocument.nextActions[0]?.route || "/waitlist",
        priority: 12,
        type: "action" as const,
      },
      {
        title: confidence === "low" ? "Pressure-test the pain in PMF Lab" : "Capture demand with Waitlist Maker",
        description:
          confidence === "low"
            ? "Run interviews and demand checks against the exact segment the draft recommends."
            : "Use the ICP Draft language to create a clear waitlist message before you build more.",
        reason: "The best next move should follow from the draft, not from generic startup advice.",
        actionUrl: confidence === "low" ? "/pmf-lab" : "/waitlist",
        priority: 11,
        type: "action" as const,
      },
      {
        title: "Get founder-context help from a mentor",
        description: "Use the draft to ask sharper questions about the segment, pain, and offer.",
        reason: "A first ICP usually improves fastest when someone challenges the assumptions directly.",
        actionUrl: "/community/mentor-marketplace",
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
    version: 3,
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
    `Specific segment: ${guided.specificity}`,
    `Core frustration: ${guided.pain}`,
    `Current workaround: ${guided.workaround}`,
    `Solution sentence: ${buildGuidedSolutionSentence(guided.persona.role, guided.solutionCompletion)}`,
    `Market context: ${buildMarketContextLabel(guided.marketContext)}`,
    `Founder edge: ${guided.founderEdge}`,
  ].join("\n\n");
}
