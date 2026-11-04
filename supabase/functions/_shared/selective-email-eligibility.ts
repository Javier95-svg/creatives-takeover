export const STAGE_KEYS = ["IDENTITY", "PROTOTYPE", "VALIDATING", "BUILDING", "LAUNCH", "TRACTION", "FUNDRAISING"] as const;
export const STAGE_TOPICS = [
  "Define your founder direction", "Make a prototype people can try",
  "Validate the problem with real conversations", "Build the next useful version",
  "Prepare your launch", "Find a repeatable growth signal", "Prepare for fundraising",
] as const;
export const STAGE_SUBJECTS = [
  "A clear next step for your idea", "One prototype step worth finishing",
  "Your next customer validation step", "Your next build step",
  "One launch task to finish", "Your next traction experiment",
  "One fundraising preparation step",
] as const;

export function eligibleStage(userType: string | null, assignedStage: number | null): number | null {
  return (userType === "founder" || userType === "builder") &&
    Number.isInteger(assignedStage) && assignedStage !== null &&
    assignedStage >= 1 && assignedStage <= 7 ? assignedStage : null;
}

export function hasStageGuidanceConsent(enabled: boolean | null, optedInAt: string | null): boolean {
  return enabled === true && typeof optedInAt === "string" && !Number.isNaN(Date.parse(optedInAt));
}
