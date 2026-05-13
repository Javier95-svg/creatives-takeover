import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Mail, Sparkles, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    label: 'Angels prospected',
    href: '/investors',
    icon: Sparkles,
    cta: 'Open Angels',
  },
  {
    label: 'Decks reviewed',
    href: '/pitch-deck-analyzer',
    icon: BarChart3,
    cta: 'Open Pitch Deck',
  },
  {
    label: 'Conversations started',
    href: '/email-templates',
    icon: Mail,
    cta: 'Open Templates',
  },
  {
    label: 'Term sheets',
    href: '/investors',
    icon: Users,
    cta: 'Track investors',
  },
];

export function FundraisingFunnel() {
  return (
    <Card className="border-primary/25 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 shadow-xl">
      <CardHeader className="space-y-2">
        <Badge variant="outline" className="w-fit border-primary/40 text-primary">Pro Overlay</Badge>
        <CardTitle className="text-xl text-white">Fundraising Funnel</CardTitle>
        <CardDescription className="text-slate-300">
          Layer fundraising motion on top of the build journey. Each step links to the surface that moves the conversation forward.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-primary/40 hover:bg-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Step {index + 1}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{step.label}</p>
                <Button asChild variant="ghost" size="sm" className="mt-3 px-0 text-primary hover:bg-transparent">
                  <Link to={step.href}>
                    {step.cta}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
