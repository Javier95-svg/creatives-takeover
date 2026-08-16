import { ArrowRight, BarChart3, MessageSquareText, SearchCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const stages = [
  { name: 'PROVE', icon: SearchCheck, tools: 'ICP Builder · Demo Studio · PMF Lab', promise: 'Define one buyer, expose the riskiest assumption, and collect behavior or customer evidence before expanding scope.' },
  { name: 'SELL', icon: MessageSquareText, tools: 'Evidence-backed MVP · GTM Strategist · First Customer Sprint', promise: 'Turn what customers did and said into a build scope, an offer, and founder-led qualified conversations.' },
  { name: 'GROW', icon: BarChart3, tools: 'Traction Engine · adaptive decisions', promise: 'Separate vanity activity from conversations, commitments, and payments—then change the next action.' },
] as const;

export default function EvidenceWorkflow() {
  return <section id="how-it-works" className="container mx-auto px-4 py-16 sm:px-6"><div className="mx-auto max-w-3xl text-center"><Badge variant="outline">One connected evidence workflow</Badge><h2 className="mt-4 text-3xl font-bold sm:text-4xl">PROVE → SELL → GROW</h2><p className="mt-3 text-muted-foreground">The six tools are not six disconnected report generators. Each artifact becomes evidence or context for the next founder decision.</p></div><div className="mt-10 grid gap-5 lg:grid-cols-3">{stages.map((stage) => { const Icon = stage.icon; return <Card key={stage.name}><CardHeader><Icon className="h-7 w-7 text-primary" /><CardTitle className="mt-3">{stage.name}</CardTitle><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage.tools}</p></CardHeader><CardContent><p className="text-sm text-muted-foreground">{stage.promise}</p></CardContent></Card>; })}</div><div className="mt-8 flex flex-wrap justify-center gap-3"><Button asChild><Link to="/icp-builder?source=homepage_workflow">Try free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline"><Link to="/proof">See verified proof</Link></Button></div></section>;
}
