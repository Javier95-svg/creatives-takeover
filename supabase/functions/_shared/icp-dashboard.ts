type NullableString = string | null | undefined;

export type IcpDraftTaskSeed = {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  route: string;
};

export type IcpDraftRecommendationSeed = {
  title: string;
  description: string;
  reason: string;
  actionUrl: string;
  priority: number;
  type: string;
};

type IcpArtifactLike = {
  founderInputs?: {
    guided?: {
      persona?: {
        industry?: string | null;
      } | null;
    } | null;
  } | null;
  draftDocument?: {
    customer?: {
      personaName?: string | null;
      roleLine?: string | null;
      metaLine?: string | null;
    } | null;
    pain?: {
      quote?: string | null;
    } | null;
    build?: {
      valueProposition?: string | null;
    } | null;
    confidence?: {
      level?: string | null;
    } | null;
    nextActions?: Array<{
      title?: string | null;
      description?: string | null;
      route?: string | null;
    }> | null;
  } | null;
  dashboardContext?: {
    message?: string | null;
    suggestedStage?: string | null;
    prioritizedTasks?: Array<{
      title?: string | null;
      description?: string | null;
      priority?: string | null;
      route?: string | null;
    }> | null;
    recommendations?: Array<{
      title?: string | null;
      description?: string | null;
      reason?: string | null;
      actionUrl?: string | null;
      priority?: number | null;
      type?: string | null;
    }> | null;
  } | null;
};

export type IcpArtifactSummary = {
  industry: string;
  personaName: string;
  roleLine: string;
  corePainPoint: string;
  suggestedStage: string;
  confidenceLevel: string;
  valueProposition: string;
};

function cleanText(value: NullableString, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function uniqueByTitle<T extends { title: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function readIcpArtifact(value: unknown): IcpArtifactLike | null {
  if (!value || typeof value !== "object") return null;
  const artifact = value as IcpArtifactLike;
  if (!artifact.draftDocument?.customer?.roleLine) return null;
  return artifact;
}

export function summarizeIcpArtifact(
  artifact: IcpArtifactLike,
  fallbackIndustry?: NullableString,
  fallbackAudience?: NullableString,
): IcpArtifactSummary {
  return {
    industry: cleanText(
      artifact.founderInputs?.guided?.persona?.industry,
      cleanText(fallbackIndustry, "Emerging market"),
    ),
    personaName: cleanText(artifact.draftDocument?.customer?.personaName, "Ideal customer"),
    roleLine: cleanText(
      artifact.draftDocument?.customer?.roleLine,
      cleanText(fallbackAudience, "Founder-aligned buyer"),
    ),
    corePainPoint: cleanText(
      artifact.draftDocument?.pain?.quote,
      "A painful problem still needs sharper validation.",
    ),
    suggestedStage: cleanText(artifact.dashboardContext?.suggestedStage, "IDENTITY"),
    confidenceLevel: cleanText(artifact.draftDocument?.confidence?.level, "medium"),
    valueProposition: cleanText(
      artifact.draftDocument?.build?.valueProposition,
      "Turn the core customer pain into a clear market offer.",
    ),
  };
}

export function buildIcpTaskSeeds(
  artifact: IcpArtifactLike,
  summary: IcpArtifactSummary,
): IcpDraftTaskSeed[] {
  const prioritized = Array.isArray(artifact.dashboardContext?.prioritizedTasks)
    ? artifact.dashboardContext?.prioritizedTasks ?? []
    : [];
  const nextActions = Array.isArray(artifact.draftDocument?.nextActions)
    ? artifact.draftDocument?.nextActions ?? []
    : [];

  const taskSeeds = prioritized.length > 0
    ? prioritized.map((task, index) => ({
        title: cleanText(task.title, `Move step ${index + 1}`),
        description: cleanText(task.description, `Advance the ${summary.roleLine} workflow.`),
        priority:
          task.priority === "high" || task.priority === "low" || task.priority === "medium"
            ? task.priority
            : index === 0
              ? "high"
              : index < 3
                ? "medium"
                : "low",
        route: cleanText(task.route, index === 0 ? "/waitlist" : "/pmf-lab"),
      }))
    : nextActions.map((task, index) => ({
        title: cleanText(task.title, `Advance ${summary.personaName}`),
        description: cleanText(task.description, `Use the ICP Draft to move the next market test.`),
        priority: index === 0 ? "high" : index < 3 ? "medium" : "low",
        route: cleanText(task.route, index === 0 ? "/waitlist" : "/pmf-lab"),
      }));

  const fallbackTasks: IcpDraftTaskSeed[] = [
    {
      title: `Validate the pain for ${summary.personaName}`,
      description: `Use PMF Lab or customer calls to confirm why "${summary.corePainPoint}" is urgent now.`,
      priority: "high",
      route: "/pmf-lab",
    },
    {
      title: `Position the offer for the ${summary.industry} segment`,
      description: `Translate the ICP Draft into messaging that makes the value proposition easy to understand.`,
      priority: "medium",
      route: "/waitlist",
    },
    {
      title: "Keep the draft visible while you execute",
      description: "Use My Files as the working source of truth for this segment.",
      priority: "low",
      route: "/dashboard#my-files",
    },
  ];

  const merged = uniqueByTitle([...(taskSeeds.slice(0, 5)), ...fallbackTasks]);
  return merged.slice(0, 5);
}

export function buildIcpRecommendationSeeds(
  artifact: IcpArtifactLike,
  summary: IcpArtifactSummary,
  tasks: IcpDraftTaskSeed[],
): IcpDraftRecommendationSeed[] {
  const firstRoute = tasks[0]?.route || "/dashboard#my-files";
  const message = cleanText(
    artifact.dashboardContext?.message,
    `Your ${summary.personaName} ICP Draft is now driving the dashboard.`,
  );

  const recommendationSeeds = Array.isArray(artifact.dashboardContext?.recommendations)
    ? artifact.dashboardContext?.recommendations ?? []
    : [];

  const mapped = recommendationSeeds.map((item, index) => ({
    title: cleanText(item.title, index === 0 ? message : `Execute step ${index + 1}`),
    description: cleanText(
      item.description,
      `Keep the next move tied to the ${summary.roleLine} pain you identified.`,
    ),
    reason: cleanText(item.reason, "This recommendation is anchored to the saved ICP Draft."),
    actionUrl: cleanText(item.actionUrl, tasks[index]?.route || firstRoute),
    priority: typeof item.priority === "number" ? item.priority : 100 - index,
    type: cleanText(item.type, "action"),
  }));

  const fallback: IcpDraftRecommendationSeed[] = [
    {
      title: message,
      description: `The dashboard is prioritizing ${summary.industry} work for ${summary.personaName} from day one.`,
      reason: "ICP-first founders should see the draft shape the first visible dashboard state.",
      actionUrl: firstRoute,
      priority: 110,
      type: "action",
    },
    {
      title: "Review the full ICP Draft in My Files",
      description: "Keep the saved draft open while you plan your next test and messaging moves.",
      reason: "The draft should stay accessible as a working document, not disappear after signup.",
      actionUrl: "/dashboard#my-files",
      priority: 109,
      type: "resource",
    },
    {
      title: `Test the offer against "${summary.corePainPoint}"`,
      description: "Use the top pain point to shape your next experiment before you build anything broader.",
      reason: "The most useful next move should stay attached to the pain, not to a generic checklist.",
      actionUrl: tasks[0]?.route || "/pmf-lab",
      priority: 108,
      type: "action",
    },
  ];

  return uniqueByTitle([...mapped, ...fallback]).slice(0, 5);
}

export function buildDashboardFilePreviewPayload(
  summary: IcpArtifactSummary,
  tasks: IcpDraftTaskSeed[],
) {
  return {
    personaName: summary.personaName,
    roleLine: summary.roleLine,
    painLine: summary.corePainPoint,
    industry: summary.industry,
    suggestedStage: summary.suggestedStage,
    confidenceLevel: summary.confidenceLevel,
    nextRoute: tasks[0]?.route || "/dashboard#my-files",
  };
}
