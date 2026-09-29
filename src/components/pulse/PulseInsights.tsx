import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, GitCompare, Lightbulb, X } from 'lucide-react';
import { trackPulseInsightClicked, trackPulseInsightShown } from '@/lib/analytics';
import { FOUNDER_TOOL_CATALOG } from '@/config/founderToolCatalog';
import { INSIGHT_TYPE_LABEL, type PulseInsight, type PulseInsightType } from '@/lib/pulseInsights';
import { dismissPulseInsight, fetchPulseInsights } from '@/services/pulseInsights';

const ICON: Record<PulseInsightType, typeof AlertTriangle> = { risk: AlertTriangle, opportunity: Lightbulb, follow_up: CalendarClock, contradiction: GitCompare };

/**
 * "Pulse noticed": up to three observations Pulse made about the project today.
 * Loaded once per visit (the server caches one set per day); renders nothing
 * when Pulse has nothing specific to say.
 */
export function PulseInsights({ projectId, onAsk, navigate }: {
  projectId: string | null; onAsk: (question: string) => void; navigate: (path: string) => void;
}) {
  const [state, setState] = useState<{ rowId: string | null; insights: PulseInsight[]; dismissed: string[] }>({ rowId: null, insights: [], dismissed: [] });
  const tracked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchPulseInsights(projectId, controller.signal)
      .then(result => setState({ ...result, dismissed: [] }))
      .catch(() => { /* insights are optional; the home works without them */ });
    return () => controller.abort();
  }, [projectId]);

  const visible = state.insights.filter(item => !state.dismissed.includes(item.id));
  useEffect(() => {
    if (!visible.length || tracked.current) return;
    tracked.current = true;
    trackPulseInsightShown({ count: visible.length, types: visible.map(item => item.type) });
  }, [visible]);
  if (!visible.length) return null;

  const dismiss = (insight: PulseInsight) => {
    const dismissed = [...state.dismissed, insight.id];
    setState(previous => ({ ...previous, dismissed }));
    trackPulseInsightClicked({ type: insight.type, action: 'dismiss' });
    if (state.rowId) void dismissPulseInsight(state.rowId, dismissed);
  };

  return (
    <section aria-label="Pulse noticed" className="pulse-home-insights mx-auto mb-8 max-w-xl">
      <h2 className="mb-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pulse noticed</h2>
      <ul className="space-y-2">
        {visible.map(insight => {
          const Icon = ICON[insight.type];
          const tool = insight.toolKey ? FOUNDER_TOOL_CATALOG.find(item => item.key === insight.toolKey) : undefined;
          return (
            <li key={insight.id} className={`pulse-home-insight pulse-home-insight--${insight.type}`}>
              <Icon aria-hidden="true" className="pulse-home-insight-icon h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm text-foreground"><span className="sr-only">{INSIGHT_TYPE_LABEL[insight.type]}: </span>{insight.text}</p>
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
                  <button type="button" onClick={() => { trackPulseInsightClicked({ type: insight.type, action: 'ask' }); onAsk(insight.ask); }}
                    className="inline-flex items-center gap-1 font-medium text-accent-teal hover:underline">Ask Pulse <ArrowRight className="h-3 w-3" /></button>
                  {tool && <a href={tool.route} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return; event.preventDefault(); trackPulseInsightClicked({ type: insight.type, action: 'tool' }); navigate(tool.route); }}
                    className="text-muted-foreground hover:text-foreground">Open {tool.name}</a>}
                </div>
              </div>
              <button type="button" aria-label="Dismiss for today" onClick={() => dismiss(insight)} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
