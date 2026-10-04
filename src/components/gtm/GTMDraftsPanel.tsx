import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { captureEvent } from '@/lib/analytics';
import { buildGTMAssets, type GTMPlanV2, type GTMPlayAsset } from '@/lib/gtmV2';

function DraftEditor({ asset, onSave }: { asset: GTMPlayAsset; onSave: (asset: GTMPlayAsset) => Promise<void> }) {
  const [draft, setDraft] = useState(asset.content);
  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    toast.success('Copied.');
  };
  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-foreground">{asset.title}</p>
        <span className="text-xs text-muted-foreground">{asset.status === 'approved' ? 'Ready to use' : 'Draft'}</span>
      </div>
      <Textarea rows={6} value={draft} aria-label={asset.title} onChange={(event) => setDraft(event.target.value)} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => void copy()}><Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Copy</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void onSave({ ...asset, content: draft, status: 'draft', updatedAt: new Date().toISOString() })}>Save draft</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void onSave({ ...asset, content: draft, status: 'approved', updatedAt: new Date().toISOString() })}>Mark ready</Button>
      </div>
    </div>
  );
}

/** Outreach, landing and listing drafts for each play. Nothing is sent from here. */
export default function GTMDraftsPanel({ plan, planId, onUpdatePlan }: { plan: GTMPlanV2; planId: string; onUpdatePlan: (plan: GTMPlanV2) => Promise<void> }) {
  const assets = useMemo(() => buildGTMAssets(plan), [plan]);
  const save = async (asset: GTMPlayAsset) => {
    captureEvent('gtm_asset_updated', { plan_id: planId, play_id: asset.playId, asset_type: asset.type, status: asset.status });
    await onUpdatePlan({ ...plan, assets: assets.map((item) => item.id === asset.id ? asset : item) });
  };
  if (assets.length === 0) return <p className="text-sm text-muted-foreground">No drafts yet.</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {assets.map((asset) => <DraftEditor key={asset.id} asset={asset} onSave={save} />)}
    </div>
  );
}
