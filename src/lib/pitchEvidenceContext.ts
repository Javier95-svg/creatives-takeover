export interface PitchEvidenceOutcomeRow {
  tool: string;
  artifact_id: string;
  status: string;
  quality_checks?: Record<string, unknown> | null;
  evidence_manifest?: { sources?: unknown[] } | null;
  updated_at?: string | null;
}

const TOOL_LABELS: Record<string, string> = {
  pmf_lab: 'PMF Lab',
  mvp_builder: 'MVP Builder',
  gtm_strategist: 'GTM Strategist',
  traction_engine: 'Traction Engine',
};

function formatCheck(key: string, value: unknown): string | null {
  const label = key.replaceAll('_', ' ');
  if (value === true) return label;
  if (typeof value === 'number' && Number.isFinite(value)) return `${label}: ${value}`;
  if (typeof value === 'string' && value.trim() && value.length <= 80) return `${label}: ${value.trim()}`;
  return null;
}

export function buildPitchEvidenceContext(rows: PitchEvidenceOutcomeRow[]): string {
  const newestByTool = new Map<string, PitchEvidenceOutcomeRow>();
  for (const row of rows) {
    if (!TOOL_LABELS[row.tool] || newestByTool.has(row.tool)) continue;
    newestByTool.set(row.tool, row);
  }

  return [...newestByTool.values()].map((row) => {
    const checks = Object.entries(row.quality_checks ?? {})
      .map(([key, value]) => formatCheck(key, value))
      .filter((value): value is string => Boolean(value))
      .slice(0, 8);
    const sourceCount = Array.isArray(row.evidence_manifest?.sources)
      ? row.evidence_manifest!.sources!.length
      : 0;
    const date = row.updated_at ? row.updated_at.slice(0, 10) : 'unknown date';
    const details = [...checks, `evidence sources: ${sourceCount}`].join('; ');
    return `[${TOOL_LABELS[row.tool]} | artifact ${row.artifact_id} | ${row.status} | ${date}] ${details}`;
  }).join('\n').slice(0, 6000);
}
