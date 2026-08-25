/**
 * Whether a founder's recommended first action should be publishing.
 *
 * Every activation intent except `publish_proof` ends in a document only its
 * author reads, which is the half of the product ChatGPT already does. Routing
 * early founders to a published URL instead is the bet that the platform's real
 * advantage is witnessing a stranger's response, so it is gated rather than
 * simply switched: the proof-loop funnel has to show it raised the share of
 * founders who reach a real stranger, not just moved them to a step they abandon.
 *
 * Mirrors `isFirstCustomerSprintKillSwitchEnabled`: the env var is an explicit
 * kill switch that beats the flag in both directions, and PostHog is the
 * production allowlist. Kept free of analytics imports so the pure
 * recommendation logic it feeds stays loadable by node:test.
 */
export function isPublishProofFirstEnabled(posthogFlag?: boolean): boolean {
  if (import.meta.env.VITE_PUBLISH_PROOF_FIRST === 'false') return false;
  return posthogFlag === true || import.meta.env.VITE_PUBLISH_PROOF_FIRST === 'true';
}

/** The PostHog boolean flag that controls the rollout. */
export const PUBLISH_PROOF_FIRST_FLAG = 'publish-proof-first';
