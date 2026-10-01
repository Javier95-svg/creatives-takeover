import { Input } from '@/components/ui/input';
import { cohortResult, type CohortMeasurement } from '@/lib/coreTools';

export default function CohortInput({ value, onChange }: { value: CohortMeasurement | null; onChange: (value: CohortMeasurement | null) => void }) {
  const draft = value ?? { cohortSize: null, returned: null, periodStart: '', periodEnd: '', startEvent: 'First product use', returnEvent: 'Product use', windowDays: 7 };
  const result = cohortResult(value);
  const update = (patch: Partial<CohortMeasurement>) => onChange({ ...draft, ...patch });
  return <section className="space-y-3 rounded-xl border p-4 md:col-span-2"><h3 className="font-semibold">Returning-customer cohort</h3><p className="text-xs text-muted-foreground">Count the same customers at the start and return event. Choose product use, repeat purchase, or repeat engagement to fit your business. Manual entries are labelled user supplied.</p><div className="grid gap-3 sm:grid-cols-2">
    {(['startEvent','returnEvent'] as const).map(key => <label key={key} className="space-y-1 text-xs"><span>{key === 'startEvent' ? 'Starting event' : 'Return event'}</span><Input value={draft[key]} onChange={e => update({ [key]: e.target.value })} /></label>)}
    {(['periodStart','periodEnd'] as const).map(key => <label key={key} className="space-y-1 text-xs"><span>{key === 'periodStart' ? 'Cohort starts (UTC)' : 'Observation window ends (UTC)'}</span><Input type="date" value={draft[key].slice(0, 10)} onChange={e => update({ [key]: e.target.value ? `${e.target.value}T00:00:00Z` : '' })} /></label>)}
    <label className="space-y-1 text-xs"><span>Return window in days</span><Input type="number" min="1" max="365" value={draft.windowDays} onChange={e => update({ windowDays: Number(e.target.value) })} /></label>
    {(['cohortSize','returned'] as const).map(key => <label key={key} className="space-y-1 text-xs"><span>{key === 'cohortSize' ? 'Customers in starting cohort' : 'Customers from that cohort who returned'}</span><Input type="number" min="0" value={draft[key] ?? ''} onChange={e => update({ [key]: e.target.value === '' ? null : Number(e.target.value) })} /></label>)}
  </div><p className="text-sm" aria-live="polite">{result.status === 'complete' ? `${Math.round(result.rate! * 100)}% returned` : result.status === 'pending' ? 'Pending: the observation period has not finished.' : 'Unknown: complete the cohort definition and counts.'}</p></section>;
}
