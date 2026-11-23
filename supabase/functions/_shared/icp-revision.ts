/**
 * PMF findings carried into an ICP revision (project memory plan, phase 3).
 *
 * PMF Lab's "narrow" and "pivot" decisions send the founder back to ICP
 * Builder. Since phase 0 the ICP pages show the finding; this hands the same
 * finding to the model that rewrites the draft, so the revision is built on
 * what the conversations showed instead of starting from the old draft alone.
 * The server reads the PMF result itself (owner and evidence case checked);
 * the browser only says which evidence case and decision.
 */

export type IcpRevisionDecision = 'narrow' | 'pivot';
export interface IcpRevisionRequest { decision: IcpRevisionDecision; validationContextId: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseIcpRevision(value: unknown): IcpRevisionRequest | null {
  if (!value || typeof value !== 'object') return null;
  const { decision, validationContextId } = value as Record<string, unknown>;
  if (decision !== 'narrow' && decision !== 'pivot') return null;
  if (typeof validationContextId !== 'string' || !UUID.test(validationContextId)) return null;
  return { decision, validationContextId };
}

const texts = (value: unknown, count: number): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim().slice(0, 240)).slice(0, count)
    : [];
const text = (value: unknown, max = 500) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

const MEANING: Record<IcpRevisionDecision, string> = {
  narrow: 'there is demand, but for a narrower group or problem than the previous draft described',
  pivot: 'the evidence points to a different problem or customer than the previous draft described',
};

/** The prompt block for a PMF result. Pure, for tests. */
export function formatIcpRevisionBlock(decision: IcpRevisionDecision, analysis: Record<string, unknown>, score: number | null): string {
  const strongest = texts(analysis.buyingSignals, 3).length ? texts(analysis.buyingSignals, 3) : texts(analysis.strengths, 3);
  const heldBack = texts(analysis.commonObjections, 3).length ? texts(analysis.commonObjections, 3) : texts(analysis.gaps, 3);
  const lines = [
    'PMF LAB FINDINGS TO APPLY',
    `The founder is revising this ICP because PMF Lab's verdict on their customer conversations was "${decision}"${score !== null ? ` (evidence score ${Math.round(score)}/100)` : ''}: ${MEANING[decision]}.`,
  ];
  const summary = text(analysis.summaryInsight);
  if (summary) lines.push(`What the evidence showed: ${summary}`);
  if (strongest.length) lines.push(`Where demand was strongest:\n${strongest.map((item) => `- ${item}`).join('\n')}`);
  if (heldBack.length) lines.push(`What held it back:\n${heldBack.map((item) => `- ${item}`).join('\n')}`);
  const next = text(analysis.nextExperiment, 300);
  if (next) lines.push(`Next test PMF Lab suggested: ${next}`);
  lines.push(
    'Revise the customer and problem so they match where the evidence showed demand, and say in the draft what changed and why.',
    'These findings come from the founder\'s own logged conversations: treat them as founder_input, never as external_source, and keep confidence capped accordingly.',
  );
  return lines.join('\n');
}

// deno-lint-ignore no-explicit-any
type Db = { from: (relation: string) => any };

export async function loadIcpRevisionContext(db: Db, userId: string, revision: IcpRevisionRequest | null): Promise<string | null> {
  if (!revision) return null;
  try {
    const { data, error } = await db.from('pmf_analysis_results')
      .select('pmf_score, analysis_data')
      .eq('user_id', userId)
      .eq('validation_context_id', revision.validationContextId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as { pmf_score: number | null; analysis_data: Record<string, unknown> | null };
    return formatIcpRevisionBlock(revision.decision, row.analysis_data ?? {}, row.pmf_score === null ? null : Number(row.pmf_score));
  } catch (error) {
    console.warn('[icp-revision] PMF findings unavailable; revising without them', error instanceof Error ? error.message : String(error));
    return null;
  }
}
