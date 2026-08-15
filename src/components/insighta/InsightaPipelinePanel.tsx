import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, CalendarClock, ChevronDown, ChevronUp, ExternalLink, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  INSIGHTA_PIPELINE_STATUSES,
  type InsightaPipelineItem,
  type InsightaPipelineStatus,
} from '@/hooks/useInsightaPipeline';

interface InsightaPipelinePanelProps {
  items: InsightaPipelineItem[];
  loading: boolean;
  pending: boolean;
  onUpdate: (input: {
    id: string;
    entityId: string;
    entityType: 'vc' | 'accelerator';
    entityRoute: string;
    status?: InsightaPipelineStatus;
    notes?: string | null;
    nextActionAt?: string | null;
  }) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
}

const statusLabel = (status: InsightaPipelineStatus) =>
  status.split('_').map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join(' ');

const toLocalDateTime = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export function InsightaPipelinePanel({ items, loading, pending, onUpdate, onRemove }: InsightaPipelinePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, 3);
  const dueCount = items.filter((item) => item.next_action_at && new Date(item.next_action_at).getTime() <= Date.now()).length;

  return (
    <Card className="mb-8 border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookmarkCheck className="h-5 w-5 text-primary" />
              Investor research pipeline
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Save prospects, move them forward, and bring due follow-ups back to your Dashboard.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">{items.length} saved</Badge>
            {dueCount > 0 && <Badge variant="destructive">{dueCount} due</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-muted" aria-label="Loading research pipeline" />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Your pipeline is empty. Use “Save” on a VC or accelerator card to start a shortlist. Saving and tracking are free.
          </div>
        ) : (
          <>
            {visibleItems.map((item) => (
              <div key={item.id} className="grid gap-3 rounded-xl border bg-background p-3 lg:grid-cols-[minmax(180px,1fr)_180px_210px_minmax(220px,1.2fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <Link className="flex items-center gap-1 truncate font-medium hover:text-primary" to={item.entity_route}>
                    <span className="truncate">{item.entity_label}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </Link>
                  <p className="text-xs capitalize text-muted-foreground">{item.entity_type}</p>
                </div>
                <Select
                  value={item.status}
                  disabled={pending}
                  onValueChange={(status: InsightaPipelineStatus) => void onUpdate({
                    id: item.id,
                    entityId: item.entity_id,
                    entityType: item.entity_type,
                    entityRoute: item.entity_route,
                    status,
                  })}
                >
                  <SelectTrigger aria-label={`Status for ${item.entity_label}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSIGHTA_PIPELINE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <CalendarClock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="datetime-local"
                    className="pl-9"
                    aria-label={`Next action for ${item.entity_label}`}
                    defaultValue={toLocalDateTime(item.next_action_at)}
                    disabled={pending || item.status === 'closed'}
                    onBlur={(event) => {
                      const value = event.currentTarget.value;
                      const nextActionAt = value ? new Date(value).toISOString() : null;
                      if (nextActionAt !== item.next_action_at) {
                        void onUpdate({
                          id: item.id,
                          entityId: item.entity_id,
                          entityType: item.entity_type,
                          entityRoute: item.entity_route,
                          nextActionAt,
                        });
                      }
                    }}
                  />
                </div>
                <Textarea
                  className="min-h-11 resize-y"
                  maxLength={2000}
                  defaultValue={item.notes ?? ''}
                  placeholder="Private notes"
                  aria-label={`Notes for ${item.entity_label}`}
                  disabled={pending}
                  onBlur={(event) => {
                    const notes = event.currentTarget.value.trim() || null;
                    if (notes !== item.notes) {
                      void onUpdate({
                        id: item.id,
                        entityId: item.entity_id,
                        entityType: item.entity_type,
                        entityRoute: item.entity_route,
                        notes,
                      });
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label={`Remove ${item.entity_label} from pipeline`}
                  disabled={pending}
                  onClick={() => void onRemove(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {items.length > 3 && (
              <Button variant="ghost" className="w-full" onClick={() => setExpanded((value) => !value)}>
                {expanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                {expanded ? 'Show less' : `Show ${items.length - 3} more`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
