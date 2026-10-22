import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronUp, IdCard } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import {
  FOUNDER_ID_ITEMS,
  founderIdCompletion,
  usableProjectName,
  type FounderIdFields,
  type FounderIdItem,
  type FounderIdSuggestions,
} from '@/lib/founderIdCompletion';
import { cn } from '@/lib/utils';

interface Props {
  userId: string;
  fields: FounderIdFields;
  /** Merge saved fields into the page's copy of the profile. */
  onSaved: (fields: Partial<Record<'startup_name' | 'startup_tagline' | 'startup_description', string>>) => void;
  onEditProfile: () => void;
}

/**
 * "Complete your Founder ID", shown only to the owner. Most Founder IDs are
 * empty, and an empty page shared on LinkedIn hurts rather than helps, so this
 * lists what visitors cannot see yet and offers the founder's own work from
 * other tools (their project, their Demo Studio page) as one-click fills.
 * Nothing becomes public until the founder clicks (Javier, 2026-10-22).
 */
export function FounderIdChecklist({ userId, fields, onSaved, onEditProfile }: Props) {
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState<FounderIdItem | null>(null);
  const shownRef = useRef(false);

  const extras = useQuery({
    queryKey: ['founder-id-checklist', userId],
    staleTime: 60_000,
    queryFn: async () => {
      const [project, demo, support, posts] = await Promise.all([
        supabase.from('projects').select('title, idea_summary').eq('user_id', userId).is('archived_at', null)
          .order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from('demo_studio_projects').select('name, tagline').eq('owner_id', userId).is('superseded_at', null)
          .order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from('profile_support').select('support_url').eq('user_id', userId).maybeSingle(),
        (supabase as any).from('profile_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      const suggestions: FounderIdSuggestions = {
        name: usableProjectName(project.data?.title) ?? usableProjectName(demo.data?.name),
        tagline: demo.data?.tagline?.trim() || null,
        description: project.data?.idea_summary?.trim() || null,
      };
      return {
        suggestions,
        hasSupportLink: Boolean(support.data?.support_url),
        hasUpdate: (posts.count ?? 0) > 0,
      };
    },
  });

  const completion = founderIdCompletion(fields, {
    hasSupportLink: extras.data?.hasSupportLink ?? false,
    hasUpdate: extras.data?.hasUpdate ?? false,
  });

  useEffect(() => {
    if (!extras.data || shownRef.current || completion.remaining === 0) return;
    shownRef.current = true;
    captureEvent('founder_id_checklist_shown', { done: completion.done, total: completion.total });
  }, [extras.data, completion.done, completion.total, completion.remaining]);

  if (!extras.data || completion.remaining === 0) return null;
  const suggestions = extras.data.suggestions;

  const fill = async (item: FounderIdItem, column: 'startup_name' | 'startup_tagline' | 'startup_description', value: string) => {
    setSaving(item);
    const { error } = await supabase.from('profiles').update({ [column]: value }).eq('id', userId);
    setSaving(null);
    if (error) {
      toast.error('We could not save that. Please try again.');
      return;
    }
    onSaved({ [column]: value });
    captureEvent('founder_id_checklist_action', { item, action: 'prefill' });
    toast.success('Added to your Founder ID.');
  };

  const goTo = (item: FounderIdItem, elementId: string) => {
    captureEvent('founder_id_checklist_action', { item, action: 'scroll' });
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const edit = (item: FounderIdItem) => {
    captureEvent('founder_id_checklist_action', { item, action: 'edit' });
    onEditProfile();
  };

  const action = (item: FounderIdItem) => {
    switch (item) {
      case 'name':
        return suggestions.name
          ? <Button size="sm" disabled={saving !== null} onClick={() => void fill(item, 'startup_name', suggestions.name!)}>Use “{truncate(suggestions.name, 28)}”</Button>
          : <Button size="sm" variant="outline" onClick={() => edit(item)}>Add</Button>;
      case 'tagline':
        return suggestions.tagline
          ? <Button size="sm" disabled={saving !== null} onClick={() => void fill(item, 'startup_tagline', suggestions.tagline!)}>Use my Demo Studio line</Button>
          : <Button size="sm" variant="outline" onClick={() => edit(item)}>Add</Button>;
      case 'description':
        return suggestions.description
          ? <Button size="sm" disabled={saving !== null} onClick={() => void fill(item, 'startup_description', suggestions.description!)}>Use my project summary</Button>
          : <Button size="sm" variant="outline" onClick={() => edit(item)}>Add</Button>;
      case 'links':
        return <Button size="sm" variant="outline" onClick={() => edit(item)}>Add links</Button>;
      case 'support':
        return <Button size="sm" variant="outline" onClick={() => goTo(item, 'founder-id-support')}>Add a funding link</Button>;
      case 'update':
        return <Button size="sm" variant="outline" onClick={() => goTo(item, 'profile-posts-heading')}>Write an update</Button>;
    }
  };

  return (
    <Card className="mb-6 w-full p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <IdCard className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Complete your Founder ID</p>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={open}
            >
              {completion.done} of {completion.total} done
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Only you see this. A complete page is worth sharing: visitors see what you build and how to help.</p>
          <Progress value={(completion.done / completion.total) * 100} className="mt-3 h-1.5" />
        </div>
      </div>

      {open && (
        <ul className="mt-4 divide-y divide-border/60 border-t border-border/60">
          {FOUNDER_ID_ITEMS.map(({ key, label, hint }) => {
            const done = completion.items[key];
            return (
              <li key={key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      done ? 'border-success bg-success text-success-foreground' : 'border-border',
                    )}
                    aria-hidden="true"
                  >
                    {done && <Check className="h-3 w-3" />}
                  </span>
                  <span>
                    <span className={cn('block text-sm font-medium', done && 'text-muted-foreground line-through')}>{label}</span>
                    {!done && <span className="block text-xs text-muted-foreground">{hint}</span>}
                  </span>
                </div>
                {!done && <div className="shrink-0 pl-6 sm:pl-0">{action(key)}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
