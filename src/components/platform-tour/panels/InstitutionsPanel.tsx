import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFounderTool } from '@/config/founderToolCatalog';
import { PanelFrame } from './PanelFrame';
import { trackPlatformTourPartnershipClicked } from '@/lib/platformTour/tourAnalytics';

const PILLARS = [
  {
    title: 'Universities and business schools',
    body: 'Every student has a stage, an artifact and a decision that can be read without collecting slide decks. The seven stage cycle maps onto a semester, and each tool produces a gradeable output with a written definition of done rather than a status update.',
  },
  {
    title: 'Accelerators and incubators',
    body: 'One stage model across a whole batch. You screen on artifacts instead of on pitch polish, and you can see which teams are stuck at which stage before demo day rather than after it.',
  },
  {
    title: 'Investors',
    body: 'What already exists before the first meeting, in the founder’s own words and dated.',
  },
];

export function InstitutionsPanel() {
  // Quoted from the tools themselves, so the claim made to an institution is the
  // same sentence the product holds a founder to.
  const evidence = ['icp_builder', 'demo_studio', 'pmf_lab']
    .map((key) => getFounderTool(key))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));
  return <PanelFrame
    eyebrow="For programs"
    title="Using this with a cohort or a portfolio"
    lede="The platform was built so a founder cannot confuse activity with progress. That property is what makes it legible to the people funding or grading them."
  >
    <div className="space-y-4">
      {PILLARS.map((pillar) => <Card key={pillar.title}>
        <CardHeader><CardTitle>{pillar.title}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{pillar.body}</p></CardContent>
      </Card>)}
    </div>

    <Card className="mt-6">
      <CardHeader><CardTitle>What an artifact actually commits to</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {evidence.map((tool) => <div key={tool.key}>
          <p className="text-sm font-medium text-foreground">{tool.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tool.responsibleOutcome}</p>
        </div>)}
      </CardContent>
    </Card>

    <Card className="mt-6">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <p className="text-sm text-muted-foreground">
          Talk to us about a cohort licence, a pilot with one class, or portfolio access.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" onClick={() => trackPlatformTourPartnershipClicked({ panel: 'for-institutions', destination: '/contact' })}>
            <Link to="/contact">Start a conversation</Link>
          </Button>
          <Button asChild variant="outline" size="sm" onClick={() => trackPlatformTourPartnershipClicked({ panel: 'for-institutions', destination: 'mailto' })}>
            <a href="mailto:javier@admin-creatives-takeover.com?subject=Program%20partnership">Email us directly</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  </PanelFrame>;
}
