import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SprintPlannerComponent from '@/components/sprint/SprintPlanner';
import SprintKanban from '@/components/sprint/SprintKanban';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';
import { useSprints } from '@/hooks/useSprints';

const SprintPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { sprints, currentSprint, setCurrentSprint } = useSprints();
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);

  const handleSprintCreated = (sprintId: string) => {
    const sprint = sprints.find(s => s.id === sprintId);
    if (sprint) {
      setCurrentSprint(sprint);
      setActiveSprintId(sprintId);
    }
  };

  const activeSprint = activeSprintId 
    ? sprints.find(s => s.id === activeSprintId) 
    : currentSprint;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {!activeSprint ? (
          <SprintPlannerComponent onSprintCreated={handleSprintCreated} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold creatives-font">Sprint Dashboard</h1>
                <p className="text-muted-foreground">Track your progress and stay accountable</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setActiveSprintId(null);
                  setCurrentSprint(null);
                }}
              >
                <Zap className="w-4 h-4 mr-2" />
                Create New Sprint
              </Button>
            </div>
            
            <SprintKanban 
              sprint={activeSprint} 
              onStatusChange={(status) => {
                if (activeSprint) {
                  setCurrentSprint({ ...activeSprint, status });
                }
              }}
            />
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default SprintPlannerPage;