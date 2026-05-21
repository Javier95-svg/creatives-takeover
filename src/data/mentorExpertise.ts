export const MENTOR_EXPERTISE_OPTIONS = [
  "Product Development",
  "Growth Marketing",
  "Sales",
  "Business Development",
  "Fundraising",
  "Operations",
  "Strategy",
  "Finance",
  "Legal",
  "HR & Team Building",
  "Technology",
  "Design",
  "Content Creation",
] as const;

export type MentorExpertise = (typeof MENTOR_EXPERTISE_OPTIONS)[number];
