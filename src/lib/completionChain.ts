/** Enable only after deploying the concept publication migration and outcome service. */
export function isCompletionChainEnabled(): boolean {
  return import.meta.env.VITE_COMPLETION_CHAIN_V1 === 'true';
}
