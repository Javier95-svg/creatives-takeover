import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { useNavigate } from 'react-router-dom';

const UserJourneyTracker = () => {
  const { progress, getCurrentStage, getCompletionPercentage } = useJourneyProgress();
  const navigate = useNavigate();
  const currentStage = getCurrentStage();
  const completion = getCompletionPercentage();

  const steps = [
    {
      id: 'plan',
      title: 'Plan It',
      description: 'Create your business report with BizMap AI',
      completed: progress?.plan_it_completed || false,
      action: () => navigate('/dream-2-plan'),
      cta: 'Start Planning'
    },
    {
      id: 'refine',
      title: 'Refine It',
      description: 'Get community feedback on your plan',
      completed: progress?.refine_it_feedback_received || false,
      action: () => navigate('/community'),
      cta: 'Share for Feedback'
    },
    {
      id: 'propel',
      title: 'Propel',
      description: 'Apply to competitions and connect with investors',
      completed: progress?.propel_applied || false,
      action: () => navigate('/propel'),
      cta: 'Explore Opportunities'
    }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStage);

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">Your Journey to Success</h3>
          <span className="text-sm font-medium text-primary">{completion}% Complete</span>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="mt-1">
              {step.completed ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className={`w-6 h-6 ${index === currentStepIndex ? 'text-primary' : 'text-muted-foreground/40'}`} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-semibold ${step.completed ? 'text-foreground' : index === currentStepIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {!step.completed && index === currentStepIndex && (
                  <Button onClick={step.action} size="sm" variant="default" className="gap-2 ml-4">
                    {step.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {completion === 100 && (
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-600 font-medium text-center">
            🎉 Congratulations! You've completed the full journey. Keep pushing forward!
          </p>
        </div>
      )}
    </Card>
  );
};

export default UserJourneyTracker;
