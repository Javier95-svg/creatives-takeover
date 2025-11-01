import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Rocket, Users, TrendingUp } from 'lucide-react';
import { ValidationScoreCard } from '@/components/validation/ValidationScoreCard';
import { LaunchRoadmapTimeline } from '@/components/roadmap/LaunchRoadmapTimeline';
import { DailyTaskList } from '@/components/roadmap/DailyTaskList';
import { CohortDashboard } from '@/components/cohort/CohortDashboard';
import { WeeklyCheckInModal } from '@/components/cohort/WeeklyCheckInModal';
import { useMarketValidation } from '@/hooks/useMarketValidation';
import { useLaunchRoadmap } from '@/hooks/useLaunchRoadmap';
import { useCohortMembership } from '@/hooks/useCohortMembership';
import SEO from '@/components/SEO';

const FounderOS = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Hooks
  const { validation, loading: validationLoading } = useMarketValidation();
  const {
    roadmap,
    tasks,
    loading: roadmapLoading,
    updateTaskStatus,
    getCurrentWeekTasks,
    getTodaysTasks,
  } = useLaunchRoadmap();
  const {
    currentCohort,
    membership,
    cohortMembers,
    loading: cohortLoading,
    submitCheckIn,
  } = useCohortMembership();

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/founder-os');
    }
  }, [user, navigate]);

  const handleCheckInSubmit = async (data: {
    wins: string[];
    blockers: string[];
    nextWeekGoals: string[];
    helpNeeded?: string;
    sharePublicly: boolean;
  }) => {
    if (!roadmap) return false;
    return await submitCheckIn(
      roadmap.current_week,
      data.wins,
      data.blockers,
      data.nextWeekGoals,
      data.helpNeeded,
      data.sharePublicly
    );
  };

  if (!user) {
    return null;
  }

  const todaysTasks = getTodaysTasks();
  const weekTasks = getCurrentWeekTasks();

  return (
    <>
      <SEO
        title="Founder OS - 30-Day Launch System"
        description="Validate your idea, build your MVP, and get your first customer in 30 days with AI-powered roadmaps and cohort accountability."
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Founder OS</h1>
            <p className="text-lg text-muted-foreground">
              Your 30-day idea validation & launch system
            </p>
          </div>

          {/* Empty State */}
          {!validation && !roadmap && !currentCohort && (
            <div className="text-center py-16">
              <Rocket className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-3">Ready to Launch Your Idea?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Use BizMap AI to validate your idea, generate a 30-day roadmap, and join a founder cohort
              </p>
              <Button size="lg" onClick={() => navigate('/bizmap-ai')}>
                Start with BizMap AI
              </Button>
            </div>
          )}

          {/* Main Content */}
          {(validation || roadmap || currentCohort) && (
            <Tabs defaultValue="roadmap" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                <TabsTrigger value="validation" className="gap-2">
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Validation</span>
                </TabsTrigger>
                <TabsTrigger value="roadmap" className="gap-2">
                  <Rocket className="h-4 w-4" />
                  <span className="hidden sm:inline">Roadmap</span>
                </TabsTrigger>
                <TabsTrigger value="cohort" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Cohort</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
              </TabsList>

              {/* Validation Tab */}
              <TabsContent value="validation" className="space-y-6">
                {validationLoading ? (
                  <div className="text-center py-12">Loading validation...</div>
                ) : validation ? (
                  <ValidationScoreCard validation={validation} showDetails={true} />
                ) : (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      No validation data yet. Run BizMap AI to validate your idea.
                    </p>
                    <Button onClick={() => navigate('/bizmap-ai')}>
                      Validate My Idea
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Roadmap Tab */}
              <TabsContent value="roadmap" className="space-y-6">
                {roadmapLoading ? (
                  <div className="text-center py-12">Loading roadmap...</div>
                ) : roadmap ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <LaunchRoadmapTimeline roadmap={roadmap} />
                      <DailyTaskList
                        tasks={weekTasks}
                        onTaskStatusChange={updateTaskStatus}
                        showAllTasks={true}
                      />
                    </div>
                    <div className="space-y-6">
                      <DailyTaskList
                        tasks={todaysTasks}
                        onTaskStatusChange={updateTaskStatus}
                        showAllTasks={false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Rocket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      No roadmap yet. Complete BizMap AI to generate your 30-day launch plan.
                    </p>
                    <Button onClick={() => navigate('/bizmap-ai')}>
                      Create Roadmap
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Cohort Tab */}
              <TabsContent value="cohort" className="space-y-6">
                {cohortLoading ? (
                  <div className="text-center py-12">Loading cohort...</div>
                ) : currentCohort && membership ? (
                  <>
                    <CohortDashboard
                      cohort={currentCohort}
                      membership={membership}
                      members={cohortMembers}
                      onCheckIn={() => setShowCheckInModal(true)}
                    />
                    <WeeklyCheckInModal
                      open={showCheckInModal}
                      onOpenChange={setShowCheckInModal}
                      weekNumber={roadmap?.current_week || 1}
                      onSubmit={handleCheckInSubmit}
                    />
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Join a cohort to get accountability and support from fellow founders.
                    </p>
                    <Button onClick={() => {/* TODO: Add cohort joining flow */}}>
                      Join a Cohort
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Analytics dashboard coming soon...
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
};

export default FounderOS;
