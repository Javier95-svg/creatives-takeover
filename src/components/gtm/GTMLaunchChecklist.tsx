import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GTMAnalysis } from '@/hooks/useGTMStrategist';

interface GTMLaunchChecklistProps {
  checklist: GTMAnalysis['launchChecklist'];
}

type Priority = 'must' | 'should' | 'nice';

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  must: { label: 'Must', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  should: { label: 'Should', className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' },
  nice: { label: 'Nice', className: 'bg-muted text-muted-foreground border-border' },
};

const ChecklistSection: React.FC<{
  title: string;
  items: Array<{ item: string; priority: Priority }>;
}> = ({ title, items }) => {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      <ul className="space-y-2">
        {items.map(({ item, priority }, i) => {
          const isDone = checked.has(i);
          const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.nice;
          return (
            <li
              key={i}
              onClick={() => toggle(i)}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <div className={cn(
                'w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all duration-200',
                isDone ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50',
              )}>
                {isDone && <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <div className="flex items-start gap-2 flex-wrap">
                <Badge variant="outline" className={cn('text-caption py-0 px-1.5 shrink-0', cfg.className)}>
                  {cfg.label}
                </Badge>
                <span className={cn('text-sm', isDone && 'line-through text-muted-foreground')}>{item}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const GTMLaunchChecklist: React.FC<GTMLaunchChecklistProps> = ({ checklist }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ListChecks className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Launch Checklist</h2>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Badge variant="outline" className="text-caption py-0 bg-destructive/10 text-destructive border-destructive/20">Must</Badge> Required</span>
        <span className="flex items-center gap-1.5"><Badge variant="outline" className="text-caption py-0 bg-yellow-100 text-yellow-700 border-yellow-200">Should</Badge> Recommended</span>
        <span className="flex items-center gap-1.5"><Badge variant="outline" className="text-caption py-0">Nice</Badge> Optional</span>
      </div>
      <div className="space-y-6">
        {checklist.prelaunch?.length > 0 && (
          <ChecklistSection title="Pre-launch" items={checklist.prelaunch as Array<{ item: string; priority: Priority }>} />
        )}
        {checklist.launchDay?.length > 0 && (
          <ChecklistSection title="Launch Day" items={checklist.launchDay as Array<{ item: string; priority: Priority }>} />
        )}
        {checklist.postlaunch?.length > 0 && (
          <ChecklistSection title="Post-launch" items={checklist.postlaunch as Array<{ item: string; priority: Priority }>} />
        )}
      </div>
    </div>
  );
};

export default GTMLaunchChecklist;
