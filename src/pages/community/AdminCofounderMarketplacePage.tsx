import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ModerationReport {
  id: string;
  category: string;
  explanation: string | null;
  listing_id: string | null;
  interest_id: string | null;
  reported_user_id: string;
  status: string;
  created_at: string;
}

const rpc = async <T,>(name: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await (supabase as any).rpc(name, args);
  if (error) throw error;
  return data as T;
};

export default function AdminCofounderMarketplacePage() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(30);
  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  const to = new Date().toISOString();
  const metrics = useQuery({ queryKey: ['admin-cofounder-metrics', days], queryFn: () => rpc<Record<string, unknown>>('get_cofounder_marketplace_admin_v1', { p_from: from, p_to: to }) });
  const reports = useQuery({ queryKey: ['admin-cofounder-reports'], queryFn: async () => { const { data, error } = await (supabase as any).from('cofounder_reports').select('*').in('status', ['open', 'reviewing']).order('created_at', { ascending: false }).limit(100); if (error) throw error; return (data ?? []) as ModerationReport[]; } });
  const moderate = useMutation({ mutationFn: ({ report, status, hide }: { report: ModerationReport; status: 'reviewing' | 'resolved' | 'dismissed'; hide: boolean }) => rpc<void>('moderate_cofounder_report_v1', { p_report_id: report.id, p_status: status, p_resolution_note: status === 'resolved' ? 'Resolved from marketplace moderation queue.' : null, p_hide_listing: hide }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-cofounder-reports'] }); await queryClient.invalidateQueries({ queryKey: ['admin-cofounder-metrics'] }); toast.success('Moderation decision saved.'); }, onError: (error: Error) => toast.error(error.message) });
  const metricCards = [
    ['Active listings', metrics.data?.activeListings], ['New / renewed', metrics.data?.newListings],
    ['Interest requests', metrics.data?.interests], ['Acceptance rate', `${metrics.data?.acceptanceRate ?? 0}%`],
    ['Median response', `${metrics.data?.medianResponseHours ?? 0}h`], ['Open reports', metrics.data?.openReports],
  ];
  return <div className="min-h-screen bg-background"><Navigation /><main className="container mx-auto px-4 pb-16 pt-header-offset sm:px-6"><header className="flex flex-wrap items-end justify-between gap-4 py-8"><div><Badge variant="secondary" className="mb-3"><ShieldAlert className="mr-2 h-4 w-4" />Admin only</Badge><h1 className="text-3xl font-bold">Co-founder marketplace operations</h1><p className="mt-2 text-muted-foreground">Marketplace health, trust, and moderation from authenticated RPC data.</p></div><select aria-label="Analytics range" className="h-11 rounded-md border bg-background px-3" value={days} onChange={(event)=>setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></header>{metrics.isLoading?<Loader2 className="mx-auto my-16 h-8 w-8 animate-spin"/>:<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{metricCards.map(([label,value])=><Card key={String(label)}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{String(value ?? 0)}</p></CardContent></Card>)}</section>}<section className="mt-10"><h2 className="mb-4 text-2xl font-semibold">Open moderation queue</h2>{reports.isLoading?<Loader2 className="h-7 w-7 animate-spin"/>:reports.data?.length===0?<Card><CardContent className="flex items-center gap-3 py-8"><CheckCircle2 className="h-6 w-6 text-success"/><p>No open marketplace reports.</p></CardContent></Card>:<div className="space-y-3">{reports.data?.map((report)=><Card key={report.id}><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex gap-2"><Badge variant="destructive">{report.category.replace('_',' ')}</Badge><Badge variant="outline">{report.status}</Badge></div><p className="mt-3 text-sm">{report.explanation || 'No additional explanation.'}</p><p className="mt-2 text-xs text-muted-foreground">Target user {report.reported_user_id} · {new Date(report.created_at).toLocaleString()}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={moderate.isPending} onClick={()=>moderate.mutate({report,status:'reviewing',hide:false})}>Reviewing</Button><Button variant="outline" disabled={moderate.isPending} onClick={()=>moderate.mutate({report,status:'dismissed',hide:false})}>Dismiss</Button><Button variant="destructive" disabled={moderate.isPending} onClick={()=>moderate.mutate({report,status:'resolved',hide:Boolean(report.listing_id)})}>Resolve & hide listing</Button></div></CardContent></Card>)}</div>}</section></main></div>;
}
