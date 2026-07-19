import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { normalizePlan } from '@/config/planPermissions';
import { trackJourneyEvent, type JourneyTool } from '@/lib/journeyOutcomes';

type OutcomeRow = {
  id: string;
  tool: JourneyTool;
  artifact_type: string;
  status: string;
  updated_at: string;
};

type ReviewRow = {
  id: string;
  user_id: string;
  journey_outcome_id: string | null;
  tool: JourneyTool | null;
  artifact_type: string | null;
  topic: string;
  request: string;
  status: 'pending' | 'in_review' | 'responded' | 'closed';
  substantive_response: string | null;
  submitted_at: string;
  response_due_at: string;
  first_response_at: string | null;
  sla_status: 'met' | 'missed' | 'overdue' | 'due_soon' | 'on_track';
  response_minutes: number | null;
};

const toolLabels: Record<JourneyTool, string> = {
  icp_builder: 'ICP Builder',
  demo_studio: 'Demo Studio',
  pmf_lab: 'PMF Lab',
  mvp_builder: 'MVP Builder',
  gtm_strategist: 'GTM Strategist',
  traction_engine: 'Traction Engine',
};

const formatDeadline = (value: string) => new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(value));

export default function ExpertReviewPanel({ isAdmin = false }: { isAdmin?: boolean }) {
  const { user } = useAuth();
  const { subscriptionData } = useSubscription();
  const isPro = normalizePlan(subscriptionData?.subscription_tier) === 'pro';
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState('');
  const [topic, setTopic] = useState('Outcome review');
  const [request, setRequest] = useState('');
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canUseQueue = Boolean(user && (isPro || isAdmin));
  const selectedOutcome = useMemo(
    () => outcomes.find((outcome) => outcome.id === selectedOutcomeId),
    [outcomes, selectedOutcomeId],
  );

  const loadQueue = useCallback(async () => {
    if (!user || !canUseQueue) return;
    setLoading(true);
    try {
      const outcomePromise = isAdmin
        ? Promise.resolve({ data: [], error: null })
        : (supabase as any)
          .from('journey_outcomes')
          .select('id,tool,artifact_type,status,updated_at')
          .eq('user_id', user.id)
          .in('status', ['ready', 'verified', 'reviewed'])
          .order('updated_at', { ascending: false });
      let reviewQuery = (supabase as any)
        .from('journey_expert_review_sla')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(isAdmin ? 25 : 10);
      if (!isAdmin) reviewQuery = reviewQuery.eq('user_id', user.id);
      const [outcomeResult, reviewResult] = await Promise.all([outcomePromise, reviewQuery]);
      if (outcomeResult.error) throw outcomeResult.error;
      if (reviewResult.error) throw reviewResult.error;
      const nextOutcomes = (outcomeResult.data ?? []) as OutcomeRow[];
      setOutcomes(nextOutcomes);
      setSelectedOutcomeId((current) => current || nextOutcomes[0]?.id || '');
      setReviews((reviewResult.data ?? []) as ReviewRow[]);
    } catch (error) {
      console.warn('Could not load the expert review queue:', error);
      toast.error('Expert reviews are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [canUseQueue, isAdmin, user]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const submitRequest = async () => {
    if (!user || !selectedOutcome) return;
    if (request.trim().length < 30) {
      toast.error('Describe the decision and evidence you want reviewed in at least 30 characters.');
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).from('journey_expert_reviews').insert({
      user_id: user.id,
      journey_outcome_id: selectedOutcome.id,
      topic: topic.trim() || 'Outcome review',
      request: request.trim(),
      status: 'pending',
    }).select('id').single();
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message || 'Could not request an expert review.');
      return;
    }
    trackJourneyEvent('journey_expert_review_requested', {
      tool: selectedOutcome.tool,
      artifact_type: selectedOutcome.artifact_type,
      artifact_id: selectedOutcome.id,
      review_id: data.id,
    });
    setRequest('');
    toast.success('Expert review requested.', { description: 'Your 48 hour response window has started.' });
    await loadQueue();
  };

  const respondToReview = async (review: ReviewRow) => {
    if (!user || !isAdmin) return;
    const response = responses[review.id]?.trim() || '';
    if (response.length < 50) {
      toast.error('A substantive expert response must contain at least 50 characters.');
      return;
    }
    setSaving(true);
    const respondedAt = new Date().toISOString();
    const { error } = await (supabase as any).from('journey_expert_reviews').update({
      substantive_response: response,
      status: 'responded',
      reviewer_id: user.id,
      first_response_at: review.first_response_at || respondedAt,
    }).eq('id', review.id);
    setSaving(false);
    if (error) {
      toast.error(error.message || 'Could not save the expert response.');
      return;
    }
    if (review.journey_outcome_id) {
      const { error: outcomeError } = await (supabase as any).from('journey_outcomes').update({
        status: 'reviewed',
        reviewed_at: respondedAt,
        verified_at: respondedAt,
      }).eq('id', review.journey_outcome_id);
      if (outcomeError) console.warn('Expert response saved, but the journey outcome could not be marked reviewed:', outcomeError);
    }
    if (review.tool) {
      trackJourneyEvent('journey_expert_review_responded', {
        tool: review.tool,
        artifact_type: review.artifact_type || undefined,
        artifact_id: review.journey_outcome_id || undefined,
        review_id: review.id,
        sla_status: new Date(respondedAt) <= new Date(review.response_due_at) ? 'met' : 'missed',
      });
    }
    setResponses((current) => ({ ...current, [review.id]: '' }));
    toast.success('Expert response delivered.');
    await loadQueue();
  };

  if (!user) {
    return (
      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-semibold">Expert accountability on Pro</p><p className="mt-1 text-sm text-muted-foreground">Submit a completed founder outcome and receive a substantive expert response within 48 hours.</p></div>
          <Button asChild variant="outline"><a href="/pricing">See Pro</a></Button>
        </CardContent>
      </Card>
    );
  }

  if (!canUseQueue) {
    return (
      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-semibold">Add expert accountability</p><p className="mt-1 text-sm text-muted-foreground">Pro members can request a substantive review of any ready or verified journey outcome within 48 hours.</p></div>
          <Button asChild variant="outline"><a href="/pricing">Upgrade to Pro</a></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" />{isAdmin ? 'Expert review SLA queue' : 'Pro expert outcome review'}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? 'Respond with attributable feedback and protect the 48 hour commitment.' : 'Ask one focused question about evidence, a decision, or the next move.'}</p></div><Badge variant="outline">48 hour SLA</Badge></div></CardHeader>
      <CardContent className="space-y-5">
        {!isAdmin && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>Outcome to review</Label><Select value={selectedOutcomeId} onValueChange={setSelectedOutcomeId}><SelectTrigger><SelectValue placeholder="Complete an outcome first" /></SelectTrigger><SelectContent>{outcomes.map((outcome) => <SelectItem key={outcome.id} value={outcome.id}>{toolLabels[outcome.tool]} · {outcome.status}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Review topic</Label><Textarea rows={1} value={topic} onChange={(event) => setTopic(event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Decision and evidence to review</Label><Textarea rows={4} value={request} onChange={(event) => setRequest(event.target.value)} placeholder="What decision are you making, what evidence supports it, and where do you want the expert to challenge your reasoning?" /></div>
            <div className="md:col-span-2 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">The response deadline is timestamped when you submit.</p><Button disabled={saving || !selectedOutcomeId || outcomes.length === 0} onClick={() => void submitRequest()}><Send className="mr-2 h-4 w-4" />Request review</Button></div>
          </div>
        )}

        <div className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Loading review queue...</p> : reviews.length === 0 ? <p className="text-sm text-muted-foreground">{isAdmin ? 'No expert reviews are waiting.' : 'No reviews requested yet.'}</p> : reviews.map((review) => {
            const urgent = review.sla_status === 'overdue' || review.sla_status === 'due_soon';
            const completed = review.status === 'responded' || review.status === 'closed';
            return <div key={review.id} className="rounded-xl border border-border/70 bg-background/80 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">{review.topic}</p><p className="mt-1 text-xs text-muted-foreground">{review.tool ? toolLabels[review.tool] : 'Founder outcome'} · submitted {formatDeadline(review.submitted_at)}</p></div><Badge variant="outline" className={urgent ? 'border-warning/40 text-warning' : completed ? 'border-success/40 text-success' : ''}>{review.sla_status.replace('_', ' ')}</Badge></div><p className="mt-3 text-sm text-muted-foreground">{review.request}</p><div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">{urgent ? <AlertTriangle className="h-3.5 w-3.5 text-warning" /> : completed ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Clock3 className="h-3.5 w-3.5" />}Response due {formatDeadline(review.response_due_at)}{review.response_minutes !== null ? ` · delivered in ${review.response_minutes} minutes` : ''}</div>{review.substantive_response ? <div className="mt-3 rounded-lg border border-success/20 bg-success/5 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-success">Expert response</p><p className="mt-2 whitespace-pre-wrap text-sm">{review.substantive_response}</p></div> : null}{isAdmin && !completed ? <div className="mt-3 space-y-2"><Textarea rows={4} value={responses[review.id] || ''} onChange={(event) => setResponses((current) => ({ ...current, [review.id]: event.target.value }))} placeholder="Provide specific, substantive feedback tied to the founder's evidence and next decision." /><div className="flex justify-end"><Button size="sm" disabled={saving} onClick={() => void respondToReview(review)}>Deliver response</Button></div></div> : null}</div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
