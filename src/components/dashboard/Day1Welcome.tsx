import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { getLocalDateString } from '@/lib/dailyGoalPrompt';
import { cn } from '@/lib/utils';

type StepKey = 'icp_builder' | 'founder_stage' | 'daily_mission';

export interface Day1Profile {
  onboarding_completed: boolean | null;
  onboarding_steps_completed: Json | null;
  quiz_biggest_challenge: string | null;
  quiz_completed: boolean | null;
  quiz_current_stage: string | null;
}

interface Day1WelcomeProps {
  profile: Day1Profile;
  onProfilePatch: (patch: Partial<Day1Profile>) => void;
}

const STAGE_OPTIONS = [
  { value: 'idea', label: 'Idea stage' },
  { value: 'building-mvp', label: 'Building MVP' },
  { value: 'mvp-ready', label: 'MVP ready' },
  { value: 'early-users', label: 'Early users' },
  { value: 'growth', label: 'Growth' },
];

function getCompletedSteps(value: Json | null): Record<StepKey, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      icp_builder: false,
      founder_stage: false,
      daily_mission: false,
    };
  }

  const record = value as Record<string, unknown>;
  return {
    icp_builder: record.icp_builder === true,
    founder_stage: record.founder_stage === true,
    daily_mission: record.daily_mission === true,
  };
}

function mergeCompletedSteps(value: Json | null, key: StepKey): Record<string, boolean> {
  const current = getCompletedSteps(value);
  return {
    ...current,
    [key]: true,
  };
}

function StepShell({
  complete,
  title,
  children,
}: {
  complete: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 shadow-sm transition-colors',
        complete ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {complete ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Day1Welcome({ profile, onProfilePatch }: Day1WelcomeProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savingStep, setSavingStep] = useState<StepKey | 'skip' | null>(null);
  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [stage, setStage] = useState(profile.quiz_current_stage || '');
  const [challenge, setChallenge] = useState(profile.quiz_biggest_challenge || '');
  const [celebrating, setCelebrating] = useState(false);

  const completed = useMemo(() => {
    const stored = getCompletedSteps(profile.onboarding_steps_completed);
    return {
      ...stored,
      icp_builder: stored.icp_builder || profile.quiz_completed === true,
      founder_stage: stored.founder_stage || Boolean(profile.quiz_current_stage && profile.quiz_biggest_challenge),
    };
  }, [
    profile.onboarding_steps_completed,
    profile.quiz_biggest_challenge,
    profile.quiz_completed,
    profile.quiz_current_stage,
  ]);

  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressValue = Math.round((completedCount / 3) * 100);

  const updateStep = async (key: StepKey, extraPatch: Record<string, unknown> = {}) => {
    if (!user) return;

    const nextSteps = mergeCompletedSteps(profile.onboarding_steps_completed, key);
    const patch = {
      ...extraPatch,
      onboarding_steps_completed: nextSteps,
    };

    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    onProfilePatch(patch as Partial<Day1Profile>);
  };

  const handleIcpBuilder = async () => {
    setSavingStep('icp_builder');
    try {
      await updateStep('icp_builder');
      navigate('/icp-builder?source=day1_welcome');
    } catch (error) {
      console.error('Failed to save ICP Builder onboarding step:', error);
      toast.error('Could not save progress before opening ICP Builder');
    } finally {
      setSavingStep(null);
    }
  };

  const handleStageSave = async () => {
    if (!stage || !challenge.trim()) {
      toast.error('Choose a stage and add your current challenge');
      return;
    }

    setSavingStep('founder_stage');
    try {
      await updateStep('founder_stage', {
        quiz_current_stage: stage,
        quiz_biggest_challenge: challenge.trim(),
      });
      setStageFormOpen(false);
      toast.success('Founder stage saved');
    } catch (error) {
      console.error('Failed to save founder stage:', error);
      toast.error('Could not save founder stage');
    } finally {
      setSavingStep(null);
    }
  };

  const handleDailyMission = async () => {
    if (!user) return;

    setSavingStep('daily_mission');
    try {
      const missionDate = getLocalDateString();
      const { data: existingMission, error: fetchError } = await supabase
        .from('daily_missions')
        .select('id')
        .eq('user_id', user.id)
        .eq('mission_date', missionDate)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!existingMission) {
        const { error: missionError } = await supabase.functions.invoke('generate-daily-mission', {
          body: { mission_date: missionDate },
        });

        if (missionError) {
          throw missionError;
        }
      }

      await updateStep('daily_mission', { onboarding_completed: true });
      setCelebrating(true);
      window.setTimeout(() => {
        navigate('/dashboard/tasks', { replace: true });
      }, 1400);
    } catch (error) {
      console.error('Failed to prepare daily mission:', error);
      toast.error('Could not prepare your first daily mission');
    } finally {
      setSavingStep(null);
    }
  };

  const handleSkip = async () => {
    if (!user) return;

    setSavingStep('skip');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      onProfilePatch({ onboarding_completed: true });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Failed to skip Day 1 Welcome:', error);
      toast.error('Could not skip right now');
    } finally {
      setSavingStep(null);
    }
  };

  if (celebrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
        <Card className="w-full max-w-xl border-emerald-500/30 bg-emerald-500/5 text-center shadow-sm">
          <CardContent className="space-y-5 p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="font-space-grotesk text-2xl font-semibold text-foreground">
              You're all set — your first mission is ready
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col justify-center">
        <div className="space-y-6">
          <div className="space-y-4 text-center">
            <h1 className="font-space-grotesk text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Let's get your first win in the next 10 minutes.
            </h1>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{completedCount}/3 steps complete</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          </div>

          <div className="space-y-3">
            <StepShell complete={completed.icp_builder} title="Tell us what you're building">
              <Button
                type="button"
                onClick={handleIcpBuilder}
                disabled={savingStep === 'icp_builder'}
                className="w-full sm:w-auto"
                variant={completed.icp_builder ? 'secondary' : 'default'}
              >
                {savingStep === 'icp_builder' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  'Open ICP Builder'
                )}
              </Button>
            </StepShell>

            <StepShell complete={completed.founder_stage} title="Set your founder stage">
              {stageFormOpen || !completed.founder_stage ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="day1-stage">What stage are you at?</Label>
                    <Select value={stage} onValueChange={setStage}>
                      <SelectTrigger id="day1-stage">
                        <SelectValue placeholder="Select your current stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="day1-challenge">What's your #1 challenge right now?</Label>
                    <Textarea
                      id="day1-challenge"
                      value={challenge}
                      onChange={(event) => setChallenge(event.target.value)}
                      className="min-h-24"
                      placeholder="Finding the right customer, validating demand, building the MVP..."
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleStageSave}
                    disabled={savingStep === 'founder_stage'}
                    className="w-full sm:w-auto"
                  >
                    {savingStep === 'founder_stage' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save founder stage'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Input value={`${profile.quiz_current_stage || stage} — ${profile.quiz_biggest_challenge || challenge}`} readOnly />
                  <Button type="button" variant="outline" onClick={() => setStageFormOpen(true)}>
                    Edit
                  </Button>
                </div>
              )}
            </StepShell>

            <StepShell complete={completed.daily_mission} title="Get your first daily mission">
              <Button
                type="button"
                onClick={handleDailyMission}
                disabled={savingStep === 'daily_mission'}
                className="w-full sm:w-auto"
                variant={completed.daily_mission ? 'secondary' : 'default'}
              >
                {savingStep === 'daily_mission' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  'Get daily mission'
                )}
              </Button>
            </StepShell>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleSkip}
              disabled={savingStep === 'skip'}
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingStep === 'skip' ? 'Skipping...' : 'Skip for now'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
