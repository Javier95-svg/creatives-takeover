import {useState} from 'react';
import {useCoreProduct,connectedToolsEnabled} from '@/hooks/useCoreProduct';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
export default function AssignHistoricalWeek({logs,onAssigned}:{logs:Array<{id:string;week_start_date:string}>;onAssigned:()=>Promise<void>}){
 const {products}=useCoreProduct();const [week,setWeek]=useState(''),[product,setProduct]=useState(''),[busy,setBusy]=useState(false);
 if(!connectedToolsEnabled()||!logs.length||!products.length)return null;
 return <details className="rounded border p-3 text-sm"><summary className="cursor-pointer">Assign an unassigned historical week</summary><p className="my-2 text-xs text-muted-foreground">Choose the product this week actually describes. Legacy calculations stay labelled and are excluded from new score comparisons.</p><select aria-label="Historical week" className="mr-2 rounded border bg-background p-2" value={week} onChange={e=>setWeek(e.target.value)}><option value="">Choose week</option>{logs.map(log=><option key={log.id} value={log.id}>{log.week_start_date}</option>)}</select><select aria-label="Historical week's product" className="rounded border bg-background p-2" value={product} onChange={e=>setProduct(e.target.value)}><option value="">Choose product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><Button className="ml-2" size="sm" disabled={busy||!week||!product} onClick={async()=>{setBusy(true);try{const {error}=await(supabase as any).rpc('ct_link_product_artifact',{p_product_id:product,p_tool:'traction_engine',p_artifact_id:week});if(error)throw error;await onAssigned();setWeek('');toast.success('Historical week assigned.');}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}}>Assign week</Button></details>;
}
