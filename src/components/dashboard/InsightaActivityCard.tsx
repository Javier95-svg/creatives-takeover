import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Eye, FileSearch, Building, Mail, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVCViewTracking } from '@/hooks/useVCViewTracking';

export function InsightaActivityCard() {
  const { user } = useAuth();
  const { viewCount, loading: vcLoading } = useVCViewTracking();
  const [pitchDeckCount, setPitchDeckCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchPitchDecks = async () => {
      if (!user) return;
      const { count, error } = await supabase
        .from('pitch_deck_analyses' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (!error && count !== null) setPitchDeckCount(count);
    };
    fetchPitchDecks();
  }, [user]);

  const stats = [
    {
      icon: Eye,
      label: 'VC Profiles Viewed',
      value: vcLoading ? '…' : viewCount,
      sub: 'this month',
      color: 'text-blue-500',
    },
    {
      icon: FileSearch,
      label: 'Pitch Decks Analyzed',
      value: pitchDeckCount === null ? '…' : pitchDeckCount,
      sub: 'total',
      color: 'text-indigo-500',
    },
    {
      icon: Building,
      label: 'Accelerators',
      value: 'Browse',
      sub: 'programs available',
      color: 'text-teal-500',
    },
    {
      icon: Mail,
      label: 'Email Templates',
      value: 'Access',
      sub: 'outreach templates',
      color: 'text-orange-500',
    },
  ];

  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          Fundraising Hub
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-1"
              >
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-base font-bold text-foreground leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
                <p className="text-caption text-muted-foreground/70">{stat.sub}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Link to="/insighta">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1">
            Open Insighta <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
