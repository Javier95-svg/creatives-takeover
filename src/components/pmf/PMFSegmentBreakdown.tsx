import React from 'react';
import { Users } from 'lucide-react';
import type { PMFInterviewLog } from '@/hooks/usePMFLab';

interface SegmentData {
  segment: string;
  count: number;
  avgInterest: number;
  highIntent: number;
  readyToPay: number;
}

interface PMFSegmentBreakdownProps {
  interviews: PMFInterviewLog[];
}

function deriveSegments(interviews: PMFInterviewLog[]): SegmentData[] {
  const map = new Map<string, PMFInterviewLog[]>();

  for (const interview of interviews) {
    const key = interview.segment.trim();
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(interview);
    map.set(key, list);
  }

  return Array.from(map.entries())
    .map(([segment, items]) => {
      const avgInterest = items.reduce((sum, i) => sum + i.interestLevel, 0) / items.length;
      const highIntent = items.filter(
        (i) => i.buyingIntent === 'high' || i.buyingIntent === 'ready_to_pay'
      ).length;
      const readyToPay = items.filter((i) => i.buyingIntent === 'ready_to_pay').length;

      return {
        segment,
        count: items.length,
        avgInterest: Math.round(avgInterest * 10) / 10,
        highIntent,
        readyToPay,
      };
    })
    .sort((a, b) => b.count - a.count);
}

function intentColor(highIntent: number, count: number) {
  const ratio = count > 0 ? highIntent / count : 0;
  if (ratio >= 0.6) return 'text-green-600 dark:text-green-400';
  if (ratio >= 0.3) return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

const PMFSegmentBreakdown: React.FC<PMFSegmentBreakdownProps> = ({ interviews }) => {
  const segments = deriveSegments(interviews);

  if (segments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Signal strength by segment</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {segments.map((seg) => (
          <div
            key={seg.segment}
            className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground leading-snug">{seg.segment}</p>
              <span className="shrink-0 rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {seg.count} {seg.count === 1 ? 'interview' : 'interviews'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Avg interest</p>
                <p className="mt-1 text-lg font-semibold">{seg.avgInterest}/5</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">High intent</p>
                <p className={`mt-1 text-lg font-semibold ${intentColor(seg.highIntent, seg.count)}`}>
                  {seg.highIntent}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ready to pay</p>
                <p className={`mt-1 text-lg font-semibold ${seg.readyToPay > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {seg.readyToPay}
                </p>
              </div>
            </div>

            {/* Visual bar showing intent distribution */}
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, (seg.avgInterest / 5) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PMFSegmentBreakdown;
