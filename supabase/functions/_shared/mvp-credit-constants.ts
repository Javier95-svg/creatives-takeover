export const MVP_CREDIT_COSTS = {
  APP_BUILDER_GENERATE: 15,
  APP_BUILDER_REFINE: 4,
  APP_BUILDER_DEBUG: 3,
  APP_BUILDER_ADD_PAGE: 6,
  APP_BUILDER_ADD_FEATURE: 8,
  APP_BUILDER_DESIGN_OVERHAUL: 8,
  APP_BUILDER_DEPLOY: 3,
  APP_BUILDER_RESTORE: 1,
  APP_BUILDER_EXPORT: 0,
  APP_BUILDER_CHAT: 1,
  APP_BUILDER_GITHUB_EDIT: 3,
} as const;

export type MVPCreditFeature = keyof typeof MVP_CREDIT_COSTS;

export const MVP_MONTHLY_CREDITS_BY_TIER = {
  rookie: 0,
  starter: 30,
  rising: 75,
  pro: 150,
} as const;

export const MVP_CREDIT_PACKS = {
  mvp_pack_micro: { credits: 30, price_cents: 900, label: "Micro MVP Pack", featured: false },
  mvp_pack_builder: { credits: 100, price_cents: 2500, label: "Builder MVP Pack", featured: true },
  mvp_pack_growth: { credits: 220, price_cents: 4900, label: "Growth MVP Pack", featured: false },
  mvp_pack_scale: { credits: 500, price_cents: 9900, label: "Scale MVP Pack", featured: false },
} as const;

