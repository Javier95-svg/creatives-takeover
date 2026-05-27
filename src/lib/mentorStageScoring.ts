import type { FounderStageId } from "./stageDiagnostic";

export type MentorStageScoringInput = {
  expertise?: string[] | null;
};

const STAGE_EXPERTISE_BOOSTS: Record<FounderStageId, string[]> = {
  1: ["Strategy", "Product Development", "Design"],
  2: ["Strategy", "Product Development", "Design"],
  3: ["Strategy", "Sales", "Growth Marketing"],
  4: ["Product Development", "Technology", "Design"],
  5: ["Growth Marketing", "Sales", "Business Development"],
  6: ["Growth Marketing", "Sales", "Operations"],
  7: ["Fundraising", "Finance", "Strategy"],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function scoreMentorForFounderStage(
  mentor: MentorStageScoringInput,
  assignedStage?: FounderStageId | null,
) {
  if (!assignedStage) {
    return { stageScore: 0, matchedStageExpertise: [] as string[] };
  }

  const expertise = mentor.expertise ?? [];
  const normalizedExpertise = new Set(expertise.map(normalize));
  const desiredExpertise = STAGE_EXPERTISE_BOOSTS[assignedStage] ?? [];
  const matchedStageExpertise = desiredExpertise.filter((area) => normalizedExpertise.has(normalize(area)));

  return {
    stageScore: matchedStageExpertise.length * 18,
    matchedStageExpertise,
  };
}
