export const ANGEL_SECTOR_OPTIONS = [
  "B2C",
  "B2B",
  "Healthcare",
  "Fitness",
  "Leisure",
  "Entertainment",
  "Education",
  "Software",
  "Technology",
  "AI",
  "Human Resources",
  "Retail & Commerce",
] as const;

export type AngelSector = (typeof ANGEL_SECTOR_OPTIONS)[number];
