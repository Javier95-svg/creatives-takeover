const enabledUnlessExplicitlyDisabled = (value: string | boolean | undefined) => value !== 'false' && value !== false;

// Vite supplies import.meta.env in the browser build. The fallback keeps the
// catalog importable by the repository's direct Node contract tests as well.
const runtimeEnv =
  (import.meta as ImportMeta & {
    env?: Record<string, string | boolean | undefined>;
  }).env ?? {};

export const COMPETITIVE_HARDENING_FLAGS = {
  categoryPositioningV2: enabledUnlessExplicitlyDisabled(runtimeEnv.VITE_CATEGORY_POSITIONING_V2),
  firstCustomerSprintV2: enabledUnlessExplicitlyDisabled(runtimeEnv.VITE_FIRST_CUSTOMER_SPRINT_V2),
  proofPublishing: enabledUnlessExplicitlyDisabled(runtimeEnv.VITE_PROOF_PUBLISHING),
  externalEvidenceImport: enabledUnlessExplicitlyDisabled(runtimeEnv.VITE_EXTERNAL_EVIDENCE_IMPORT),
  projectPackPriceVariant: runtimeEnv.VITE_PROJECT_PACK_PRICE_VARIANT === 'lower_price',
} as const;
