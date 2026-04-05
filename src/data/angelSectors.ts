export const ANGEL_SECTOR_OPTIONS = [
  "AI & Machine Learning",
  "BioTech & Life Sciences",
  "CleanTech & Climate",
  "Consumer & D2C",
  "Cybersecurity",
  "DeepTech & Hardware",
  "E-Commerce & Marketplace",
  "EdTech",
  "FinTech",
  "Gaming & Entertainment",
  "HealthTech",
  "HR Tech & Future of Work",
  "Mobility & Logistics",
  "SaaS",
  "Web3 & Blockchain",
] as const;

export type AngelSector = (typeof ANGEL_SECTOR_OPTIONS)[number];
