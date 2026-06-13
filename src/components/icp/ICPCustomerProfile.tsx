import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Radar, ShoppingBag, Users, Wallet } from 'lucide-react';
import { ICPAnalysis } from './types';

interface ICPCustomerProfileProps {
  profile: ICPAnalysis['customerProfile'];
}

const ICPCustomerProfile: React.FC<ICPCustomerProfileProps> = ({ profile }) => {
  const triggerMoments = profile.triggerMoments.length > 0 ? profile.triggerMoments : ['No specific trigger moments identified yet.'];
  const urgencySignals = profile.urgencySignals.length > 0 ? profile.urgencySignals : ['No urgency signals captured yet.'];
  const currentAlternatives = profile.currentAlternatives.length > 0 ? profile.currentAlternatives : ['No alternatives identified yet.'];
  const switchingCosts = profile.switchingCosts.length > 0 ? profile.switchingCosts : ['No switching costs identified yet.'];
  const channels = profile.channels.length > 0 ? profile.channels : ['No clear reach channels identified yet.'];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-4xl border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_42%),rgba(34,197,94,0.06)] shadow-[0_20px_60px_-36px_rgba(34,197,94,0.45)]">
        <CardHeader className="space-y-5 pb-0">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-success/20 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-success dark:bg-slate-950/60 dark:text-success">
            <Users className="h-3.5 w-3.5" />
            Customer profile
          </div>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Users className="h-5 w-5 text-primary" />
            {profile.segmentName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <p className="max-w-3xl text-sm leading-relaxed text-foreground/75">{profile.whoTheyAre}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2.5xl border border-border/60 bg-background/85 p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Buyer</p>
              <p className="text-sm">{profile.buyer}</p>
            </div>
            <div className="rounded-2.5xl border border-border/60 bg-background/85 p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">User</p>
              <p className="text-sm">{profile.user}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4 text-primary" />
              Buying Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2.5xl border border-border/50 bg-muted/30 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Organization context</p>
              <p className="text-sm">{profile.organizationContext}</p>
            </div>
            <div className="rounded-2.5xl border border-border/50 bg-muted/30 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Buying motion</p>
              <p className="text-sm">{profile.buyingMotion}</p>
            </div>
            <div className="rounded-2.5xl border border-border/50 bg-muted/30 p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" />
                Budget owner
              </p>
              <p className="text-sm">{profile.budgetOwner}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radar className="w-4 h-4 text-primary" />
              Triggers And Urgency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trigger moments</p>
              <div className="flex flex-wrap gap-2">
                {triggerMoments.map((trigger, index) => (
                  <Badge key={index} variant="secondary" className="rounded-full border border-border/50 bg-background/80 px-3 py-1 text-xs">
                    {trigger}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Urgency signals</p>
              <ul className="space-y-2">
                {urgencySignals.map((signal, index) => (
                  <li key={index} className="flex items-start gap-3 rounded-2.5xl border border-border/50 bg-background/70 px-4 py-3 text-sm">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-success" />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="w-4 h-4 text-primary" />
              Alternatives And Switching Cost
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current alternatives</p>
              <ul className="space-y-2">
                {currentAlternatives.map((alternative, index) => (
                  <li key={index} className="flex items-start gap-3 rounded-2.5xl border border-border/50 bg-background/70 px-4 py-3 text-sm">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-info" />
                    <span>{alternative}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Switching costs</p>
              <ul className="space-y-2">
                {switchingCosts.map((cost, index) => (
                  <li key={index} className="flex items-start gap-3 rounded-2.5xl border border-border/50 bg-background/70 px-4 py-3 text-sm">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-warning" />
                    <span>{cost}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Best Channels To Reach Them</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {channels.map((channel, index) => (
                <Badge key={index} variant="outline" className="rounded-full border-border/60 bg-background/80 px-3 py-1 text-xs">
                  {channel}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ICPCustomerProfile;
