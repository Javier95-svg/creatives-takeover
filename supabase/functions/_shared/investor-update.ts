export type EvidenceQuality = 'platform-verified' | 'corroborated' | 'founder-reported' | 'missing';
export type Audience = 'stakeholder' | 'fundraising';

export interface EvidenceItem {
  key: string;
  label: string;
  value: string | number | null;
  quality: EvidenceQuality;
  source: string;
  observedAt?: string | null;
  change?: number | null;
}

export interface ReportSections {
  summary: string;
  wins: string[];
  productProgress: string[];
  traction: string[];
  acquisition: string[];
  revenueRetention: string[];
  challenges: string[];
  priorities: string[];
  asks: string[];
  runway: string;
  useOfCapital: string;
}

const clean = (value: unknown, max = 1200) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function normalizeSections(value: unknown): ReportSections {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const list = (key: string) => Array.isArray(source[key])
    ? (source[key] as unknown[]).map((item) => clean(item, 600)).filter(Boolean).slice(0, 12)
    : [];
  return {
    summary: clean(source.summary, 2000), wins: list('wins'), productProgress: list('productProgress'),
    traction: list('traction'), acquisition: list('acquisition'), revenueRetention: list('revenueRetention'),
    challenges: list('challenges'), priorities: list('priorities'), asks: list('asks'),
    runway: clean(source.runway, 1200), useOfCapital: clean(source.useOfCapital, 1200),
  };
}

export function deterministicSections(
  audience: Audience,
  company: { name: string; description?: string | null },
  evidence: EvidenceItem[],
): ReportSections {
  const present = evidence.filter((item) => item.quality !== 'missing' && item.value !== null && item.value !== '');
  const byPrefix = (prefix: string) => present.filter((item) => item.key.startsWith(prefix));
  const sentence = (item: EvidenceItem) => `${item.label}: ${item.value}${typeof item.change === 'number' ? ` (${item.change >= 0 ? '+' : ''}${item.change}% from the previous period)` : ''}.`;
  const traction = byPrefix('traction.').map(sentence);
  const metrics = byPrefix('metric.').map(sentence);
  const experiments = byPrefix('experiment.').map(sentence);
  const milestones = byPrefix('milestone.').map(sentence);
  const customers = byPrefix('customer.').map(sentence);
  const readiness = byPrefix('readiness.').map(sentence);
  const pitch = byPrefix('pitch.').map(sentence);
  const context = clean(company.description, 500);
  return {
    summary: audience === 'fundraising'
      ? `${company.name}${context ? ` — ${context}` : ''}. This update summarises recorded progress and fundraising readiness for the reporting period.`
      : `${company.name} monthly stakeholder update based on evidence recorded in Creatives Takeover.`,
    wins: [...milestones, ...customers.slice(0, 2), ...traction.slice(0, 2)].slice(0, 5),
    productProgress: [...milestones, ...customers].slice(0, 5),
    traction: [...traction, ...metrics].slice(0, 8),
    acquisition: experiments.slice(0, 6),
    revenueRetention: [...metrics.filter((line) => /revenue|customer|active|retention/i.test(line)), ...customers].slice(0, 6),
    challenges: [], priorities: [], asks: [], runway: readiness.join(' '),
    useOfCapital: audience === 'fundraising' ? [...readiness, ...pitch].join(' ') : '',
  };
}

export function finalizedSnapshot(input: {
  audience: Audience; title: string; periodStart: string; periodEnd: string;
  sections: unknown; evidence: EvidenceItem[]; finalizedAt: string;
}) {
  const evidenceNotes = [...new Map(input.evidence
    .filter((item) => item.quality !== 'missing')
    .map((item) => [`${item.source}:${item.quality}`, {
      key: `${item.source}:${item.quality}`,
      label: item.source,
      quality: item.quality,
      source: item.source,
      observedAt: null,
    }])).values()];
  return {
    version: 1, audience: input.audience, title: clean(input.title, 160),
    period: { start: input.periodStart, end: input.periodEnd },
    sections: normalizeSections(input.sections),
    evidenceNotes,
    finalizedAt: input.finalizedAt,
    supportingAppendix: { label: 'Traction Ledger', path: '/traction-engine' },
  };
}
