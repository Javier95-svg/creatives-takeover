import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdvancedFieldsSection } from '@/components/pmf/AdvancedFieldsSection';
import { getIcpDraftStorageKey } from '@/lib/icpDraftStorage';

export interface ICPInputFormData {
  problemStatement: string;
  targetAudience: string;
  currentBehavior: string;
  solutionDifferentiator: string;
  marketTiming: string;
  painCost: string;
  founderEdge: string;
  nextGoals: string;
  mainCompetitors: string;
  industry: string;
  revenueModel: string;
  currentTraction: string;
}

interface ICPInputFormProps {
  initialData?: Partial<ICPInputFormData>;
  initialStep?: number;
  onSubmit: (data: ICPInputFormData) => void;
  isSubmitting?: boolean;
}

interface ICPDraftPayload {
  version: number;
  currentStep: number;
  formData: ICPInputFormData;
  updatedAt: number;
}

const ICP_DRAFT_VERSION = 1;

const INDUSTRIES = [
  'Technology/SaaS', 'E-commerce/Retail', 'Healthcare', 'Education',
  'Finance/Fintech', 'Real Estate', 'Food & Beverage', 'Fitness/Wellness',
  'Entertainment/Media', 'Professional Services', 'Marketing/Advertising',
  'Manufacturing', 'Travel/Hospitality', 'Non-Profit', 'Other',
];

const REVENUE_MODELS = [
  'SaaS (Subscription)', 'Marketplace', 'E-commerce', 'Freemium',
  'One-time Purchase', 'Commission/Transaction Fee', 'Advertising',
  'Licensing', 'Agency/Service', 'Consulting', 'Other',
];

const createFormData = (initialData?: Partial<ICPInputFormData>): ICPInputFormData => ({
  problemStatement: initialData?.problemStatement || '',
  targetAudience: initialData?.targetAudience || '',
  currentBehavior: initialData?.currentBehavior || '',
  solutionDifferentiator: initialData?.solutionDifferentiator || '',
  marketTiming: initialData?.marketTiming || '',
  painCost: initialData?.painCost || '',
  founderEdge: initialData?.founderEdge || '',
  nextGoals: initialData?.nextGoals || '',
  mainCompetitors: initialData?.mainCompetitors || '',
  industry: initialData?.industry || '',
  revenueModel: initialData?.revenueModel || '',
  currentTraction: initialData?.currentTraction || '',
});

const hasAnyDraftContent = (formData: ICPInputFormData) =>
  Object.values(formData).some((value) => value.trim().length > 0);

const formatSavedTime = (timestamp: number | null) => {
  if (!timestamp) return null;

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
};

const CORE_STEPS: Array<{
  number: string;
  field: keyof ICPInputFormData;
  question: string;
  placeholder: string;
  hint: string;
  unlocks: string;
}> = [
  {
    number: '01',
    field: 'problemStatement',
    question: 'What painful, specific problem are you solving?',
    placeholder:
      "Describe the job that keeps breaking. Include the moment it shows up, what gets delayed or lost, and why it matters enough to change behavior.",
    hint: 'Avoid broad category language. Name the painful moment, not the market.',
    unlocks: 'Defines the job to be done and the pain you need to win.',
  },
  {
    number: '02',
    field: 'targetAudience',
    question: 'Who feels this problem most acutely?',
    placeholder:
      "Describe one concrete segment: role, company type, team size, workflow context, and what makes this problem expensive or annoying for them right now.",
    hint: 'A narrow first segment is a strength, not a weakness.',
    unlocks: 'Sets the first ICP instead of a vague audience.',
  },
  {
    number: '03',
    field: 'currentBehavior',
    question: 'What do they do today instead of using you?',
    placeholder:
      "Describe the real workaround: spreadsheets, agencies, manual ops, internal tools, doing nothing, or stitching multiple products together.",
    hint: 'Behavior beats competitor lists because it reveals inertia and switching cost.',
    unlocks: 'Shows the incumbent behavior you must replace.',
  },
  {
    number: '04',
    field: 'solutionDifferentiator',
    question: 'Why is your approach structurally better?',
    placeholder:
      "Explain why your solution is better in a way that matters: faster time-to-value, lower cost, lower effort, better accuracy, better workflow fit, stronger trust, or a wedge others do not have.",
    hint: 'Focus on structural advantage, not feature volume.',
    unlocks: 'Clarifies your wedge and the reason to switch.',
  },
  {
    number: '05',
    field: 'marketTiming',
    question: 'Why is this the right moment to solve it?',
    placeholder:
      "Describe what changed: buyer behavior, regulation, new infrastructure, AI cost curve, distribution shift, or a market event that makes this more urgent or more possible now.",
    hint: 'Timing matters because a good idea can still be mistimed.',
    unlocks: 'Tests whether the market window is real or imagined.',
  },
];

const StepView: React.FC<{ children: React.ReactNode; stepKey: number }> = ({ children, stepKey }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(timer);
  }, [stepKey]);

  return (
    <div className={cn('transition-all duration-500', visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')}>
      {children}
    </div>
  );
};

const ICPInputForm: React.FC<ICPInputFormProps> = ({
  initialData,
  initialStep = 0,
  onSubmit,
  isSubmitting = false,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ICPInputFormData>(createFormData(initialData));
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [saveState, setSaveState] = useState<'idle' | 'restored' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [stepFeedback, setStepFeedback] = useState<{ step: number; message: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasHydratedDraft = useRef(false);

  const totalSteps = CORE_STEPS.length;
  const isReview = currentStep === totalSteps;
  const step = CORE_STEPS[currentStep];
  const currentValue = step ? (formData[step.field] as string) : '';
  const canContinue = currentValue.trim().length > 0;
  const storageKey = getIcpDraftStorageKey(user?.id);
  const completedOptionalCount = [
    formData.painCost,
    formData.founderEdge,
    formData.nextGoals,
    formData.mainCompetitors,
    formData.industry,
    formData.revenueModel,
    formData.currentTraction,
  ].filter(Boolean).length;

  useEffect(() => {
    if (!isReview) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 450);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isReview]);

  useEffect(() => {
    if (stepFeedback?.step === currentStep && canContinue) {
      setStepFeedback(null);
    }
  }, [canContinue, currentStep, stepFeedback]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rawDraft = window.localStorage.getItem(storageKey);
      if (!rawDraft) {
        setCurrentStep(Math.min(Math.max(initialStep, 0), totalSteps));
        hasHydratedDraft.current = true;
        return;
      }

      const parsedDraft = JSON.parse(rawDraft) as Partial<ICPDraftPayload>;
      if (parsedDraft.version !== ICP_DRAFT_VERSION || !parsedDraft.formData) {
        hasHydratedDraft.current = true;
        return;
      }

      setFormData(createFormData(parsedDraft.formData));
      setCurrentStep(
        typeof parsedDraft.currentStep === 'number'
          ? Math.min(Math.max(parsedDraft.currentStep, 0), totalSteps)
          : 0
      );
      setLastSavedAt(typeof parsedDraft.updatedAt === 'number' ? parsedDraft.updatedAt : null);
      setSaveState('restored');
    } catch (error) {
      console.error('Failed to restore ICP Builder draft:', error);
    } finally {
      hasHydratedDraft.current = true;
    }
  }, [initialStep, storageKey, totalSteps]);

  useEffect(() => {
    if (!hasHydratedDraft.current || typeof window === 'undefined') return;

    if (!hasAnyDraftContent(formData) && currentStep === 0) {
      window.localStorage.removeItem(storageKey);
      setSaveState('idle');
      setLastSavedAt(null);
      return;
    }

    setSaveState('saving');

    const timer = window.setTimeout(() => {
      const payload: ICPDraftPayload = {
        version: ICP_DRAFT_VERSION,
        currentStep,
        formData,
        updatedAt: Date.now(),
      };

      try {
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
        setSaveState('saved');
        setLastSavedAt(payload.updatedAt);
      } catch (error) {
        console.error('Failed to save ICP Builder draft:', error);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [currentStep, formData, storageKey]);

  const setField = (field: keyof ICPInputFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // FIX(dead-click): /icp-builder — blocked wizard CTAs now focus the current textarea and explain the missing input instead of relying on a dead disabled button.
  const handleBlockedContinue = () => {
    setStepFeedback({
      step: currentStep,
      message: 'Add enough detail here so the next ICP decision is grounded in something specific.',
    });
    textareaRef.current?.focus();
  };

  const StepIndicator = () => (
    <div className="mb-8 rounded-[1.5rem] border border-border/60 bg-background/80 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Core Brief</p>
          <p className="mt-1 text-sm text-foreground/80">Answer the five questions that most directly shape customer clarity.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {saveState === 'restored' && lastSavedAt
              ? `Draft restored · ${formatSavedTime(lastSavedAt)}`
              : saveState === 'saving'
                ? 'Saving progress...'
                : saveState === 'saved' && lastSavedAt
                  ? `Progress saved · ${formatSavedTime(lastSavedAt)}`
                  : 'Progress autosaves in this browser.'}
          </p>
        </div>
        <div className="rounded-2xl bg-muted px-3 py-2 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Progress</p>
          <p className="text-sm font-semibold">{Math.min(currentStep + (isReview ? 0 : 1), totalSteps)} / {totalSteps}</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1">
      {CORE_STEPS.map((item, index) => {
        const isDone = index < currentStep || isReview;
        const isActive = index === currentStep && !isReview;
        const hasValue = (formData[item.field] as string).trim().length > 0;
        return (
          <React.Fragment key={item.field}>
            {isDone && hasValue ? (
              <button
                type="button"
                onClick={() => setCurrentStep(index)}
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 cursor-pointer bg-primary text-primary-foreground shadow-sm"
                title={`Edit: ${item.question}`}
              >
                {/* FIX(dead-click): /icp-builder — future step indicators are no longer clickable until the user actually unlocks them. */}
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300',
                  isActive
                    ? 'border-2 border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                    : 'border border-border/60 bg-muted/70 text-muted-foreground',
                )}
              >
                {item.number}
              </div>
            )}
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  'h-0.5 max-w-[1.35rem] flex-1 rounded-full transition-all duration-500',
                  index < currentStep ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
          </React.Fragment>
        );
      })}
      </div>
    </div>
  );

  if (isReview) {
    return (
      <div className="space-y-6">
        <StepIndicator />
        <StepView stepKey={totalSteps}>
          <div className="space-y-6">
            <div className="text-center">
              <p className="mb-1 text-xs font-mono uppercase tracking-widest text-primary/60">Review</p>
              <h2 className="text-2xl font-semibold">Your current ICP thesis</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The core questions are complete. Add optional precision only if it meaningfully improves confidence.
              </p>
            </div>

            <Card className="rounded-[1.75rem] border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_42%),rgba(14,165,233,0.05)]">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="space-y-2">
                    <p className="font-medium">What the analysis will do</p>
                    <p className="text-sm text-muted-foreground">
                      Recommend the first ICP to pursue, explain why that segment wins, define your wedge, and give you validation experiments instead of a generic report.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {CORE_STEPS.map((item, index) => (
              <Card key={item.field} className="group rounded-[1.5rem] border-border/60 shadow-sm">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="mt-0.5 shrink-0 text-xs font-mono text-primary/50">{item.number}</span>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-xs text-muted-foreground">{item.question}</p>
                        <p className="whitespace-pre-wrap break-words text-sm font-medium text-foreground">
                          {(formData[item.field] as string) || <span className="italic text-muted-foreground">Not answered</span>}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => setCurrentStep(index)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <AdvancedFieldsSection
              defaultOpen={completedOptionalCount > 0}
              completedCount={completedOptionalCount}
              totalCount={7}
            >
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="painCost">How expensive is the problem?</Label>
                    <Textarea
                      id="painCost"
                      value={formData.painCost}
                      onChange={(e) => setField('painCost', e.target.value)}
                      placeholder="Time lost, money lost, blocked outcomes, stress, compliance risk, team drag..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="founderEdge">Why are you credible to solve this?</Label>
                    <Textarea
                      id="founderEdge"
                      value={formData.founderEdge}
                      onChange={(e) => setField('founderEdge', e.target.value)}
                      placeholder="Lived experience, domain expertise, network access, data, technical edge, trust..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextGoals">What decision or milestone matters next?</Label>
                  <Textarea
                    id="nextGoals"
                    value={formData.nextGoals}
                    onChange={(e) => setField('nextGoals', e.target.value)}
                    placeholder="Examples: get 10 interviews in 2 weeks, validate willingness to pay, close 3 design partners, land first 5 paying customers."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mainCompetitors">Named competitors or alternatives</Label>
                  <Textarea
                    id="mainCompetitors"
                    value={formData.mainCompetitors}
                    onChange={(e) => setField('mainCompetitors', e.target.value)}
                    placeholder="Specific tools, agencies, internal processes, or manual workarounds your customer already uses."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={formData.industry} onValueChange={(value) => setField('industry', value)}>
                      <SelectTrigger id="industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revenueModel">Revenue model</Label>
                    <Select value={formData.revenueModel} onValueChange={(value) => setField('revenueModel', value)}>
                      <SelectTrigger id="revenueModel">
                        <SelectValue placeholder="Select revenue model" />
                      </SelectTrigger>
                      <SelectContent>
                        {REVENUE_MODELS.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentTraction">What evidence do you already have?</Label>
                  <Textarea
                    id="currentTraction"
                    value={formData.currentTraction}
                    onChange={(e) => setField('currentTraction', e.target.value)}
                    placeholder="Interviews, waitlist signups, paid pilots, retained customers, usage patterns, referrals, response rates..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </AdvancedFieldsSection>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={goBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={() => onSubmit(formData)}
                disabled={isSubmitting}
                className="flex-1 gap-2"
                size="lg"
                data-telemetry-id="icp-builder-save"
                data-track-click="icp-builder-save"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building Your ICP Decision
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    Generate ICP Decision
                  </>
                )}
              </Button>
            </div>
          </div>
        </StepView>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator />
      <StepView stepKey={currentStep}>
        <div className="space-y-6">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-border/60 bg-background/85 p-6 shadow-sm">
              <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="select-none text-4xl font-bold leading-none text-primary/20">{step.number}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                <span className="text-xs tabular-nums text-muted-foreground">{currentStep + 1} of {totalSteps}</span>
              </div>
                <h2 className="text-2xl font-semibold leading-snug md:text-[2rem]">{step.question}</h2>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{step.hint}</p>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs text-primary/80">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                  {step.unlocks}
                </div>
              </div>
            </div>

            <Card className="rounded-[1.75rem] border border-border/60 shadow-sm">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Founder input</p>
                    <p className="mt-1 text-sm text-foreground/70">Answer in plain language. Precision beats polish.</p>
                  </div>
                  <div className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                    {currentValue.trim().length} characters
                  </div>
                </div>

                <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={currentValue}
                onChange={(e) => setField(step.field, e.target.value)}
                placeholder={step.placeholder}
                rows={8}
                className={cn(
                  'resize-none rounded-[1.35rem] border-border/60 bg-muted/20 p-5 text-base leading-relaxed transition-all duration-200',
                  'focus:border-primary/60 focus:ring-2 focus:ring-primary/30',
                  canContinue && 'border-primary/30 shadow-[0_0_0_1px_rgba(14,165,233,0.08)]',
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canContinue) {
                    goNext();
                  }
                }}
              />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Cmd/Ctrl + Enter to continue</p>
                    <p className="text-right text-xs text-muted-foreground">
                      {canContinue ? (
                        <span className="inline-flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Ready to move on
                        </span>
                      ) : (
                        <span>Add enough detail to make the next decision obvious.</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button type="button" variant="outline" onClick={goBack} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              <Button
                type="button"
                onClick={canContinue ? goNext : handleBlockedContinue}
                variant={canContinue ? "default" : "outline"}
                className={cn('flex-1 gap-2', currentStep === 0 && 'w-full')}
                size="lg"
              >
                {currentStep === totalSteps - 1 ? (
                  <>
                    Review ICP Thesis
                    <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            {!canContinue && (
              <p className="text-right text-xs text-muted-foreground">
                {stepFeedback?.step === currentStep
                  ? stepFeedback.message
                  : 'Complete this answer before moving to the next ICP step.'}
              </p>
            )}
          </div>
        </div>
      </StepView>
    </div>
  );
};

export default ICPInputForm;
