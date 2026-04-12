import { z } from "zod";

export const ICP_MARKET_CONTEXT_OPTIONS = [
  {
    value: "different_customer",
    label: "Solutions exist, but they're built for a different customer",
  },
  {
    value: "too_expensive_or_complex",
    label: "Solutions exist, but they're too expensive or too complex",
  },
  {
    value: "manual_or_no_product",
    label: "People solve this manually — no real product exists",
  },
  {
    value: "new_problem_recently",
    label: "This is a new problem that didn't exist until recently",
  },
] as const;

export type IcpMarketContextValue = (typeof ICP_MARKET_CONTEXT_OPTIONS)[number]["value"];

export const guidedPersonaSchema = z.object({
  role: z.string().trim().min(2, "Refine the role.").max(160),
  industry: z.string().trim().min(2, "Refine the industry.").max(160),
  experience: z.string().trim().min(2, "Refine the experience band.").max(240),
});

export const guidedIcpInputSchema = z.object({
  seed: z.string().trim().min(8, "Add a rough startup idea.").max(4000),
  persona: guidedPersonaSchema,
  specificity: z.string().trim().min(8, "Narrow the customer segment further.").max(3000),
  pain: z.string().trim().min(12, "Describe the emotional version of the pain.").max(3000),
  workaround: z.string().trim().min(6, "Describe the current workaround.").max(3000),
  solutionCompletion: z.string().trim().min(6, "Complete the product sentence.").max(3000),
  marketContext: z.enum([
    "different_customer",
    "too_expensive_or_complex",
    "manual_or_no_product",
    "new_problem_recently",
  ]),
  founderEdge: z.string().trim().min(12, "Explain the founder edge.").max(3000),
});

export const fastIcpInputSchema = z.object({
  description: z.string().trim().min(40, "Add 3-5 sentences so the draft has enough signal.").max(5000),
});

export type GuidedIcpInputSchema = z.infer<typeof guidedIcpInputSchema>;
export type FastIcpInputSchema = z.infer<typeof fastIcpInputSchema>;

export interface IcpPersonaSuggestion {
  role: string;
  industry: string;
  experience: string;
  suggestedPain: string;
}

export function buildGuidedSolutionSentence(
  role: string | null | undefined,
  solutionCompletion: string | null | undefined,
) {
  const personaRole = (role || "this customer").trim();
  const completion = (solutionCompletion || "").trim();

  if (!completion) {
    return `My product helps ${personaRole} to`;
  }

  return `My product helps ${personaRole} to ${completion}`;
}

export function buildMarketContextLabel(value: IcpMarketContextValue | null | undefined) {
  return ICP_MARKET_CONTEXT_OPTIONS.find((option) => option.value === value)?.label ?? "";
}
