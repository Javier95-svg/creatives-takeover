import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cohortResult, type CohortMeasurement } from '@/lib/coreTools';
import { COHORT_EXAMPLES } from '@/lib/coreToolsExperience';

export default function CohortInput({ value, onChange }: { value: CohortMeasurement | null; onChange: (value: CohortMeasurement | null) => void }) {
  const [business, setBusiness] = useState('software');
  const draft = value ?? { cohortSize: null, returned: null, periodStart: '', periodEnd: '', startEvent: '', returnEvent: '', windowDays: 7 };
  const result = cohortResult(value);
  const update = (patch: Partial<CohortMeasurement>) => onChange({ ...draft, ...patch });
  const preset = COHORT_EXAMPLES.find(item => item.id === business)!;
  const daysLeft = Math.max(1, Math.ceil((Date.parse(draft.periodEnd) - Date.now()) / 86400000));
  const invalidCounts = draft.returned != null && draft.cohortSize != null && draft.returned > draft.cohortSize;
  return <section className="space-y-5 rounded-xl border p-4 md:col-span-2">
    <div><h3 className="font-semibold">Do the same customers come back?</h3><p className="mt-1 text-sm text-muted-foreground">A cohort is a group of customers who started together. Follow that same group to measure whether they return.</p></div>
    <details open={!value} className="rounded-lg bg-muted/40 p-3"><summary className="cursor-pointer py-1 text-sm font-medium">Start with a measurement example</summary>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-sm">Business type<select className="mt-1 min-h-11 w-full rounded-md border bg-background p-2" value={business} onChange={event => setBusiness(event.target.value)}>{COHORT_EXAMPLES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <Button variant="outline" onClick={() => onChange({ startEvent: preset.startEvent, returnEvent: preset.returnEvent, windowDays: preset.windowDays, periodStart: '', periodEnd: '', cohortSize: null, returned: null })}>Use this example</Button></div>
      <p className="mt-2 text-xs text-muted-foreground">Suggested definitions only; no sample results are added. Applying an example clears existing dates and counts so you can measure a new group.</p>
    </details>
    <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 text-sm font-medium">1. Who started, and what counts as returning?</legend>
      {(['startEvent','returnEvent'] as const).map(key => <label key={key} className="space-y-1 text-sm"><span>{key === 'startEvent' ? 'What did customers do first?' : 'What should those customers do again?'}</span><Input placeholder={key === 'startEvent' ? 'First purchase' : 'Another purchase'} value={draft[key]} onChange={e => update({ [key]: e.target.value })} /></label>)}
    </fieldset>
    <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 text-sm font-medium">2. When will you measure the return?</legend>
      <label className="space-y-1 text-sm"><span>Starting date (UTC)</span><Input type="date" value={draft.periodStart.slice(0,10)} onChange={e => { const start = e.target.value ? `${e.target.value}T00:00:00Z` : ''; update({ periodStart: start, periodEnd: start && draft.windowDays > 0 && draft.windowDays <= 365 ? new Date(Date.parse(start) + draft.windowDays * 86400000).toISOString() : '' }); }} /></label>
      <label className="space-y-1 text-sm"><span>Days to observe this group</span><Input type="number" min="1" max="365" step="1" value={draft.windowDays} onChange={e => { const days = Number(e.target.value); update({ windowDays: days, periodEnd: draft.periodStart && days >= 1 && days <= 365 ? new Date(Date.parse(draft.periodStart) + days * 86400000).toISOString() : draft.periodEnd }); }} /></label>
      <label className="space-y-1 text-sm sm:col-span-2"><span>Observation ends (UTC)</span><Input type="date" min={draft.periodStart.slice(0,10)} value={draft.periodEnd.slice(0,10)} onChange={e => update({ periodEnd: e.target.value ? `${e.target.value}T00:00:00Z` : '' })} /></label>
    </fieldset>
    <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 text-sm font-medium">3. Count the same people</legend>
      {(['cohortSize','returned'] as const).map(key => <label key={key} className="space-y-1 text-sm"><span>{key === 'cohortSize' ? 'How many customers started?' : 'How many of those customers returned?'}</span><Input type="number" min={key === 'cohortSize' ? 1 : 0} max={key === 'returned' ? draft.cohortSize ?? undefined : undefined} step="1" aria-invalid={key === 'returned' && invalidCounts} value={draft[key] ?? ''} onChange={e => update({ [key]: e.target.value === '' ? null : Number(e.target.value) })} /></label>)}
    </fieldset>
    <p className="rounded-lg bg-muted p-3 text-sm" role="status">{invalidCounts ? 'The number returning cannot exceed the starting group.' : result.status === 'complete' ? `${Math.round(result.rate! * 100)}% returned: ${draft.returned} of ${draft.cohortSize} customers.` : result.status === 'pending' ? `Too early to measure. This group needs another ${daysLeft} day${daysLeft === 1 ? '' : 's'} of observation.` : 'Not measured yet. Define the group, dates and counts above; an empty value is not a zero.'}</p>
    <p className="text-xs text-muted-foreground">Editing a connected measurement makes it a manual entry. Leave counts empty when the answer is unknown.</p>
  </section>;
}
