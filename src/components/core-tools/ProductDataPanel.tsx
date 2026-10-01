import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCoreProduct, connectedToolsEnabled, type CoreTool } from '@/hooks/useCoreProduct';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { sourceFreshness } from '@/lib/coreTools';

export default function ProductDataPanel({ tool, artifactId, onProductChange }: { tool?: CoreTool; artifactId?: string | null; onProductChange?: (id: string) => void }) {
  const core = useCoreProduct(tool, artifactId);
  const [name, setName] = useState(''); const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<Array<{ id: string; label: string; status: string; last_synced_at: string | null }>>([]);
  useEffect(() => { onProductChange?.(core.productId); }, [core.productId, onProductChange]);
  useEffect(() => {
    let active = true; setSources([]);
    if (core.productId) void (supabase as any).from('ct_connections').select('id,label,status,last_synced_at').eq('product_id', core.productId).then(({ data }: any) => { if (active) setSources(data ?? []); });
    return () => { active = false; };
  }, [core.productId]);
  if (!connectedToolsEnabled()) return null;
  return <section className="space-y-3 rounded-xl border p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Product and connected data</h2><p className="text-xs text-muted-foreground">Choose the business these results describe. Historical work stays unassigned until you select a product.</p></div><Button asChild variant="outline" size="sm"><Link to="/connections">Manage connections</Link></Button></div>
    {core.error && <p role="alert" className="text-sm text-destructive">{core.error} <button className="underline" onClick={() => void core.reload()}>Retry</button></p>}
    <label className="block space-y-1 text-sm"><span>Product</span><select className="w-full rounded-md border bg-background p-2" aria-label="Product" value={core.productId} disabled={core.loading || busy} onChange={async event => { setBusy(true); try { await core.select(event.target.value); } catch(error) { toast.error(error instanceof Error ? error.message : 'Could not assign product.'); } finally { setBusy(false); } }}><option value="">{tool && artifactId ? 'Choose a product' : 'Unassigned historical work / choose a product'}</option>{core.products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
    <div className="flex gap-2"><Input aria-label="New product name" placeholder="New product name" value={name} onChange={event => setName(event.target.value)} /><Button variant="outline" disabled={!name.trim() || busy} onClick={async () => { setBusy(true); try { await core.create(name); setName(''); toast.success('Product created. Select it to assign this work.'); } catch(error) { toast.error(error instanceof Error ? error.message : 'Could not create product.'); } finally { setBusy(false); } }}>Add product</Button></div>
    {sources.length > 0 && <ul className="space-y-1 text-xs text-muted-foreground">{sources.map(source => <li key={source.id}>{source.label} · {source.status} · {sourceFreshness(source.last_synced_at)}</li>)}</ul>}
  </section>;
}
