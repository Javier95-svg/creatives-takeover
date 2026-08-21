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
  sourceId?: string;
  type: "community" | "competitor" | "market";
  title: string;
  url: string | null;
  detail: string | null;
}

export interface DraftEnrichment {
  marketSignals: string[];
  competitorLinks: Array<{ name: string; url: string | null }>;
  sources: DraftSource[];
  /**
   * Whether any retrieval source was reachable at all.
   *
   * "We looked and found nothing" is a real signal about the niche. "We never
   * looked, because no credential is configured" is a fact about our own
   * infrastructure and must not be scored against the founder. Defaults to
   * true so callers that omit it keep the stricter, evidence-expecting path.
   */
  retrievalAvailable?: boolean;
}

type SectionConfidence = "high" | "medium" | "low";

type SectionEvidence = {
  confidence: SectionConfidence;
  evidence: string;
  missingSignalPrompt: string | null;
  provenance: "external_source" | "founder_input" | "model_inference";
  sourceIds: string[];
};

type DraftDocument = {
  gatePreview: {
    personaName: string;
    roleLine: string;
    painLine: string;
  };
  decisionBrief: {
    primarySegment: string;
    nonFitSegment: string;
    rankedPains: Array<{ rank: number; pain: string; evidence: string }>;
    buyingTrigger: string;
    currentAlternative: string;
    reachableChannels: string[];
    interviewValidationPlan: Array<{ step: number; question: string; successSignal: string }>;
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
  market: {
    category: string;
    whoBuysToday: string;
    demandSignal: string;
    whyNow: string;
    evidence: SectionEvidence;
  };
  pricing: {
    model: string;
    /** A concrete number or range. The whole point is to commit to one. */
    hypothesis: string;
    anchor: string;
    budgetOwner: string;
    evidence: SectionEvidence;
  };
  risks: DraftRisk[];
  experiment: {
    title: string;
    hypothesis: string;
    method: string;
    sampleSize: string;
    /** Stated before the test runs, so the result cannot be rationalised after. */
    passSignal: string;
    failSignal: string;
    timeboxDays: number;
  };
  recommendation: {
    headline: string;
    reasoning: string;
    nextMove: string;
  };
  confidence: {
    level: SectionConfidence;
    summary: string;
    missingSignals: string[];
  };
  nextActions: Array<{ title: string; description: string; route: string }>;
  sources: DraftSource[];
  /** "unavailable" means retrieval never ran, not that the niche is empty. */
  evidenceRetrieval: "ok" | "unavailable";
  viabilityAssessment: ViabilityAssessment;
  fieldProvenance: FieldProvenanceMap;
};

/**
 * Which fields the model actually answered, and which ones we backfilled.
 *
 * Every backfill below is readable prose ("The cost of leaving this pain
 * unsolved still needs to be made explicit"), which made a missing field
 * indistinguishable from an answered one to anything reading the document.
 * Downstream scoring treated that filler as a filled field and handed out full
 * credit for it, so entire scoring pillars were constants. Recording the
 * distinction here is what lets the scorer and the outcome contract tell a real
 * answer from a placeholder.
 */
export type RiskType =
  | "demand"
  | "willingness_to_pay"
  | "competition"
  | "channel"
  | "execution";

export const RISK_TYPES: readonly RiskType[] = [
  "demand",
  "willingness_to_pay",
  "competition",
  "channel",
  "execution",
] as const;

export interface DraftRisk {
  rank: number;
  type: RiskType;
  risk: string;
  /**
   * The observation that would settle it. A risk a founder cannot test is a
   * worry, not a risk, and belongs in neither the document nor the experiment.
   */
  disprovedBy: string;
}

export type FieldProvenance = "model" | "fallback";
export type FieldProvenanceMap = Record<string, FieldProvenance>;

export type ViabilityDimensionKey =
  | "painSeverity"
  | "willingnessToPay"
  | "competitiveIntensity"
  | "reachability"
  | "founderEdge";

export interface ViabilityDimension {
  /** 0 - 100. Low is a legitimate, expected answer. */
  score: number;
  rationale: string;
  /** Whether the judgement rests on retrieved evidence or on model inference. */
  basis: "evidence" | "inference";
  sourceIds: string[];
}

export type ViabilityAssessment = Record<ViabilityDimensionKey, ViabilityDimension>;

export const VIABILITY_DIMENSION_KEYS: readonly ViabilityDimensionKey[] = [
  "painSeverity",
  "willingnessToPay",
  "competitiveIntensity",
  "reachability",
  "founderEdge",
] as const;

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

/**
 * `cleanText` that records whether the value came from the model or the fallback.
 *
 * Paths are dotted and stable ("pain.costOfInaction"), because readers on the
 * other side of the wire look fields up by path rather than walking the object.
 */
function createFieldTracker() {
  const provenance: FieldProvenanceMap = {};
  const track = (path: string, value: unknown, fallback: string) => {
    const answered = typeof value === "string" && value.trim().length > 0;
    provenance[path] = answered ? "model" : "fallback";
    return answered ? (value as string).trim() : fallback;
  };
  return { provenance, track };
}

function normalizeViabilityDimension(value: unknown, sourceIds: string[]): ViabilityDimension {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawScore = typeof raw.score === "number" && Number.isFinite(raw.score) ? raw.score : null;
  const referenced = Array.isArray(raw.sourceIds)
    ? raw.sourceIds.filter((id): id is string => typeof id === "string" && sourceIds.includes(id))
    : [];
  // An omitted dimension is not a neutral one. Defaulting to a midpoint would
  // let a model that skipped the question inflate the verdict, so an unanswered
  // dimension scores at the bottom of the "unknown" range instead.
  return {
    score: rawScore === null ? 25 : Math.round(Math.min(Math.max(rawScore, 0), 100)),
    rationale: cleanText(raw.rationale, "The model did not assess this dimension."),
    basis: raw.basis === "evidence" && referenced.length > 0 ? "evidence" : "inference",
    sourceIds: referenced,
  };
}

function normalizeViabilityAssessment(value: unknown, sourceIds: string[]): ViabilityAssessment {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return VIABILITY_DIMENSION_KEYS.reduce((assessment, key) => {
    assessment[key] = normalizeViabilityDimension(raw[key], sourceIds);
    return assessment;
  }, {} as ViabilityAssessment);
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
    provenance: SectionEvidence["provenance"];
    sourceIds?: string[];
  },
  citableSourceIds: string[] = [],
  confidenceCeiling: (value: SectionConfidence) => SectionConfidence = (value) => value,
): SectionEvidence {
  // Only ids we actually retrieved survive. The model is asked to cite, but a
  // citation it invented would otherwise let a section claim grounding it does
  // not have, and grounding is what the confidence ceiling keys off.
  const claimed = Array.isArray(value?.sourceIds)
    ? value.sourceIds.filter((id): id is string => typeof id === "string" && citableSourceIds.includes(id))
    : [];
  const sourceIds = claimed.length > 0 ? claimed : fallback.sourceIds ?? [];
  const confidence = confidenceCeiling(normalizeConfidence(value?.confidence, fallback.confidence ?? "medium"));
  return {
    confidence: confidence === "high" && sourceIds.length === 0 ? "medium" : confidence,
    evidence: cleanText(value?.evidence, fallback.evidence),
    missingSignalPrompt:
      typeof value?.missingSignalPrompt === "string" ? value.missingSignalPrompt : fallback.missingSignalPrompt ?? null,
    provenance: sourceIds.length > 0 ? "external_source" : fallback.provenance,
    sourceIds,
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
      (guided.founderEdge ?? "").trim().length < 20 ? "Founder edge may still be too broad." : null,
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
  // Split by whether we can actually cite the thing. The previous prompt listed
  // model-recalled competitor names under a heading that called them "retrieved
  // competitor pages", which invited the model to treat its own recall as
  // external corroboration and rate its confidence accordingly.
  const citableSources = enrichment.sources.filter((source) => Boolean(source.url));
  const uncitedCompetitors = enrichment.competitorLinks.filter((item) => !item.url);
  const marketSignalBlock = enrichment.marketSignals.length > 0
    ? enrichment.marketSignals.map((signal) => `- ${signal}`).join("\n")
    : "- No external market signals were available for this run.";
  const sourceBlock = citableSources.length > 0
    ? citableSources
        .map((source) => `- [${source.sourceId}] (${source.type}) ${source.title}${source.detail ? ` — ${source.detail}` : ""} — ${source.url}`)
        .join("\n")
    : "- Nothing was retrieved for this run. No section may claim high confidence.";
  const uncitedBlock = uncitedCompetitors.length > 0
    ? uncitedCompetitors.map((item) => `- ${item.name}`).join("\n")
    : "- None.";

  return `You are generating a founder-ready ICP Draft strong enough to replace a paid strategy session.
Return valid JSON only.

The draft is a decision chain. It must run end to end and finish with a call:
market -> competitors -> customer -> willingness to pay -> risks -> experiment -> recommendation.

Each link must explicitly answer:
1. The market: what category this is, who already pays in it, and why now.
2. The competitive landscape: direct competitors, what they do well, and the specific gap the founder can exploit.
3. The exact ideal customer profile with behavior, motivation, and trigger context.
4. The single most important pain point to solve first.
5. A willingness-to-pay hypothesis with a real number attached.
6. The ranked risks that would kill this, each with the observation that settles it.
7. One experiment the founder can run this week, with its pass bar written down first.
8. A recommendation: what to actually do, stated plainly.

Critical rules:
- Every claim must be anchored in the founder evidence below.
- Use the founder's own language when possible.
- OMIT any field you cannot determine. Leave it out of the JSON entirely.
  Do NOT write a sentence describing that the field is unknown, and do NOT
  write filler like "this still needs to be clarified". An omitted field is
  recorded as an open question and shown to the founder as one. A filler
  sentence is indistinguishable from an answer and actively misleads them.
- Never fake precision or fill a gap with vague startup language.
- Competition must only name plausible direct competitors. If confidence is low, keep the list short or empty and explain what signal is missing.
- Keep the document sharp and readable in under 5 minutes.

Evidence rules:
- Each "evidence" object must return "sourceIds": the ids of the retrieved
  sources that support that section, drawn only from the RETRIEVED EVIDENCE
  block below.
- A section may only claim "confidence":"high" if its sourceIds is non-empty.
  With no retrieved sources, the highest honest confidence is "medium", and
  "low" where the founder gave you little to work with.
- Never cite an id that is not listed, and never invent a URL.

Return this exact JSON shape:
{
  "status":"draft_ready",
  "draftDocument":{
    "gatePreview":{"personaName":"string","roleLine":"string","painLine":"string"},
    "decisionBrief":{
      "primarySegment":"string",
      "nonFitSegment":"string",
      "rankedPains":[{"rank":1,"pain":"string","evidence":"string"}],
      "buyingTrigger":"string",
      "currentAlternative":"string",
      "reachableChannels":["string"],
      "interviewValidationPlan":[{"step":1,"question":"string","successSignal":"string"}]
    },
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
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null","sourceIds":["string"]}
    },
    "pain":{
      "quote":"string",
      "rootCause":"string",
      "whyItHurts":"string",
      "triggerMoment":"string",
      "costOfInaction":"string",
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null","sourceIds":["string"]}
    },
    "build":{
      "valueProposition":"string",
      "replaces":["string"],
      "coreFeatures":[{"title":"string","description":"string"}],
      "outcome":"string",
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null","sourceIds":["string"]}
    },
    "moat":{
      "moatType":"string",
      "edge":"string",
      "edgeSource":"string",
      "whyHardToCopy":"string",
      "incumbentGap":"string",
      "startupsToStudy":[{"name":"string","url":"string|null"}],
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null","sourceIds":["string"]}
    },
    "competition":{
      "summary":"string",
      "directCompetitors":[{"name":"string","url":"string|null","doesWell":"string","gap":"string"}],
      "exploitableGap":"string",
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null","sourceIds":["string"]}
    },
    "market":{
      "category":"string",
      "whoBuysToday":"string",
      "demandSignal":"string",
      "whyNow":"string",
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null","sourceIds":["string"]}
    },
    "pricing":{
      "model":"string",
      "hypothesis":"string",
      "anchor":"string",
      "budgetOwner":"string",
      "evidence":{"confidence":"high|medium|low","evidence":"string","missingSignalPrompt":"string|null","sourceIds":["string"]}
    },
    "risks":[{"rank":1,"type":"demand|willingness_to_pay|competition|channel|execution","risk":"string","disprovedBy":"string"}],
    "experiment":{
      "title":"string",
      "hypothesis":"string",
      "method":"string",
      "sampleSize":"string",
      "passSignal":"string",
      "failSignal":"string",
      "timeboxDays":7
    },
    "recommendation":{"headline":"string","reasoning":"string","nextMove":"string"},
    "confidence":{"level":"high|medium|low","summary":"string","missingSignals":["string"]},
    "nextActions":[{"title":"string","description":"string","route":"waitlist|pmf|mvp|gtm|mentor"}],
    "viabilityAssessment":{
      "painSeverity":{"score":0,"rationale":"string","basis":"evidence|inference","sourceIds":["string"]},
      "willingnessToPay":{"score":0,"rationale":"string","basis":"evidence|inference","sourceIds":["string"]},
      "competitiveIntensity":{"score":0,"rationale":"string","basis":"evidence|inference","sourceIds":["string"]},
      "reachability":{"score":0,"rationale":"string","basis":"evidence|inference","sourceIds":["string"]},
      "founderEdge":{"score":0,"rationale":"string","basis":"evidence|inference","sourceIds":["string"]}
    }
  },
  "enrichment":{"contradictionFlag":boolean,"mentorDomain":"string|null"}
}

How to score viabilityAssessment (0-100 each, and be willing to score low):
- These are a judgement about THIS BUSINESS, not about how complete the document
  is. A low score is a useful, expected answer. Do not cluster everything in the
  60-80 range. If the idea is weak, say so with the numbers.
- painSeverity: how expensive and how frequent the problem is for the customer.
  A mild annoyance people live with scores under 30 no matter how relatable it
  is. Reserve 80+ for pain that already costs money, time, or customers today.
- willingnessToPay: is there an existing budget line and a person who owns it?
  Consumers paying out of pocket for a nice-to-have score under 30. A business
  already paying for a worse tool scores high.
- competitiveIntensity: INVERTED. Score LOW when the category is crowded and
  commoditised, HIGH when the niche is genuinely underserved. A generic idea in
  a saturated consumer category (habit trackers, meal planners, to-do apps,
  budgeting apps) must score under 30.
- reachability: can this exact segment be reached repeatedly and affordably
  through a channel that already exists? "Everyone" is not reachable and scores
  under 25. A segment that gathers in a known place scores high.
- founderEdge: score on what the founder actually stated. If no specific
  advantage was given, score under 20 and say that plainly in the rationale.
  Do not invent an edge on their behalf.
- basis must be "evidence" only when sourceIds is non-empty; otherwise
  "inference".

Rules for output quality:
- The pain section must commit to one primary pain only.
- The customer section must describe a real buyer/operator in a real moment, not a broad market.
- The moat section must identify the source of the edge and why it is hard to copy.
- The competition section must be sharp, not encyclopedic.
- coreFeatures must be exactly 3 items.
- rankedPains must contain 3 pains in priority order and state the evidence for each rank.
- nonFitSegment must name the closest adjacent segment the founder should deliberately avoid first.
- interviewValidationPlan must contain exactly 5 concrete interview steps with a question and an observable success signal.
- nextActions must be concrete and usable in the next week.

Market:
- "category" must name the category a buyer would recognise, not a slogan.
- "whoBuysToday" must name who already spends money in this category. If nobody
  does, say that plainly: it is the single most important fact about the market.
- "demandSignal" must point at observable behaviour (spend, search, complaints,
  workarounds), not at market-size projections. Never quote a TAM figure you
  cannot cite from the RETRIEVED EVIDENCE block.
- "whyNow" must name a change that made this newly possible or newly urgent. If
  nothing changed, omit it rather than inventing a trend.

Pricing (willingness to pay):
- "hypothesis" MUST contain a specific number or range with a currency and a
  billing unit, e.g. "$40-80 per shop per month" or "$1,500 one-off per audit".
  A hypothesis without a number is useless and must be omitted entirely.
- "anchor" must name what this customer already pays today for the alternative,
  including the cost of the manual workaround in hours or wages. That anchor is
  what makes the number defensible.
- "budgetOwner" must name the role that signs off. "The user" is only correct
  for genuine consumer purchases; say so explicitly when it is.
- This is a hypothesis, not a price list. State it as something to test.

Risks:
- Return 3 to 5 risks, ranked with the most likely to kill the company first.
- Rank by what would end this, not by what is easiest to fix.
- "disprovedBy" must be an observation the founder could actually make in weeks,
  not a study. "Talk to users" is not an answer; name what they must hear.
- Do not pad the list with generic startup risks (competition from big tech,
  hiring, funding) unless they specifically threaten THIS idea.
- Include at least one risk drawn from the lowest-scoring viability dimension.

Experiment:
- Exactly one experiment. It must attack the #1 risk above, not a lesser one.
- "method" must be executable by one founder with no budget and no product.
- "sampleSize" must be a specific number of people or attempts.
- "passSignal" and "failSignal" must both be observable and mutually exclusive,
  and must be stated as counts or behaviours, never as sentiment.
- "timeboxDays" must be 14 or fewer.

Recommendation:
- "headline" is one sentence, under 100 characters, and must commit. Never hedge
  and never say "it depends".
- "reasoning" must cite the specific link in the chain that drove the call: the
  market, the competition, the pricing anchor, or the top risk.
- "nextMove" is the single thing to do first, this week.
- Do NOT state an overall verdict word or a score. The platform derives the
  verdict from the viability dimensions so that the number and the words can
  never disagree. Write the reasoning as if the reader can already see it.

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

RETRIEVED EVIDENCE (real, fetched for this run, safe to cite by id):
${sourceBlock}

MODEL-RECALLED COMPETITORS (unverified, no source, DO NOT cite as evidence):
${uncitedBlock}

Market signals (derived from the retrieved evidence above):
${marketSignalBlock}

Ground the pain quote, behaviors, "where to find them", and competitor claims in the RETRIEVED EVIDENCE block, and prefer the customers' actual wording from it. Anything in the MODEL-RECALLED block may be discussed as background but must never be presented as retrieved evidence and must never appear in a sourceIds array. Never invent a source or a URL that is not listed above.`;
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

/**
 * True when a price hypothesis actually names a figure.
 *
 * "Founders would likely pay a monthly subscription" is the sentence the model
 * reaches for when it does not know, and it is indistinguishable from a real
 * answer to every reader and every downstream check. Requiring a digit is a
 * crude test that happens to catch exactly this.
 */
function containsPriceFigure(value: unknown): boolean {
  return typeof value === "string" && /d/.test(value);
}

/** An experiment longer than a fortnight does not get run. */
function clampTimebox(value: unknown): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 7;
  return Math.min(Math.max(raw, 1), 14);
}

/**
 * Risks are not padded to a fixed length.
 *
 * Every other list in this document pads for layout stability, but an invented
 * risk is worse than a short list: it sends the founder to test something that
 * was never a threat. A single real risk beats five, three of which are filler.
 */
function normalizeRisks(value: unknown, track: (path: string, value: unknown, fallback: string) => string): DraftRisk[] {
  const candidates = Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
  const risks = candidates.slice(0, 5).map((item: any, index: number) => ({
    rank: index + 1,
    type: (RISK_TYPES as readonly string[]).includes(item?.type) ? (item.type as RiskType) : "execution",
    risk: track(`risks.${index}`, item?.risk, "An unnamed risk."),
    disprovedBy: cleanText(item?.disprovedBy, "Decide what observation would settle this before you test it."),
  }));

  if (risks.length > 0) return risks.filter((risk) => risk.risk !== "An unnamed risk.");

  // No risks at all is itself a finding, and the founder should see it framed
  // as one rather than as an empty panel.
  track("risks.0", null, "");
  return [{
    rank: 1,
    type: "demand",
    risk: "No risks were identified, which usually means the idea has not been described concretely enough to threaten.",
    disprovedBy: "Describe the idea in one specific sentence and re-run the assessment.",
  }];
}

function normalizeDraftDocument(parsed: Record<string, any>, enrichment: DraftEnrichment): DraftDocument {
  const overallConfidence = normalizeConfidence(parsed?.confidence?.level, "medium");
  const { provenance, track } = createFieldTracker();
  const citableSourceIds = enrichment.sources.filter((source) => Boolean(source.url)).map((source) => source.sourceId ?? "");
  // With nothing retrieved, "high" cannot be earned. The prompt says so, but the
  // prompt is a request and this is the guarantee.
  const confidenceCeiling = (value: SectionConfidence): SectionConfidence =>
    value === "high" && citableSourceIds.length === 0 ? "medium" : value;

  const document: DraftDocument = {
    gatePreview: {
      personaName: cleanText(parsed?.gatePreview?.personaName, cleanText(parsed?.customer?.personaName, "Ideal customer")),
      roleLine: cleanText(parsed?.gatePreview?.roleLine, cleanText(parsed?.customer?.roleLine, "Founder-aligned buyer")),
      painLine: cleanText(parsed?.gatePreview?.painLine, cleanText(parsed?.pain?.quote, "The core pain still needs sharper founder evidence.")),
    },
    decisionBrief: {
      primarySegment: track(
        "decisionBrief.primarySegment",
        parsed?.decisionBrief?.primarySegment ?? parsed?.customer?.roleLine,
        "The best-fit early customer still needs to be narrowed.",
      ),
      nonFitSegment: track(
        "decisionBrief.nonFitSegment",
        parsed?.decisionBrief?.nonFitSegment,
        "Adjacent customers without the same urgent trigger are not the first segment to serve.",
      ),
      rankedPains: Array.from({ length: 3 }, (_, index) => {
        const candidates = Array.isArray(parsed?.decisionBrief?.rankedPains)
          ? parsed.decisionBrief.rankedPains.filter((item: any) => item && typeof item === "object")
          : [];
        const item = candidates[index];
        // The list is always padded to 3 so the layout is stable, but each slot
        // records whether it was actually answered. Counting length alone was
        // how "three ranked pains" became a check that could never fail.
        return {
          rank: index + 1,
          pain: track(
            `decisionBrief.rankedPains.${index}`,
            item?.pain ?? (index === 0 ? parsed?.pain?.quote : null),
            index === 0
              ? "The primary pain still needs direct customer language."
              : `Secondary pain ${index + 1} still needs interview evidence.`,
          ),
          evidence: cleanText(
            item?.evidence,
            index === 0
              ? cleanText(parsed?.pain?.evidence?.evidence, "Grounded in founder input and pending customer validation.")
              : "Treat this ranking as an assumption until interviews confirm it.",
          ),
        };
      }),
      buyingTrigger: track(
        "decisionBrief.buyingTrigger",
        parsed?.decisionBrief?.buyingTrigger ?? parsed?.customer?.actionTrigger ?? parsed?.pain?.triggerMoment,
        "The buying trigger still needs validation.",
      ),
      currentAlternative: track(
        "decisionBrief.currentAlternative",
        parsed?.decisionBrief?.currentAlternative
          ?? (Array.isArray(parsed?.build?.replaces) && parsed.build.replaces[0] ? String(parsed.build.replaces[0]) : null),
        "The current manual or competing alternative still needs to be named in interviews.",
      ),
      reachableChannels: normalizeList(
        parsed?.decisionBrief?.reachableChannels ?? parsed?.customer?.whereToFind,
        5,
      ),
      interviewValidationPlan: Array.from({ length: 5 }, (_, index) => {
        const item = Array.isArray(parsed?.decisionBrief?.interviewValidationPlan)
          ? parsed.decisionBrief.interviewValidationPlan[index]
          : null;
        const defaultQuestions = [
          "Tell me about the last time this problem happened.",
          "What did you do instead, and what did that cost?",
          "What made the problem urgent enough to act on?",
          "Where would you look for a solution like this?",
          "What proof would make you try or pay for a first version?",
        ];
        return {
          step: index + 1,
          question: track(`decisionBrief.interviewValidationPlan.${index}`, item?.question, defaultQuestions[index]),
          successSignal: cleanText(item?.successSignal, "Capture a specific recent behavior, not a hypothetical preference."),
        };
      }),
    },
    customer: {
      personaName: track("customer.personaName", parsed?.customer?.personaName, "Ideal customer"),
      roleLine: track("customer.roleLine", parsed?.customer?.roleLine, "Founder-aligned buyer"),
      metaLine: cleanText(parsed?.customer?.metaLine, ""),
      summary: track("customer.summary", parsed?.customer?.summary, "The customer profile still needs a more specific description."),
      behaviors: normalizeList(parsed?.customer?.behaviors, 4),
      motivations: normalizeList(parsed?.customer?.motivations, 3),
      whereToFind: normalizeList(parsed?.customer?.whereToFind, 5),
      triggerContext: track("customer.triggerContext", parsed?.customer?.triggerContext, "The trigger context still needs clearer founder evidence."),
      actionTrigger: track("customer.actionTrigger", parsed?.customer?.actionTrigger, "The specific buying trigger still needs to be clarified."),
      evidence: buildSectionEvidence(parsed?.customer?.evidence, {
        confidence: overallConfidence,
        evidence: "Customer profile grounded in the founder evidence provided.",
        missingSignalPrompt: "What moment makes this customer actively search for a better solution?",
        provenance: "founder_input",
      }, citableSourceIds, confidenceCeiling),
    },
    pain: {
      quote: track("pain.quote", parsed?.pain?.quote, "The founder still needs to name one pain sharp enough to build around."),
      rootCause: track("pain.rootCause", parsed?.pain?.rootCause, "The root cause still needs a sharper explanation."),
      whyItHurts: track("pain.whyItHurts", parsed?.pain?.whyItHurts, "The consequence of this pain still needs clearer detail."),
      triggerMoment: track("pain.triggerMoment", parsed?.pain?.triggerMoment, "The trigger moment still needs a clearer founder example."),
      costOfInaction: track("pain.costOfInaction", parsed?.pain?.costOfInaction, "The cost of leaving this pain unsolved still needs to be made explicit."),
      evidence: buildSectionEvidence(parsed?.pain?.evidence, {
        confidence: overallConfidence,
        evidence: "Pain diagnosis grounded in the founder's pain and workaround inputs.",
        missingSignalPrompt: "Describe one recent moment where this pain caused delay, lost trust, or lost money.",
        provenance: "founder_input",
      }, citableSourceIds, confidenceCeiling),
    },
    build: {
      valueProposition: track("build.valueProposition", parsed?.build?.valueProposition, "The first product promise still needs to be made more concrete."),
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
      outcome: track("build.outcome", parsed?.build?.outcome, "The immediate customer outcome still needs a sharper articulation."),
      evidence: buildSectionEvidence(parsed?.build?.evidence, {
        confidence: overallConfidence,
        evidence: "Build recommendation grounded in the founder's stated problem and solution direction.",
        missingSignalPrompt: "What should the customer stop doing manually once this product works?",
        provenance: "model_inference",
      }, citableSourceIds, confidenceCeiling),
    },
    moat: {
      moatType: cleanText(parsed?.moat?.moatType, "Founder advantage"),
      edge: track("moat.edge", parsed?.moat?.edge, "The founder advantage still needs a clearer niche-specific explanation."),
      edgeSource: track("moat.edgeSource", parsed?.moat?.edgeSource, "The source of the advantage is not yet explicit enough."),
      whyHardToCopy: track("moat.whyHardToCopy", parsed?.moat?.whyHardToCopy, "Why this advantage is hard to copy still needs stronger proof."),
      incumbentGap: track("moat.incumbentGap", parsed?.moat?.incumbentGap, "The incumbent gap still needs to be stated more sharply."),
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
        provenance: "model_inference",
      }, citableSourceIds, confidenceCeiling),
    },
    competition: {
      summary: track("competition.summary", parsed?.competition?.summary, "The competitive landscape still needs more signal before it can be stated confidently."),
      // Retrieved competitors carry a URL and can be verified. Model-recalled
      // ones cannot, and are kept only as unlinked background: scoring counts
      // the linked ones, so recall alone can no longer earn differentiation
      // credit the way an invented list used to.
      directCompetitors: Array.isArray(parsed?.competition?.directCompetitors)
        ? parsed.competition.directCompetitors
            .filter((item: any) => item && typeof item === "object" && typeof item.name === "string")
            .slice(0, 3)
            .map((item: any) => {
              const name = cleanText(item?.name, "Competitor");
              const retrieved = enrichment.competitorLinks.find(
                (link) => link.url && link.name.toLowerCase() === name.toLowerCase(),
              );
              const claimed = typeof item?.url === "string" && item.url.trim().length > 0 ? item.url.trim() : null;
              return {
                name,
                // Prefer the URL we actually fetched. Only accept the model's
                // own URL when it matches something in the retrieved set.
                url: retrieved?.url
                  ?? (claimed && enrichment.sources.some((source) => source.url === claimed) ? claimed : null),
                doesWell: cleanText(item?.doesWell, "Recognized alternative in the broader category."),
                gap: cleanText(item?.gap, "The niche-specific gap still needs clearer evidence."),
              };
            })
        : enrichment.competitorLinks.slice(0, 3).map((item) => ({
            name: item.name,
            url: item.url,
            doesWell: "Recognized alternative in the broader category.",
            gap: "The niche-specific gap still needs clearer evidence.",
          })),
      exploitableGap: track("competition.exploitableGap", parsed?.competition?.exploitableGap, "The exploitable competitive gap still needs clearer founder or market evidence."),
      evidence: buildSectionEvidence(parsed?.competition?.evidence, {
        confidence: overallConfidence === "low" ? "low" : "medium",
        evidence:
          citableSourceIds.length > 0
            ? "Competition informed by founder evidence plus retrieved community and competitor sources."
            : "Competition inferred from founder evidence only; treat this section as provisional.",
        missingSignalPrompt: "Name the tools, services, or manual alternatives this customer uses today so the competitive landscape can be sharpened.",
        provenance: citableSourceIds.length > 0 ? "external_source" : "model_inference",
        sourceIds: citableSourceIds,
      }, citableSourceIds, confidenceCeiling),
    },
    market: {
      category: track("market.category", parsed?.market?.category, "The category this competes in still needs to be named."),
      whoBuysToday: track(
        "market.whoBuysToday",
        parsed?.market?.whoBuysToday,
        "Who already pays for something in this category still needs to be established.",
      ),
      demandSignal: track(
        "market.demandSignal",
        parsed?.market?.demandSignal,
        "No observable demand signal has been found for this idea yet.",
      ),
      whyNow: track("market.whyNow", parsed?.market?.whyNow, "What makes this urgent now rather than three years ago is still unstated."),
      evidence: buildSectionEvidence(parsed?.market?.evidence, {
        confidence: citableSourceIds.length > 0 ? overallConfidence : "low",
        evidence:
          citableSourceIds.length > 0
            ? "Market read informed by retrieved community and competitor sources."
            : "Market read inferred from founder evidence only; treat the sizing as unverified.",
        missingSignalPrompt: "What proof exists that people already spend money to solve this?",
        provenance: citableSourceIds.length > 0 ? "external_source" : "model_inference",
        sourceIds: citableSourceIds,
      }, citableSourceIds, confidenceCeiling),
    },
    pricing: {
      model: track("pricing.model", parsed?.pricing?.model, "How this would charge still needs to be decided."),
      // Guarded rather than tracked directly: a hypothesis with no number in it
      // is the failure mode the prompt warns about, and it reads as an answer.
      hypothesis: track(
        "pricing.hypothesis",
        containsPriceFigure(parsed?.pricing?.hypothesis) ? parsed.pricing.hypothesis : null,
        "No price hypothesis has been committed to yet. Pick a number before you test.",
      ),
      anchor: track(
        "pricing.anchor",
        parsed?.pricing?.anchor,
        "What this customer already spends on the current workaround is still unknown.",
      ),
      budgetOwner: track("pricing.budgetOwner", parsed?.pricing?.budgetOwner, "Who signs off on this spend still needs to be identified."),
      evidence: buildSectionEvidence(parsed?.pricing?.evidence, {
        confidence: "low",
        evidence: "Willingness to pay is a hypothesis until someone is asked for money.",
        missingSignalPrompt: "What does this customer pay today for the tool or workaround this replaces?",
        provenance: "model_inference",
      }, citableSourceIds, confidenceCeiling),
    },
    risks: normalizeRisks(parsed?.risks, track),
    experiment: {
      title: track("experiment.title", parsed?.experiment?.title, "The next experiment still needs to be designed."),
      hypothesis: track(
        "experiment.hypothesis",
        parsed?.experiment?.hypothesis,
        "State what you believe is true before you test it.",
      ),
      method: track("experiment.method", parsed?.experiment?.method, "The method for testing the top risk still needs to be chosen."),
      sampleSize: track("experiment.sampleSize", parsed?.experiment?.sampleSize, "Decide how many people you need to hear from."),
      passSignal: track(
        "experiment.passSignal",
        parsed?.experiment?.passSignal,
        "Write down what would count as a pass before you start.",
      ),
      failSignal: track(
        "experiment.failSignal",
        parsed?.experiment?.failSignal,
        "Write down what would count as a fail before you start.",
      ),
      // Clamped rather than defaulted: an experiment scoped past a fortnight is
      // a project, and founders stop running it.
      timeboxDays: clampTimebox(parsed?.experiment?.timeboxDays),
    },
    recommendation: {
      headline: track("recommendation.headline", parsed?.recommendation?.headline, "This idea needs more evidence before it earns a call."),
      reasoning: track(
        "recommendation.reasoning",
        parsed?.recommendation?.reasoning,
        "The draft did not commit to reasoning for a recommendation.",
      ),
      nextMove: track(
        "recommendation.nextMove",
        parsed?.recommendation?.nextMove ?? parsed?.experiment?.title,
        "Run the experiment above before making a build decision.",
      ),
    },
    confidence: {
      level: confidenceCeiling(overallConfidence),
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
    evidenceRetrieval: enrichment.retrievalAvailable === false ? "unavailable" : "ok",
    viabilityAssessment: normalizeViabilityAssessment(parsed?.viabilityAssessment, citableSourceIds),
    fieldProvenance: provenance,
  };

  return document;
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
    sources: (enrichment?.sources ?? []).map((source, index) => ({
      ...source,
      sourceId: source.sourceId || `source-${index + 1}`,
    })),
    retrievalAvailable: enrichment?.retrievalAvailable ?? true,
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
      version: 5,
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
