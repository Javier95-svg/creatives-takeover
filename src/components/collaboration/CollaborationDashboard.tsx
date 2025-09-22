import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Phase4CollaborationHub } from './Phase4CollaborationHub';
// import { InteractiveCollaborationHub } from './InteractiveCollaborationHub';
import { CollaborativeSprintKanban } from './CollaborativeSprintKanban';
import { 
  Users, 
  Palette, 
  Calendar, 
  Settings,
  Maximize2,
  Minimize2,
  Layers
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSprints } from '@/hooks/useSprints';

interface CollaborationDashboardProps {
  sessionId?: string;
  sprintId?: string;
}

export const CollaborationDashboard: React.FC<CollaborationDashboardProps> = ({
  sessionId,
  sprintId,
}) => {
  const { user } = useAuth();
  const { sprints, loading: sprintsLoading } = useSprints();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePhase, setActivePhase] = useState<'phase3' | 'phase4'>('phase4');
  
  const demoSprint = sprints?.[0];
  const currentSessionId = sessionId || demoSprint?.id || 'demo-session';
  const currentSprintId = sprintId || demoSprint?.id;

  if (sprintsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading collaboration dashboard...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      <Card className={`${isFullscreen ? 'h-full rounded-none' : 'h-full'} overflow-hidden`}>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Advanced Collaboration Dashboard
              <Badge variant="secondary">All Phases</Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Phase selector */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  size="sm"
                  variant={activePhase === 'phase3' ? 'default' : 'ghost'}
                  onClick={() => setActivePhase('phase3')}
                  className="text-xs"
                >
                  <Palette className="h-3 w-3 mr-1" />
                  Phase 3
                </Button>
                <Button
                  size="sm"
                  variant={activePhase === 'phase4' ? 'default' : 'ghost'}
                  onClick={() => setActivePhase('phase4')}
                  className="text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Phase 4
                </Button>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 h-full">
          <Tabs 
            value={activePhase} 
            onValueChange={(value) => setActivePhase(value as 'phase3' | 'phase4')}
            className="h-full flex flex-col"
          >
            <div className="flex-1 overflow-hidden">
              <TabsContent value="phase3" className="h-full m-0">
                <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-0">
                  {/* Sprint Kanban */}
                  <div className="border-r">
                    {currentSprintId && demoSprint ? (
                      <CollaborativeSprintKanban sprint={demoSprint} />
                    ) : (
                      <Card className="h-full flex items-center justify-center">
                        <CardContent>
                          <p className="text-muted-foreground">No sprint available</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  
                  {/* Interactive Collaboration Tools */}
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Interactive tools coming soon</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="phase4" className="h-full m-0">
                <Phase4CollaborationHub 
                  sessionId={currentSessionId}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};