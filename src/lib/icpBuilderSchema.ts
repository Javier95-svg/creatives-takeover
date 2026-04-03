import { z } from 'zod';

export const icpInputFormSchema = z.object({
  problemStatement: z.string().trim().min(12, 'Describe the painful problem with more detail.').max(4000),
  targetAudience: z.string().trim().min(8, 'Name the segment you want to serve.').max(3000),
  currentBehavior: z.string().trim().min(8, 'Explain what they do today instead.').max(3000),
  solutionDifferentiator: z.string().trim().min(8, 'Explain why your approach is better.').max(3000),
  marketTiming: z.string().trim().min(8, 'Explain why this matters now.').max(3000),
  painCost: z.string().trim().max(3000).optional().default(''),
  founderEdge: z.string().trim().max(3000).optional().default(''),
  nextGoals: z.string().trim().max(3000).optional().default(''),
  mainCompetitors: z.string().trim().max(3000).optional().default(''),
  industry: z.string().trim().max(200).optional().default(''),
  revenueModel: z.string().trim().max(200).optional().default(''),
  currentTraction: z.string().trim().max(3000).optional().default(''),
});

export type IcpInputSchema = z.infer<typeof icpInputFormSchema>;

export const getIcpFieldLabel = (field: keyof IcpInputSchema) => {
  const labels: Record<keyof IcpInputSchema, string> = {
    problemStatement: 'problem statement',
    targetAudience: 'target audience',
    currentBehavior: 'current behavior',
    solutionDifferentiator: 'solution differentiator',
    marketTiming: 'market timing',
    painCost: 'pain cost',
    founderEdge: 'founder edge',
    nextGoals: 'next goals',
    mainCompetitors: 'main competitors',
    industry: 'industry',
    revenueModel: 'revenue model',
    currentTraction: 'current traction',
  };

  return labels[field];
};

export const buildIcpBusinessDescription = (formData: IcpInputSchema) => {
  const descriptionParts: string[] = [];

  descriptionParts.push(`Problem: ${formData.problemStatement}`);
  descriptionParts.push(`Target Audience: ${formData.targetAudience}`);
  descriptionParts.push(`Current Behavior: ${formData.currentBehavior}`);
  descriptionParts.push(`Solution Differentiator: ${formData.solutionDifferentiator}`);
  descriptionParts.push(`Market Timing: ${formData.marketTiming}`);

  if (formData.industry) {
    descriptionParts.push(`Industry: ${formData.industry}`);
  }
  if (formData.revenueModel) {
    descriptionParts.push(`Revenue Model: ${formData.revenueModel}`);
  }
  if (formData.mainCompetitors) {
    descriptionParts.push(`Main Competitors: ${formData.mainCompetitors}`);
  }
  if (formData.painCost) {
    descriptionParts.push(`Pain Cost: ${formData.painCost}`);
  }
  if (formData.founderEdge) {
    descriptionParts.push(`Founder Edge: ${formData.founderEdge}`);
  }
  if (formData.currentTraction) {
    descriptionParts.push(`Current Traction: ${formData.currentTraction}`);
  }
  if (formData.nextGoals) {
    descriptionParts.push(`Next Goals: ${formData.nextGoals}`);
  }

  return descriptionParts.join('\n\n');
};
