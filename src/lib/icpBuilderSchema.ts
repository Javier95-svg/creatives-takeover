import { z } from "zod";

export const icpInputFormSchema = z.object({
  problemStatement: z.string().trim().min(18, "Describe the painful moment with more detail.").max(4000),
  targetAudience: z.string().trim().min(12, "Name the segment who feels this problem most.").max(3000),
  currentBehavior: z.string().trim().min(12, "Explain what they do today instead.").max(3000),
  desiredOutcome: z.string().trim().min(12, "Explain what outcome they are trying to get.").max(3000),
  solutionDifferentiator: z.string().trim().min(12, "Explain why your approach is structurally better.").max(3000),
  founderEdge: z.string().trim().min(12, "Explain why you are positioned to win now.").max(3000),
});

export type IcpInputSchema = z.infer<typeof icpInputFormSchema>;

export const getIcpFieldLabel = (field: keyof IcpInputSchema) => {
  const labels: Record<keyof IcpInputSchema, string> = {
    problemStatement: "painful moment",
    targetAudience: "ideal customer",
    currentBehavior: "current workaround",
    desiredOutcome: "desired outcome",
    solutionDifferentiator: "structural advantage",
    founderEdge: "founder edge",
  };

  return labels[field];
};

export const buildIcpBusinessDescription = (formData: IcpInputSchema) => [
  `Painful moment: ${formData.problemStatement}`,
  `Ideal customer: ${formData.targetAudience}`,
  `Current workaround: ${formData.currentBehavior}`,
  `Desired outcome: ${formData.desiredOutcome}`,
  `Structural advantage: ${formData.solutionDifferentiator}`,
  `Why this founder can win now: ${formData.founderEdge}`,
].join("\n\n");
