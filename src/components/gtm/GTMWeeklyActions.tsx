import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { GTMPlanV2, GTMTask } from '@/lib/gtmV2';

export default function GTMWeeklyActions({ plan, tasks, onUpdatePlan }: { plan: GTMPlanV2; tasks: GTMTask[]; onUpdatePlan: (plan: GTMPlanV2) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return <section className="space-y-3" aria-label="Next three actions"><h3 className="font-semibold">Your next three actions</h3>
    {!tasks.length && <p className="rounded-lg bg-muted p-4 text-sm">No outstanding tasks for this week. Open your experiment to check its results, then run the weekly review.</p>}
    <div className="grid gap-3 lg:grid-cols-3">{tasks.map(task => {
      const asset = plan.assets?.find(item => item.playId === task.playId && item.status === 'approved') ?? plan.assets?.find(item => item.playId === task.playId);
      return <article key={task.id} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4"><h4 className="font-medium">{task.title}</h4><p className="text-sm text-muted-foreground">{task.detail}</p><p className="text-xs">{task.timeEstimateMinutes} minutes · Expected output: {task.output || task.metric}</p>
        {asset && <details className="text-sm"><summary className="cursor-pointer py-2 font-medium">Related material: {asset.title}</summary><p className="whitespace-pre-wrap break-words rounded bg-muted p-3">{asset.content}</p><Button className="mt-2" size="sm" variant="outline" onClick={async () => {try {await navigator.clipboard.writeText(asset.content);toast.success('Material copied.');} catch {toast.error('Select and copy the material above.');}}}>Copy material</Button></details>}
        <Button className="mt-auto" variant="outline" disabled={busy} onClick={async () => {setBusy(true);try {await onUpdatePlan({...plan,tasks:(plan.tasks ?? []).map(item => item.id === task.id ? {...item,status:'done',completedAt:new Date().toISOString()} : item)});toast.success('Task completed. Record customer results separately.');} catch {toast.error('Could not save completion. Your task remains available.');} finally {setBusy(false);}}}>Mark task complete</Button>
      </article>;
    })}</div>
  </section>;
}
