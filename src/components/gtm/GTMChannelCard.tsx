import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckSquare, ChevronDown, ChevronUp, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GTMChannelRecommendation } from '@/hooks/useGTMStrategist';

interface GTMChannelCardProps {
  channel: GTMChannelRecommendation;
  rank: number;
}

const CHANNEL_COLORS: Record<string, string> = {
  linkedin: 'border-info/40 bg-info/5',
  reddit: 'border-warning/40 bg-warning/5',
  twitter: 'border-border/40 bg-gray-500/5',
  'x ': 'border-border/40 bg-gray-500/5',
  discord: 'border-indigo-500/40 bg-indigo-500/5',
  email: 'border-primary/40 bg-primary/5',
  cold: 'border-primary/40 bg-primary/5',
  instagram: 'border-pink-500/40 bg-pink-500/5',
  tiktok: 'border-pink-500/40 bg-pink-500/5',
  seo: 'border-success/40 bg-success/5',
  content: 'border-success/40 bg-success/5',
  community: 'border-purple-500/40 bg-purple-500/5',
  partnership: 'border-warning/40 bg-warning/5',
  product: 'border-warning/40 bg-warning/5',
};

const getFitScoreColor = (score: number) => {
  if (score >= 8) return 'bg-success-subtle text-success border-success dark:bg-success/30 dark:text-success dark:border-success';
  if (score >= 6.5) return 'bg-warning-subtle text-warning border-warning dark:bg-warning/30 dark:text-warning dark:border-warning';
  return 'bg-warning-subtle text-warning border-warning dark:bg-warning/30 dark:text-warning dark:border-warning';
};

const getChannelAccent = (channelName: string) => {
  const lower = channelName.toLowerCase();
  for (const [key, cls] of Object.entries(CHANNEL_COLORS)) {
    if (lower.includes(key)) return cls;
  }
  return 'border-primary/40 bg-primary/5';
};

const GTMChannelCard: React.FC<GTMChannelCardProps> = ({ channel, rank }) => {
  const [showAntiTactics, setShowAntiTactics] = useState(false);
  const accentClass = getChannelAccent(channel.channel);

  return (
    <Card className={cn('border-2 transition-all duration-200', accentClass)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">#{rank}</span>
            <CardTitle className="text-lg">{channel.channel}</CardTitle>
            {channel.isStretch && (
              <Badge variant="outline" className="text-xs border-warning text-warning">
                Stretch — try after 30 days
              </Badge>
            )}
          </div>
          <Badge className={cn('text-xs font-bold shrink-0 border', getFitScoreColor(channel.fitScore))}>
            {channel.fitScore.toFixed(1)}/10
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground italic leading-relaxed">{channel.fitReason}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />

        {/* Tactics */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tactics</p>
          <div className="space-y-3">
            {channel.tactics.map((tactic, i) => (
              <div key={i} className="space-y-1">
                <p className="text-sm font-semibold">{tactic.title}</p>
                <p className="text-sm text-muted-foreground">{tactic.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {tactic.frequency}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {tactic.timeEstimate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Week 1 actions */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Do this week</p>
          <ul className="space-y-1.5">
            {channel.weekOneActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                {action}
              </li>
            ))}
          </ul>
        </div>

        {/* Anti-tactics (collapsible) */}
        {channel.doNotDo && channel.doNotDo.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowAntiTactics(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAntiTactics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              What NOT to do on this channel
            </button>
            {showAntiTactics && (
              <ul className="mt-2 space-y-1">
                {channel.doNotDo.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-destructive/80">
                    <span className="shrink-0 mt-0.5">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GTMChannelCard;
