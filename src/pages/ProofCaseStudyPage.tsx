import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

import Footer from '@/components/Footer';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePublishedProofCase } from '@/hooks/useProof';

export default function ProofCaseStudyPage() {
  const { slug } = useParams();
  const proof = usePublishedProofCase(slug);
  const item = proof.data;

  return <div className="min-h-screen bg-background"><Navigation /><main className="container mx-auto max-w-4xl px-4 pb-20 pt-28">
    {!item ? <Card><CardContent className="py-12 text-center text-muted-foreground">{proof.isLoading ? 'Loading evidence…' : 'This case is not public or consent has been withdrawn.'}</CardContent></Card> : <>
      <Helmet><title>{item.title} | Founder Proof</title><meta name="description" content={item.summary} /></Helmet>
      <Link to="/proof" className="mb-6 inline-flex items-center text-sm text-muted-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> All proof</Link>
      <Badge variant="outline"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> {item.verification_mode.replaceAll('_', ' ')}</Badge>
      <h1 className="mt-5 text-4xl font-bold">{item.title}</h1><p className="mt-4 text-lg text-muted-foreground">{item.summary}</p>
      <div className="mt-10 grid gap-5">
        {[['Starting assumption', item.starting_assumption], ['Actions completed', item.actions_completed.join(' · ')], ['Evidence', item.evidence_summary], ['Decision changed', item.decision_changed], ['External outcome', item.external_outcome]].map(([title, body]) => <Card key={title}><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-primary" />{title}</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-muted-foreground">{body}</p></CardContent></Card>)}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">Published {new Date(item.published_at).toLocaleDateString()}. Public identity: {item.approved_public_identity || 'Anonymous with consent'}. Private customer identities, notes, and raw analytics are never shown.</p>
    </>}
  </main><Footer /></div>;
}
