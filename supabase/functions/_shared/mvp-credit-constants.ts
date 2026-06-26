export const MVP_CREDIT_COSTS = {
  APP_BUILDER_GENERATE: 15,
  APP_BUILDER_REFINE: 4,
  APP_BUILDER_DEBUG: 3,
  APP_BUILDER_ADD_PAGE: 6,
  APP_BUILDER_ADD_FEATURE: 8,
  APP_BUILDER_DESIGN_OVERHAUL: 8,
  APP_BUILDER_DEPLOY: 5,
  APP_BUILDER_RESTORE: 1,
  APP_BUILDER_EXPORT: 0,
  APP_BUILDER_CHAT: 1,
  APP_BUILDER_GITHUB_EDIT: 3,
} as const;

export type MVPCreditFeature = keyof typeof MVP_CREDIT_COSTS;

// NOTE: The standalone "MVP Builder" credit wallet was retired in favour of a
// single unified platform credit wallet. MVP Builder actions are billed per
// action from the platform wallet (see mvp-builder-credit-reservations). The
// per-action MVP_CREDIT_COSTS above are still used for that pricing; the old
// separate monthly-grant and pack exports have been removed.

