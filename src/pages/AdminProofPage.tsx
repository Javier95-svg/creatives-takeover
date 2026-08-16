import { useEffect, useState } from 'react';
import { CheckCircle2, EyeOff, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type AdminProof = {
  id: string; slug: string; public_name: string; company_name: string | null; segment: string;
  founder_stage: string; starting_assumption: string; actions_completed: string[];
  evidence_summary: unknown; verification_mode: string; decision_changed: string;
  outcome_type: string; outcome_summary: string; status: string; consented_at: string;
};

const empty = { publicName: '', companyName: '', segment: '', founderStage: 'idea', assumption: '', actions: '', evidence: '', verification: 'founder_reported', decision: '', outcomeType: 'qualified_conversation', outcome: '' };

export default function AdminProofPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminProof[]>([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await (supabase as any).from('proof_case_studies').select('*').order('created_at', { ascending: false });
    if (error) toast.error(error.message); else setItems(data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!form.publicName.trim() || !form.assumption.trim() || !form.evidence.trim() || !form.decision.trim() || !form.outcome.trim()) return toast.error('Complete the identity and full evidence chain.');
    setSaving(true);
    const slug = `${form.publicName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { error } = await (supabase as any).from('proof_case_studies').insert({
      slug, public_name: form.publicName.trim(), company_name: form.companyName.trim() || null,
      segment: form.segment.trim() || 'B2B SaaS', founder_stage: form.founderStage,
      starting_assumption: form.assumption.trim(), actions_completed: form.actions.split('\n').map((value) => value.trim()).filter(Boolean),
      evidence_summary: form.evidence.split('\n').map((value) => value.trim()).filter(Boolean), verification_mode: form.verification,
      decision_changed: form.decision.trim(), outcome_type: form.outcomeType, outcome_summary: form.outcome.trim(),
      consented_at: new Date().toISOString(), status: 'draft',
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setForm(empty); toast.success('Draft proof record created.'); void load();
  };

  const updateStatus = async (item: AdminProof, action: 'publish' | 'withdraw') => {
    const now = new Date().toISOString();
    const patch = action === 'publish'
      ? { status: 'published', verified_by: user?.id, verified_at: now, published_at: now, consent_withdrawn_at: null }
      : { status: 'withdrawn', consent_withdrawn_at: now, published_at: null };
    const { error } = await (supabase as any).from('proof_case_studies').update(patch).eq('id', item.id);
    if (error) toast.error(error.message); else { toast.success(action === 'publish' ? 'Case published.' : 'Consent withdrawn; public access removed.'); void load(); }
  };

  return <div className="min-h-screen bg-background"><Navigation /><main className="container mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-28">
    <header><h1 className="text-3xl font-bold">Proof review queue</h1><p className="mt-2 text-muted-foreground">Publish only after consent, evidence verification, redaction, and preview. Withdrawal unpublishes without deleting private evidence.</p></header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> New structured case</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
      <Input placeholder="Approved public identity *" value={form.publicName} onChange={(e) => setForm({ ...form, publicName: e.target.value })} /><Input placeholder="Company (optional)" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
      <Input placeholder="Segment" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} /><select className="h-10 rounded-md border bg-background px-3" value={form.founderStage} onChange={(e) => setForm({ ...form, founderStage: e.target.value })}><option value="idea">Idea</option><option value="concept_demo">Concept demo</option><option value="working_product">Working product</option></select>
      <Textarea placeholder="Starting assumption *" value={form.assumption} onChange={(e) => setForm({ ...form, assumption: e.target.value })} /><Textarea placeholder="Actions completed, one per line" value={form.actions} onChange={(e) => setForm({ ...form, actions: e.target.value })} />
      <Textarea placeholder="Approved evidence sources/summaries, one per line *" value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} /><Textarea placeholder="Decision changed *" value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })} />
      <select className="h-10 rounded-md border bg-background px-3" value={form.verification} onChange={(e) => setForm({ ...form, verification: e.target.value })}><option value="founder_reported">Founder reported</option><option value="corroborated">Imported / corroborated</option><option value="platform_verified">Platform verified</option></select><select className="h-10 rounded-md border bg-background px-3" value={form.outcomeType} onChange={(e) => setForm({ ...form, outcomeType: e.target.value })}><option value="qualified_conversation">Qualified conversation</option><option value="commitment">Commitment</option><option value="payment">Payment</option><option value="decision">Decision only</option></select>
      <Textarea className="md:col-span-2" placeholder="External outcome *" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} /><Button className="w-fit" disabled={saving} onClick={create}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create draft</Button>
    </CardContent></Card>
    <section className="grid gap-4">{items.map((item) => <Card key={item.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{item.public_name}{item.company_name ? ` · ${item.company_name}` : ''}</CardTitle><Badge>{item.status}</Badge></div></CardHeader><CardContent><p className="text-sm"><strong>Assumption:</strong> {item.starting_assumption}</p><p className="mt-2 text-sm"><strong>Changed:</strong> {item.decision_changed}</p><p className="mt-2 text-sm"><strong>Outcome:</strong> {item.outcome_summary}</p><div className="mt-4 flex gap-2">{item.status !== 'published' ? <Button size="sm" onClick={() => updateStatus(item, 'publish')}><CheckCircle2 className="mr-1 h-4 w-4" /> Verify and publish</Button> : <Button size="sm" variant="destructive" onClick={() => updateStatus(item, 'withdraw')}><EyeOff className="mr-1 h-4 w-4" /> Withdraw consent</Button>}</div></CardContent></Card>)}</section>
  </main></div>;
}
