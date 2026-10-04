import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// Entries from the published app's forms (signups, requests, messages). This
// is what turns a published page into evidence: the people who left details.

type Lead = { id: string; email: string | null; name: string | null; message: string | null; fields: Record<string, string>; page_path: string | null; created_at: string };

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function mvpLeadsToCsv(leads: Lead[]): string {
  const extraKeys = Array.from(new Set(leads.flatMap((lead) => Object.keys(lead.fields ?? {}))))
    .filter((key) => !['email', 'name', 'message'].includes(key));
  const header = ['email', 'name', 'message', ...extraKeys, 'page', 'left_at'];
  const rows = leads.map((lead) => [
    lead.email ?? '', lead.name ?? '', lead.message ?? '',
    ...extraKeys.map((key) => lead.fields?.[key] ?? ''),
    lead.page_path ?? '', lead.created_at,
  ].map(csvCell).join(','));
  return [header.join(','), ...rows].join('\n');
}

export default function MVPBuilderLeadsPanel({ projectId, isPublished }: { projectId: string; isPublished: boolean }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from('mvp_app_leads')
      .select('id, email, name, message, fields, page_path, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      // Before the leads table exists the tab says so instead of failing.
      setUnavailable(true);
      setLeads([]);
      return;
    }
    setUnavailable(false);
    setLeads((data ?? []) as Lead[]);
  };

  useEffect(() => {
    setLeads(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const download = () => {
    if (!leads?.length) return;
    try {
      const url = URL.createObjectURL(new Blob([mvpLeadsToCsv(leads)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'app-leads.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download the leads.');
    }
  };

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-white">Leads {leads ? <span className="font-normal text-muted-foreground">· {leads.length}</span> : null}</h2>
          <p className="text-sm text-muted-foreground">People who filled in a form on your published app.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => void load()} aria-label="Refresh leads">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          {leads && leads.length > 0 ? (
            <Button type="button" size="sm" variant="outline" onClick={download}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Download CSV
            </Button>
          ) : null}
        </div>
      </div>

      {leads === null ? (
        <p className="text-sm text-muted-foreground">Loading leads.</p>
      ) : unavailable ? (
        <p className="text-sm text-muted-foreground">Leads will show here after the next platform update.</p>
      ) : leads.length === 0 ? (
        <p className="rounded-lg border border-white/10 p-4 text-sm text-muted-foreground">
          {isPublished
            ? 'No entries yet. Share your app link; signups and requests appear here as they come in.'
            : 'Publish your app to start collecting signups and requests here.'}
        </p>
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {leads.slice(0, 100).map((lead) => (
            <li key={lead.id} className="space-y-0.5 px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-white">{lead.email || lead.name || 'Entry'}</span>
                <span className="text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleString()}</span>
              </div>
              {lead.name && lead.email ? <p className="text-muted-foreground">{lead.name}</p> : null}
              {lead.message ? <p className="text-muted-foreground">{lead.message}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
