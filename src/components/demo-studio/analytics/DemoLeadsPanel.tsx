import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { listDemoSignups } from '@/lib/demoStudio/api';

type Lead = { email: string; created_at: string; referrer: string | null; owner_view: boolean | null };

// Emails viewers left on this demo's end screen. Leads are the strongest
// signal a demo gives, stronger than views, so they sit next to the results.
// Founder test submissions are listed but marked, and left out of the count.

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function leadsToCsv(leads: Lead[]): string {
  const rows = leads.map((lead) => [lead.email, lead.created_at, lead.referrer ?? '', lead.owner_view ? 'your test' : ''].map(csvCell).join(','));
  return ['email,left_at,came_from,note', ...rows].join('\n');
}

export default function DemoLeadsPanel({ projectId, demoId, collectsEmail }: { projectId: string; demoId: string; collectsEmail: boolean }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);

  useEffect(() => {
    let active = true;
    void listDemoSignups(projectId, demoId)
      .then((rows) => { if (active) setLeads(rows); })
      .catch(() => { if (active) setLeads([]); });
    return () => { active = false; };
  }, [demoId, projectId]);

  const realLeads = (leads ?? []).filter((lead) => !lead.owner_view);

  const download = () => {
    if (!leads?.length) return;
    try {
      const blob = new Blob([leadsToCsv(leads)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'demo-leads.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download the leads.');
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card p-4 sm:p-5" aria-labelledby="demo-leads-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="demo-leads-heading" className="text-lg font-semibold text-foreground">
          Leads {leads ? <span className="font-normal text-muted-foreground">· {realLeads.length}</span> : null}
        </h2>
        {leads && leads.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={download}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Download CSV
          </Button>
        ) : null}
      </div>
      {leads === null ? (
        <p className="text-sm text-muted-foreground">Loading leads.</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {collectsEmail
            ? 'No emails yet. Viewers who reach the end can leave theirs.'
            : 'Turn on "Ask for email at the end" in the editor to collect leads from viewers.'}
        </p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
          {leads.slice(0, 50).map((lead) => (
            <li key={`${lead.email}-${lead.created_at}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{lead.email}</span>
              <span className="text-muted-foreground">
                {lead.owner_view ? 'Your test · ' : ''}{new Date(lead.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
