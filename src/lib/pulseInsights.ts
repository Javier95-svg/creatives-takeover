import { FOUNDER_TOOL_CATALOG } from '../config/founderToolCatalog.ts';

// "Pulse noticed": daily observations about the founder's project. Shared by
// the Pulse endpoint (validation before saving) and the app (display).

export type PulseInsightType = 'risk' | 'opportunity' | 'follow_up' | 'contradiction';
export interface PulseInsight {
  id: string;
  type: PulseInsightType;
  text: string;
  /** The context key the observation is based on: an outcome stage, "memory" or "tasks". */
  evidence: string;
  /** What the founder can ask Pulse to go deeper. */
  ask: string;
  /** Optional tool to open, validated against the catalogue. */
  toolKey?: string;
}

const TYPES: readonly PulseInsightType[] = ['risk', 'opportunity', 'follow_up', 'contradiction'];
export const INSIGHT_TYPE_LABEL: Record<PulseInsightType, string> = {
  risk: 'Risk', opportunity: 'Opportunity', follow_up: 'Follow up', contradiction: 'Contradiction',
};

const clip = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/**
 * Keeps at most three insights with a known type, real text, and evidence the
 * founder actually has. Unknown tools are dropped, never shown as links.
 */
export function parsePulseInsights(raw: unknown, evidenceKeys: readonly string[]): PulseInsight[] {
  const list = Array.isArray(raw) ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { insights?: unknown }).insights) ? (raw as { insights: unknown[] }).insights : [];
  const seen = new Set<string>();
  const result: PulseInsight[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const value = item as Record<string, unknown>;
    const type = value.type as PulseInsightType;
    const text = clip(value.text, 200);
    const evidence = clip(value.evidence, 40);
    if (!TYPES.includes(type) || text.length < 10 || !evidenceKeys.includes(evidence) || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    const toolKey = typeof value.toolKey === 'string' && FOUNDER_TOOL_CATALOG.some(tool => tool.key === value.toolKey) ? value.toolKey : undefined;
    // Saved insights keep their id (dismissals refer to it); new ones are numbered.
    const id = typeof value.id === 'string' && /^i\d{1,2}$/.test(value.id) ? value.id : `i${result.length + 1}`;
    result.push({ id, type, text, evidence, ask: clip(value.ask, 160) || text, ...(toolKey ? { toolKey } : {}) });
    if (result.length === 3) break;
  }
  return result;
}
