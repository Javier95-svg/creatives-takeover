import { CheckCircle2, PackageCheck } from 'lucide-react';

import { OUTCOME_WORKLOADS, PROJECT_PACKS } from '@/config/planCatalog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PricingWorkloadExamples() {
  return <section className="container mx-auto px-4 py-12 sm:px-6"><div className="mx-auto max-w-3xl text-center"><Badge variant="outline">Credits translated into outcomes</Badge><h2 className="mt-4 text-3xl font-bold">Know what a workload costs before checkout.</h2><p className="mt-3 text-muted-foreground">Monthly allowances reset on the billing date. One-time project packs persist until used.</p></div><div className="mx-auto mt-8 grid max-w-6xl gap-5 lg:grid-cols-3">{OUTCOME_WORKLOADS.map((workload) => <Card key={workload.id}><CardHeader><CardTitle className="flex items-start justify-between gap-3 text-lg"><span>{workload.label}</span><Badge>{workload.credits} credits</Badge></CardTitle></CardHeader><CardContent>{workload.actions.map((action) => <p key={action} className="mt-2 flex gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{action}</p>)}</CardContent></Card>)}</div><div className="mx-auto mt-6 max-w-4xl rounded-xl border bg-card/70 p-5"><p className="flex items-center gap-2 font-semibold"><PackageCheck className="h-5 w-5 text-primary" /> Persistent project packs</p><p className="mt-2 text-sm text-muted-foreground">{PROJECT_PACKS.map((pack) => `${pack.label}: ${pack.credits} credits / $${pack.priceUsd}`).join(' · ')}</p></div></section>;
}
