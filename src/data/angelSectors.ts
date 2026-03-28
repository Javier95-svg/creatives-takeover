export const ANGEL_SECTOR_OPTIONS = [
  "SaaS",
  "AI & Machine Learning",
  "FinTech",
  "HealthTech",
  "CleanTech & Climate",
  "E-Commerce & Marketplace",
  "EdTech",
  "Cybersecurity",
  "Gaming & Entertainment",
  "Web3 & Blockchain",
  "BioTech & Life Sciences",
  "HR Tech & Future of Work",
  "DeepTech & Hardware",
  "Mobility & Logistics",
  "Consumer & D2C",
] as const;

export type AngelSector = (typeof ANGEL_SECTOR_OPTIONS)[number];
