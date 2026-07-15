import { useState } from 'react';
import { FileText, Link2, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist/build/pdf.js';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { calculateGTMHealth, type GTMEvidenceKind, type GTMPlanV2 } from '@/lib/gtmV2';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const kinds: Array<{ value: GTMEvidenceKind; label: string }> = [
  { value: 'interview', label: 'Customer interview' },
  { value: 'document', label: 'Research document' },
  { value: 'pricing', label: 'Pricing evidence' },
  { value: 'competitor', label: 'Competitor evidence' },
  { value: 'traction', label: 'Channel result' },
  { value: 'website', label: 'Website' },
  { value: 'founder_note', label: 'Founder note' },
];

async function extractFileText(file: File) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 40); pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '));
    }
    return pages.join('\n').replace(/\s+/g, ' ').trim().slice(0, 12_000);
  }
  return (await file.text()).trim().slice(0, 12_000);
}

export default function GTMEvidenceManager({ plan, onUpdatePlan }: { plan: GTMPlanV2; onUpdatePlan: (plan: GTMPlanV2) => Promise<void> }) {
  const [kind, setKind] = useState<GTMEvidenceKind>('interview');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [verified, setVerified] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const evidence = plan.evidenceItems ?? plan.intake.firstPartyEvidence ?? [];

  const saveEvidence = async () => {
    if (title.trim().length < 3 || content.trim().length < 20) {
      toast.error('Add a clear title and at least 20 characters of evidence.');
      return;
    }
    const item = {
      id: `evidence-${crypto.randomUUID()}`,
      kind,
      title: title.trim(),
      content: content.trim().slice(0, 12_000),
      url: url.trim() || undefined,
      verified,
      createdAt: new Date().toISOString(),
    };
    const nextEvidence = [...evidence, item].slice(-12);
    const nextPlan: GTMPlanV2 = {
      ...plan,
      evidenceItems: nextEvidence,
      intake: { ...plan.intake, firstPartyEvidence: nextEvidence },
    };
    nextPlan.health = calculateGTMHealth(nextPlan);
    await onUpdatePlan(nextPlan);
    setTitle('');
    setUrl('');
    setContent('');
    setVerified(false);
    toast.success('Evidence saved. Regenerate when you want it included in research and scoring.');
  };

  const removeEvidence = async (id: string) => {
    const nextEvidence = evidence.filter((item) => item.id !== id);
    const claimAttributions = (plan.claimAttributions ?? []).map((claim) => {
      const sourceIds = claim.sourceIds.filter((sourceId) => sourceId !== id);
      return { ...claim, sourceIds, assumption: claim.assumption || sourceIds.length === 0 };
    });
    const nextPlan: GTMPlanV2 = {
      ...plan,
      evidenceItems: nextEvidence,
      claimAttributions,
      intake: { ...plan.intake, firstPartyEvidence: nextEvidence },
    };
    nextPlan.health = calculateGTMHealth(nextPlan);
    await onUpdatePlan(nextPlan);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setReadingFile(true);
    try {
      const extracted = await extractFileText(file);
      if (extracted.length < 20) throw new Error('No readable text was found.');
      setTitle((current) => current || file.name.replace(/\.[^.]+$/, ''));
      setContent(extracted);
      if (file.type === 'application/pdf') setKind('document');
      toast.success('File text extracted locally. Review it before saving.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read this file.');
    } finally {
      setReadingFile(false);
    }
  };

  const sourcedClaims = (plan.claimAttributions ?? []).filter((claim) => !claim.assumption && claim.sourceIds.length > 0).length;
  const assumptions = (plan.claimAttributions ?? []).filter((claim) => claim.assumption).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>First-party evidence</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Add interview notes, PDFs, pricing research, website copy, or measured channel results. Sources stay attached to the claims they support.</p>
          </div>
          <div className="flex gap-2"><Badge variant="outline">{sourcedClaims} sourced claims</Badge><Badge variant="outline">{assumptions} assumptions</Badge></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 rounded-2xl border border-border/60 p-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Evidence type</Label><Select value={kind} onValueChange={(value) => setKind(value as GTMEvidenceKind)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{kinds.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Interview with a VP Sales" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Source URL (optional)</Label><Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Evidence text</Label><Textarea rows={6} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste exact customer language, verified pricing, channel results, or research notes." /></div>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><Upload className="h-4 w-4" />{readingFile ? 'Reading…' : 'Import TXT, MD, CSV, JSON, or PDF'}<input className="hidden" type="file" accept=".txt,.md,.csv,.json,.pdf,text/plain,application/pdf" disabled={readingFile} onChange={(event) => void handleFile(event.target.files?.[0])} /></label>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} />I verified this source or captured it directly.</label>
            <Button className="ml-auto" onClick={() => void saveEvidence()}><Plus className="mr-2 h-4 w-4" />Add evidence</Button>
          </div>
        </div>

        {evidence.length > 0 ? <div className="grid gap-3 md:grid-cols-2">{evidence.map((item) => <div key={item.id} className="rounded-2xl border border-border/60 p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-2">{item.url ? <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}<div className="min-w-0"><p className="truncate font-medium">{item.title}</p><div className="mt-1 flex flex-wrap gap-2"><Badge variant="outline">{item.kind.replace('_', ' ')}</Badge>{item.verified ? <Badge variant="outline" className="border-success/30 text-success"><ShieldCheck className="mr-1 h-3 w-3" />verified source</Badge> : <Badge variant="outline">founder supplied</Badge>}</div></div></div><Button size="icon" variant="ghost" aria-label={`Remove ${item.title}`} onClick={() => void removeEvidence(item.id)}><Trash2 className="h-4 w-4" /></Button></div><p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{item.content}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No first-party evidence has been added yet. The product URL is read during generation when it is publicly accessible.</p>}
      </CardContent>
    </Card>
  );
}
