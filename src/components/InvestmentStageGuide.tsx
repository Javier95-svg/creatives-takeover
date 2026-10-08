import { INVESTMENT_STAGES, INVESTMENT_STAGE_HINTS } from '@/lib/roleProfileSchema';

/**
 * Plain-language meaning of the funding rounds under a stage picker. First-time
 * founders told us they had to search what "Pre-Seed" meant before choosing.
 */
export function InvestmentStageGuide({ selected }: { selected?: string | null }) {
  const hint = selected && selected in INVESTMENT_STAGE_HINTS
    ? INVESTMENT_STAGE_HINTS[selected as keyof typeof INVESTMENT_STAGE_HINTS]
    : 'The funding round you would raise next. Not sure? Pre-Seed fits anyone still at the idea or prototype stage.';
  return <div className="mt-2 text-xs text-muted-foreground">
    <p>{hint}</p>
    <details className="mt-1">
      <summary className="cursor-pointer font-medium text-foreground/80 hover:text-foreground">What do these stages mean?</summary>
      <dl className="mt-2 space-y-1.5">
        {INVESTMENT_STAGES.map((stage) => <div key={stage}>
          <dt className="inline font-medium text-foreground">{stage}: </dt>
          <dd className="inline">{INVESTMENT_STAGE_HINTS[stage]}</dd>
        </div>)}
      </dl>
    </details>
  </div>;
}
