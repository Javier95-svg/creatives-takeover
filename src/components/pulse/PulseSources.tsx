import { PULSE_STAGES, validatePulseRetrievalSources, validatePulseSources, type PulseRetrievalReference, type PulseSourceReference } from '@/lib/pulseSources';

export function PulseSources({ sources }: { sources?: PulseSourceReference[] }) {
  const valid = validatePulseSources(sources);
  if (!valid.length) return null;
  return <details className="mt-3 text-xs text-muted-foreground">
    <summary className="cursor-pointer">Context provided to Pulse</summary>
    <ul className="mt-2 space-y-2">{valid.map(source => <li key={source.stage}>
      <span className="font-medium">{PULSE_STAGES[source.stage].title}</span>
      {source.state === 'available' ? <>
        {source.updatedAt && <span> · Saved {new Date(source.updatedAt).toLocaleDateString()}</span>}
        {source.basis && <p>{source.basis}</p>}
        <a className="underline underline-offset-2" href={source.stage === 'pmf' ? `/pmf-lab?outcome=${source.id}` : PULSE_STAGES[source.stage].route}>Open {PULSE_STAGES[source.stage].title}</a>
      </> : <span> · {source.state === 'missing' ? 'No current saved result' : 'Could not load this result'}</span>}
    </li>)}</ul>
  </details>;
}

export function PulseRetrievedSources({ sources }: { sources?: PulseRetrievalReference[] }) {
  const valid = validatePulseRetrievalSources(sources);
  if (!valid.length) return null;
  return <details className="mt-3 text-xs text-muted-foreground">
    <summary className="cursor-pointer">Verified sources used</summary>
    <ul className="mt-2 space-y-2">{valid.map(source => <li key={`${source.kind}:${source.id}`}>
      <a className="font-medium underline underline-offset-2" href={source.route}>{source.title}</a>
      <span> Â· {source.kind === 'pedia' ? 'Startup Pedia passage' : source.basis}</span>
      {source.updatedAt && <span> Â· Updated {new Date(source.updatedAt).toLocaleDateString()}</span>}
    </li>)}</ul>
  </details>;
}
