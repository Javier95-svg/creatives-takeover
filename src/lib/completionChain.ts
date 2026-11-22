/**
 * The concept-page chain: an ICP draft becomes a Demo Studio concept page
 * (headline, subheadline and call to action pre-filled by
 * start_completion_concept_v1) that can be published without an interactive
 * demo or a recorded video, plus the journey hand-offs around it.
 *
 * It sat behind VITE_COMPLETION_CHAIN_V1 until 2026-11-22. By then its
 * prerequisites were live in production (start_completion_concept_v1, the
 * demo_studio_launch_publish_ready trigger, journey-outcome-service), yet no
 * founder had ever published a page: without the chain, publishing required a
 * published demo and a recorded VSL. Always on now; the env var is no longer
 * read, so a stale "false" in a deployment cannot hide it again.
 */
export function isCompletionChainEnabled(): boolean {
  return true;
}
