import type { IcpDraftSource } from './icpBuilderSession';

/**
 * One line that says what an ICP draft's sources actually are. It used to
 * promise "real customer discussions" on every draft, while community search
 * (Reddit) was not configured and the only sources were competitor pages.
 */
export function icpSourcesSummary(sources: IcpDraftSource[]): string {
  const community = sources.some((source) => source.type === 'community');
  const pages = sources.some((source) => source.type !== 'community');
  if (community && pages) return 'From customer discussions and competitor and market pages found for this draft.';
  if (community) return 'From customer discussions found for this draft.';
  return 'From competitor and market pages found for this draft. No customer discussions were found, so test the pain in interviews.';
}

/** Shown when a draft has no outside sources at all. */
export const ICP_NO_SOURCES_NOTICE =
  'No outside sources were found for this draft. Treat it as a hypothesis to test in customer interviews.';
