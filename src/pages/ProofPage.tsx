import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import Footer from '@/components/Footer';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePublishedProofCases, usePublishedProofMetrics } from '@/hooks/useProof';
import { captureEvent } from '@/lib/analytics';
import { COMPETITIVE_HARDENING_FLAGS } from '@/config/competitiveHardeningFlags';

const verificationLabel = {
  founder_reported: 'Founder reported',
  corroborated: 'Imported / corroborated',
  platform_verified: 'Platform verified',
} as const;

export default function ProofPage() {
  const cases = usePublishedProofCases();
  const metrics = usePublishedProofMetrics();

  if (!COMPETITIVE_HARDENING_FLAGS.proofPublishing) return <div className="min-h-screen bg-background"><Navigation /><main className="container mx-auto max-w-3xl px-4 pt-28"><Card><CardContent className="py-12 text-center text-muted-foreground">The verified proof library is temporarily unavailable while publishing is paused.</CardContent></Card></main><Footer /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Founder Evidence and Outcomes | Creatives Takeover</title><meta name="description" content="Consent-controlled founder cases showing the assumption, action, evidence, changed decision, and external outcome." /></Helmet>
      <Navigation />
      <main className="container mx-auto max-w-6xl space-y-12 px-4 pb-20 pt-28">
        <header className="max-w-4xl">
          <Badge variant="outline"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Evidence, not testimonials</Badge>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">What founders changed after talking to the market.</h1>
          <p className="mt-4 text-lg text-muted-foreground">Every published case follows one traceable chain: assumption → action → evidence → changed decision → external outcome. Verification labels describe what we can actually substantiate.</p>
        </header>

        {metrics.data?.length ? <section className="grid gap-4 md:grid-cols-3">{metrics.data.map((metric) => <Card key={metric.id}><CardHeader><CardTitle className="text-3xl">{metric.value}{metric.unit === 'percent' ? '%' : ''}</CardTitle></CardHeader><CardContent><p className="font-medium">{metric.label}</p><p className="mt-2 text-xs text-muted-foreground">{metric.cohort_label} · {metric.period_start} to {metric.period_end} · n={metric.denominator} · {metric.source_systems.join(', ')}</p></CardContent></Card>)}</section> : null}

        <section className="grid gap-6 md:grid-cols-2">
          {cases.isLoading ? <p className="text-muted-foreground">Loading verified cases…</p> : cases.data?.length ? cases.data.map((item) => (
            <Card key={item.id} className="flex h-full flex-col">
              <CardHeader><div className="flex items-center justify-between gap-3"><Badge variant="secondary">{verificationLabel[item.verification_mode]}</Badge><CheckCircle2 className="h-5 w-5 text-primary" /></div><CardTitle className="mt-3">{item.title}</CardTitle></CardHeader>
              <CardContent className="flex flex-1 flex-col"><p className="text-muted-foreground">{item.summary}</p><p className="mt-4 text-sm"><strong>Decision changed:</strong> {item.decision_changed}</p><p className="mt-2 text-sm"><strong>Outcome:</strong> {item.external_outcome}</p><Link className="mt-6 inline-flex items-center text-sm font-semibold text-primary" to={`/proof/${item.slug}`} onClick={() => captureEvent('proof_case_study_viewed', { proof_case_id: item.id, source: 'proof_index' })}>Read the evidence chain <ArrowRight className="ml-1 h-4 w-4" /></Link></CardContent>
            </Card>
          )) : <Card className="md:col-span-2"><CardContent className="py-10 text-center text-muted-foreground">Verified cases are being consented and reviewed. Nothing is published until its evidence and public identity are approved.</CardContent></Card>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
