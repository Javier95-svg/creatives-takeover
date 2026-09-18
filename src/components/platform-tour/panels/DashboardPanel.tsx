import { Check, Circle, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BIZMAP_STAGES, STAGE_TASKS } from '@/lib/bizmapStages';
import { BIZMAP_STAGE_ORDER } from '@/lib/bizmapStageOrder';
import { PLATFORM_TOUR_FIXTURE } from '@/lib/platformTour/tourFixture';
import { PanelFrame } from './PanelFrame';
import { useTourGate } from '../PlatformTourGateContext';

const STATUS_ICON = { complete: Check, current: Circle, locked: Lock };

export function DashboardPanel() {
  const openGate = useTourGate();
  const { project } = PLATFORM_TOUR_FIXTURE;
  const currentIndex = BIZMAP_STAGE_ORDER.indexOf(project.stage);
  // Tasks are read from the product's own stage templates rather than copied
  // into the fixture, so the tour cannot show a task the platform no longer sets.
  const tasks = STAGE_TASKS[project.stage];
  return <PanelFrame
    eyebrow={`Stage ${currentIndex + 1} of 7`}
    title={project.name}
    lede={project.oneLiner}
  >
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Startup Development Cycle</CardTitle>
          <CardDescription>
            Every founder moves through the same seven stages, and each stage has one artifact that has to exist before the next one opens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {BIZMAP_STAGES.map((stage, index) => {
            const status = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'locked';
            const Icon = STATUS_ICON[status];
            return <div key={stage.id} className={`flex items-start gap-3 rounded-card px-3 py-3 ${status === 'current' ? 'bg-primary/10' : ''}`}>
              <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${status === 'locked' ? 'text-muted-foreground' : 'text-primary'}`} />
              <div className="min-w-0">
                {/* A div, not a p: Badge renders a div and nesting one inside a
                    paragraph is invalid markup that React warns about. */}
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  <span>{stage.numeral}. {stage.title}</span>
                  {status === 'current' && <Badge variant="secondary">In progress</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{stage.description}</p>
              </div>
            </div>;
          })}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Open tasks</CardTitle>
            <CardDescription>Set by the stage, not by the founder, so the list cannot be wished away.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => <div key={task.id} className="flex items-start gap-3">
              <Circle aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm text-foreground">{task.title}</p>
                <Badge variant={task.priority === 'high' ? 'destructive' : 'outline'} className="mt-1">{task.priority}</Badge>
              </div>
            </div>)}
            <Button variant="outline" size="sm" className="w-full" onClick={() => openGate('tool')}>
              Complete a task
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>One project at a time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Each stage holds one result per project. Redoing a stage replaces the previous result rather than adding a second one, so a founder cannot quietly restart from zero and call it progress.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </PanelFrame>;
}
