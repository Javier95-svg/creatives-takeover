import { useMemo } from 'react';

import { buildCompetitorBriefs, type GTMPlanV2 } from '@/lib/gtmV2';

/** What buyers use today instead of you, and how to answer the objection each one raises. */
export default function GTMCompetitorsPanel({ plan }: { plan: GTMPlanV2 }) {
  const competitors = useMemo(() => buildCompetitorBriefs(plan), [plan]);
  if (competitors.length === 0) {
    return <p className="text-sm text-muted-foreground">No alternatives named yet. Add competitors when you edit your answers and rebuild the plan.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {competitors.map((competitor) => (
        <div key={competitor.id} className="space-y-3 rounded-lg border border-border/60 p-4 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-foreground">{competitor.name}</p>
            <span className="text-xs text-muted-foreground">
              {competitor.lastVerifiedAt ? `Checked ${competitor.lastVerifiedAt.slice(0, 10)}` : 'Not checked against a source yet'}
            </span>
          </div>
          <p className="text-muted-foreground">{competitor.positioning}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-medium text-foreground">Where they are strong</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">{competitor.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <p className="font-medium text-foreground">Your opening</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">{competitor.gaps.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground">If a buyer says: {competitor.likelyObjection}</p>
            <p className="mt-1 text-muted-foreground">{competitor.recommendedResponse}</p>
          </div>
          {competitor.sourceUrls.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {competitor.sourceUrls.map((url, index) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-4 hover:underline">Source {index + 1}</a>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
