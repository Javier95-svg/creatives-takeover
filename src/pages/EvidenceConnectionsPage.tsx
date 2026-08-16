import { useMemo, useState } from 'react';
import { Check, Copy, DatabaseZap, KeyRound, Loader2, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useExternalEvidence } from '@/hooks/useExternalEvidence';
import { captureEvent } from '@/lib/analytics';
import { EXTERNAL_EVIDENCE_EVENT_TYPES } from '@/types/externalEvidence';
import { COMPETITIVE_HARDENING_FLAGS } from '@/config/competitiveHardeningFlags';

const template = `externalId,type,occurredAt,value,currency,subjectHash\nevt_001,qualified_conversation,2026-08-15T14:00:00Z,,,anonymous_hash`;
const REQUIRED_CSV_HEADERS = ['externalId', 'type', 'occurredAt'] as const;

interface CsvPreview {
  file: File;
  rows: number;
  sample: string;
}

export default function EvidenceConnectionsPage() {
  const evidence = useExternalEvidence();
  const [providerLabel, setProviderLabel] = useState('My analytics');
  const [csvLabel, setCsvLabel] = useState('CSV import');
  const [oneTimeToken, setOneTimeToken] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-evidence`;
  const recentByConnection = useMemo(() => new Map(evidence.batches.map((batch) => [batch.connection_id, batch])), [evidence.batches]);

  const create = async () => {
    setBusy(true);
    try { const result = await evidence.createWebhook(providerLabel); setOneTimeToken(result.token); setConnectionId(result.connection.id); captureEvent('external_connection_created', { method: 'webhook', provider_label: providerLabel }); toast.success('Webhook connection created. Copy the credential now.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Connection could not be created.'); }
    finally { setBusy(false); }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try { const result = await evidence.importCsv(csvLabel, file); captureEvent('external_evidence_import_completed', { method: 'csv', accepted_count: result.accepted, duplicate_count: result.duplicate, rejected_count: result.rejected }); toast.success(`Imported ${result.accepted}; ${result.duplicate} duplicates; ${result.rejected} rejected.`); }
    catch (error) { captureEvent('external_evidence_import_failed', { method: 'csv' }); toast.error(error instanceof Error ? error.message : 'CSV import failed.'); }
    finally { setBusy(false); setCsvPreview(null); }
  };

  const previewCsv = async (file?: File) => {
    setCsvPreview(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('CSV files must be 2 MB or smaller.'); return; }
    const text = await file.text();
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
    const headers = (lines[0] ?? '').split(',').map((header) => header.trim());
    const missing = REQUIRED_CSV_HEADERS.filter((header) => !headers.includes(header));
    const rows = Math.max(0, lines.length - 1);
    if (missing.length) { toast.error(`Missing required column(s): ${missing.join(', ')}`); return; }
    if (!rows || rows > 10_000) { toast.error('CSV must contain between 1 and 10,000 data rows.'); return; }
    setCsvPreview({ file, rows, sample: lines.slice(0, 4).join('\n') });
  };

  if (!COMPETITIVE_HARDENING_FLAGS.externalEvidenceImport) return <Card><CardContent className="py-12 text-center text-muted-foreground">External evidence import is paused by its release flag. Existing normalized evidence remains preserved.</CardContent></Card>;

  return <div className="space-y-8 pb-12">
    <header><Badge variant="outline"><DatabaseZap className="mr-1 h-3.5 w-3.5" /> Evidence</Badge><h1 className="mt-3 text-3xl font-bold">Evidence connections</h1><p className="mt-2 max-w-3xl text-muted-foreground">Bring external behavior and outcomes into the decision ledger. Imported data is labeled imported or corroborated; it never becomes platform-verified simply because it was uploaded.</p></header>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Signed webhook</CardTitle><CardDescription>Create a bearer credential shown once. Rotate by revoking this connection and creating another.</CardDescription></CardHeader><CardContent className="space-y-4"><Input value={providerLabel} onChange={(e) => setProviderLabel(e.target.value)} placeholder="Provider label" /><Button disabled={busy || providerLabel.trim().length < 2} onClick={create}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create webhook</Button>{oneTimeToken && connectionId ? <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm"><p className="font-semibold">Copy now; the token will not be shown again.</p><div className="break-all font-mono text-xs">{oneTimeToken}</div><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(oneTimeToken); toast.success('Token copied.'); }}><Copy className="mr-1 h-4 w-4" /> Copy token</Button><pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">POST {webhookUrl}{'\n'}Authorization: Bearer [token]{'\n'}x-ct-connection-id: {connectionId}</pre></div> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Private CSV</CardTitle><CardDescription>Maximum 2 MB / 10,000 rows. Preview validation runs before upload. The original file is deleted after processing; only normalized evidence and row errors remain.</CardDescription></CardHeader><CardContent className="space-y-4"><Input value={csvLabel} onChange={(e) => setCsvLabel(e.target.value)} placeholder="Import label" /><Input type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => void previewCsv(e.target.files?.[0])} />{csvPreview ? <div className="space-y-3 rounded-lg border bg-muted/30 p-3"><p className="text-sm font-medium">Ready to import {csvPreview.rows.toLocaleString()} row{csvPreview.rows === 1 ? '' : 's'}</p><pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-background p-2 text-xs">{csvPreview.sample}</pre><Button disabled={busy || csvLabel.trim().length < 2} onClick={() => void upload(csvPreview.file)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Import normalized evidence</Button></div> : null}<details className="text-sm"><summary className="cursor-pointer font-medium">CSV template</summary><pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">{template}</pre></details><p className="text-xs text-muted-foreground">Allowed types: {EXTERNAL_EVIDENCE_EVENT_TYPES.join(', ')}.</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Connections and import health</CardTitle></CardHeader><CardContent className="space-y-3">{evidence.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : evidence.connections.length ? evidence.connections.map((item) => { const latest = recentByConnection.get(item.id); return <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center"><div><div className="flex items-center gap-2"><strong>{item.provider_label}</strong><Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge><Badge variant="outline">{item.method}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Last success: {item.last_success_at ? new Date(item.last_success_at).toLocaleString() : 'Never'}{latest ? ` · last batch ${latest.accepted_count} accepted / ${latest.duplicate_count} duplicate / ${latest.rejected_count} rejected` : ''}</p>{item.last_error ? <p className="mt-1 text-xs text-destructive">{item.last_error}</p> : null}</div>{item.status === 'active' ? <Button size="sm" variant="outline" onClick={() => void evidence.revoke(item.id)}><RotateCcw className="mr-1 h-4 w-4" /> Revoke</Button> : <Check className="h-5 w-5 text-muted-foreground" />}</div>; }) : <p className="text-sm text-muted-foreground">No external connections yet.</p>}</CardContent></Card>
  </div>;
}
