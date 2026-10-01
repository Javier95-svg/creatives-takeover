import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkflowSummary({ title, objective, evidence, next, action, onAction, example }: {
  title: string; objective: string; evidence: string; next: string; action: string; onAction: () => void; example?: string;
}) {
  return <section aria-label={title} className="space-y-5 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-background p-5 sm:p-6">
    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    <div className="grid gap-5 sm:grid-cols-2">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current objective</p><p className="mt-2 text-base leading-relaxed">{objective}</p></div>
      <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence and results</p><p className="mt-2 text-sm leading-relaxed">{evidence}</p></div>
    </div>
    <div className="flex flex-col gap-4 border-t border-primary/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your next action</p><p className="mt-1 text-sm leading-relaxed">{next}</p></div>
      <Button className="min-h-11 shrink-0 whitespace-normal text-left" onClick={onAction}>{action}<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" /></Button>
    </div>
    {example && <details className="text-sm"><summary className="cursor-pointer rounded py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">See an example</summary><p className="mt-2 rounded-lg bg-muted p-3 leading-relaxed"><strong>Illustrative example — not your data: </strong>{example}</p></details>}
  </section>;
}
