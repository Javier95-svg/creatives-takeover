import { useMemo, useState } from 'react';
import { DollarSign, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { calculateGTMHealth, type GTMPipelineEntry, type GTMPipelineStage, type GTMPlanV2 } from '@/lib/gtmV2';

const stages: GTMPipelineStage[] = ['lead', 'qualified', 'opportunity', 'customer', 'lost'];
const momentums: GTMPipelineEntry['momentum'][] = ['active', 'slowing', 'at_risk', 'closed'];

const splitCsvLine = (line: string) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((value) => value.trim().replace(/^"|"$/g, ''));

export default function GTMPipelineBoard({ plan, onUpdatePlan }: { plan: GTMPlanV2; onUpdatePlan: (plan: GTMPlanV2) => Promise<void> }) {
  const defaultPlay = plan.plays.find((play) => play.status === 'active') ?? plan.plays[0];
  const [name, setName] = useState('');
  const [playId, setPlayId] = useState(defaultPlay?.id ?? '');
  const [stage, setStage] = useState<GTMPipelineStage>('lead');
  const [value, setValue] = useState(0);
  const [momentum, setMomentum] = useState<GTMPipelineEntry['momentum']>('active');
  const [notes, setNotes] = useState('');
  const pipeline = useMemo(() => plan.pipeline ?? [], [plan.pipeline]);
  const activeValue = useMemo(() => pipeline.filter((entry) => entry.stage !== 'lost').reduce((sum, entry) => sum + entry.value, 0), [pipeline]);
  const wonValue = useMemo(() => pipeline.filter((entry) => entry.stage === 'customer').reduce((sum, entry) => sum + entry.value, 0), [pipeline]);

  const persist = async (entries: GTMPipelineEntry[]) => {
    const nextPlan = { ...plan, pipeline: entries };
    nextPlan.health = calculateGTMHealth(nextPlan);
    await onUpdatePlan(nextPlan);
  };

  const add = async () => {
    const play = plan.plays.find((item) => item.id === playId);
    if (!play || name.trim().length < 2) {
      toast.error('Choose a play and name the lead or account.');
      return;
    }
    await persist([...pipeline, {
      id: crypto.randomUUID(),
      playId: play.id,
      name: name.trim(),
      stage,
      value: Math.max(0, value),
      sourceChannelId: play.channelId,
      momentum,
      occurredAt: new Date().toISOString().slice(0, 10),
      notes: notes.trim() || undefined,
    }]);
    setName('');
    setValue(0);
    setNotes('');
    toast.success('Pipeline evidence attributed to the GTM play.');
  };

  const importCsv = async (file?: File) => {
    if (!file) return;
    const rows = (await file.text()).split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) {
      toast.error('CSV needs a header and at least one row.');
      return;
    }
    const headers = splitCsvLine(rows[0]).map((header) => header.toLowerCase());
    const imported = rows.slice(1).flatMap((line) => {
      const values = splitCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
      const play = plan.plays.find((item) => item.id === row.playid || item.channelId === row.channel) ?? defaultPlay;
      const rowStage = stages.includes(row.stage as GTMPipelineStage) ? row.stage as GTMPipelineStage : 'lead';
      if (!play || !row.name) return [];
      return [{
        id: crypto.randomUUID(), playId: play.id, name: row.name, stage: rowStage,
        value: Math.max(0, Number(row.value) || 0), sourceChannelId: play.channelId,
        momentum: momentums.includes(row.momentum as GTMPipelineEntry['momentum']) ? row.momentum as GTMPipelineEntry['momentum'] : 'active',
        occurredAt: /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : new Date().toISOString().slice(0, 10),
        notes: row.notes || undefined,
      } satisfies GTMPipelineEntry];
    });
    await persist([...pipeline, ...imported]);
    toast.success(`${imported.length} pipeline records imported.`);
  };

  return (
    <Card>
      <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Play-attributed pipeline</CardTitle><p className="mt-1 text-sm text-muted-foreground">Connect channel activity to qualified demand and revenue without adding a full CRM.</p></div><div className="flex gap-2"><Badge variant="outline">${activeValue.toLocaleString()} active</Badge><Badge variant="outline" className="border-success/30 text-success">${wonValue.toLocaleString()} won</Badge></div></div></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-2xl border border-border/60 p-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2"><Label>Lead, account, or order</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Acme Corp" /></div>
          <div className="space-y-2"><Label>Source play</Label><Select value={playId} onValueChange={setPlayId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{plan.plays.map((play) => <SelectItem key={play.id} value={play.id}>{play.channelName}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Stage</Label><Select value={stage} onValueChange={(next) => setStage(next as GTMPipelineStage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Potential or closed value</Label><Input type="number" min="0" value={value} onChange={(event) => setValue(Number(event.target.value) || 0)} /></div>
          <div className="space-y-2"><Label>Momentum</Label><Select value={momentum} onValueChange={(next) => setMomentum(next as GTMPipelineEntry['momentum'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{momentums.map((item) => <SelectItem key={item} value={item}>{item.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Trigger, objection, or next step" /></div>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><Upload className="h-4 w-4" />Import CSV<input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => void importCsv(event.target.files?.[0])} /></label><p className="text-xs text-muted-foreground">Columns: name, stage, value, playId or channel, momentum, date, notes</p><Button className="ml-auto" onClick={() => void add()}><Plus className="mr-2 h-4 w-4" />Add evidence</Button></div>
        </div>
        {pipeline.length > 0 ? <div className="space-y-2">{pipeline.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{entry.name}</p><Badge variant="outline">{entry.stage}</Badge><Badge variant="outline">{entry.momentum.replace('_', ' ')}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{plan.plays.find((play) => play.id === entry.playId)?.channelName ?? entry.sourceChannelId} · {entry.occurredAt}{entry.notes ? ` · ${entry.notes}` : ''}</p></div><div className="flex items-center gap-2"><span className="flex items-center font-semibold"><DollarSign className="h-4 w-4" />{entry.value.toLocaleString()}</span><Button size="icon" variant="ghost" aria-label={`Remove ${entry.name}`} onClick={() => void persist(pipeline.filter((item) => item.id !== entry.id))}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div> : <p className="text-sm text-muted-foreground">No pipeline evidence is attributed yet. Experiment results still remain in Traction Engine.</p>}
      </CardContent>
    </Card>
  );
}
