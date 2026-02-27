import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Target, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdvancedFieldsSection } from '@/components/pmf/AdvancedFieldsSection';

export interface ICPInputFormData {
  // Core required — 8 steps
  problemStatement: string;
  painCost: string;
  targetAudience: string;
  currentBehavior: string;
  solutionDifferentiator: string;
  founderEdge: string;
  marketTiming: string;
  nextGoals: string;
  // Advanced optional
  mainCompetitors: string;
  industry: string;
  revenueModel: string;
  currentTraction: string;
}

interface ICPInputFormProps {
  initialData?: Partial<ICPInputFormData>;
  onSubmit: (data: ICPInputFormData) => void;
  isSubmitting?: boolean;
}

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

const STEPS: Array<{
  number: string;
  field: keyof ICPInputFormData;
  question: string;
  placeholder: string;
  hint: string;
  analyticalObjective: string;
}> = [
  {
    number: '01',
    field: 'problemStatement',
    question: 'What specific problem are you solving?',
    placeholder: "Describe the painful gap or frustration your startup addresses. Who experiences it, how often, and in what context?",
    hint: 'Be precise. Vague problems produce vague analyses.',
    analyticalObjective: 'Defines the problem scope and pain specificity',
  },
  {
    number: '02',
    field: 'painCost',
    question: 'What does this problem actually cost your customer?',
    placeholder: "Quantify the cost: hours lost per week, revenue missed, money wasted, stress caused, or opportunities blocked. e.g. 'A mid-market ops manager spends 6 hours/week on manual reconciliation — roughly $3K/month in wasted labor.'",
    hint: 'Quantifying pain reveals urgency, anchors pricing, and validates opportunity size.',
    analyticalObjective: 'Anchors pain intensity score and pricing ceiling',
  },
  {
    number: '03',
    field: 'targetAudience',
    question: 'Who exactly are you solving it for?',
    placeholder: "Describe the specific person: their role, company size, industry, daily context, and why this problem hits them hardest. The more precise, the sharper the profile.",
    hint: 'One segment done well beats five segments done poorly.',
    analyticalObjective: 'Defines ICP boundaries and segment specificity',
  },
  {
    number: '04',
    field: 'currentBehavior',
    question: "What does your target customer currently do instead?",
    placeholder: "What is their actual workaround today? e.g. 'They copy-paste between Excel and email', 'They hire a $5K/month consultant', 'They just don't do it and accept the loss.' Be behavioral, not just competitive.",
    hint: "Behavioral substitutes reveal switching cost, inertia, and where your wedge is.",
    analyticalObjective: 'Maps real switching cost and differentiation gap',
  },
  {
    number: '05',
    field: 'solutionDifferentiator',
    question: 'What makes your solution different and more efficient?',
    placeholder: "How does your approach work differently from what exists? What makes it faster, cheaper, simpler, or more effective — and why is that hard to replicate?",
    hint: 'Focus on structural advantages, not just feature lists.',
    analyticalObjective: 'Surfaces differentiation depth and defensibility',
  },
  {
    number: '06',
    field: 'founderEdge',
    question: 'Why are you the right person to build this?',
    placeholder: "What gives you an unfair advantage here? Domain expertise, lived experience with this problem, proprietary data or relationships, a network others can't access, or a background that gives you insight competitors lack.",
    hint: 'Founder-market fit is a signal of speed, trust, and survivability.',
    analyticalObjective: 'Assesses founder-market fit and execution credibility',
  },
  {
    number: '07',
    field: 'marketTiming',
    question: 'Why now? What has changed to create this window?',
    placeholder: "What shift — in technology, regulation, behavior, infrastructure, or culture — has made this problem newly solvable or newly urgent? e.g. 'LLMs made this 10x cheaper to build', 'Remote work created this category', 'New regulation forces compliance by Q3.'",
    hint: 'Timing is a strategic variable. Great ideas at the wrong time fail.',
    analyticalObjective: 'Evaluates market readiness, timing risk, and opportunity window',
  },
  {
    number: '08',
    field: 'nextGoals',
    question: 'What do you want to achieve next?',
    placeholder: "e.g. Get my first 10 paying customers in 60 days, validate PMF before fundraising, reach $10K MRR by Q3, launch on Product Hunt next month.",
    hint: 'Specific goals shape the action plan your analysis will generate.',
    analyticalObjective: 'Aligns action plan to your immediate strategic horizon',
  },
];

// Animates when step changes
const StepView: React.FC<{ children: React.ReactNode; stepKey: number }> = ({ children, stepKey }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [stepKey]);

  return (
    <div className={cn('transition-all duration-500', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
      {children}
    </div>
  );
};

const ICPInputForm: React.FC<ICPInputFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<ICPInputFormData>({
    problemStatement: initialData?.problemStatement || '',
    painCost: initialData?.painCost || '',
    targetAudience: initialData?.targetAudience || '',
    currentBehavior: initialData?.currentBehavior || '',
    solutionDifferentiator: initialData?.solutionDifferentiator || '',
    founderEdge: initialData?.founderEdge || '',
    marketTiming: initialData?.marketTiming || '',
    nextGoals: initialData?.nextGoals || '',
    mainCompetitors: initialData?.mainCompetitors || '',
    industry: initialData?.industry || '',
    revenueModel: initialData?.revenueModel || '',
    currentTraction: initialData?.currentTraction || '',
  });

  // 0–8 = steps, 9 = review
  const [currentStep, setCurrentStep] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const totalSteps = STEPS.length;
  const isReview = currentStep === totalSteps;
  const step = STEPS[currentStep];
  const currentValue = step ? (formData[step.field] as string) : '';
  const canContinue = currentValue.trim().length > 0;

  useEffect(() => {
    if (!isReview) {
      const t = setTimeout(() => textareaRef.current?.focus(), 550);
      return () => clearTimeout(t);
    }
  }, [currentStep, isReview]);

  const handleFieldChange = (value: string) => {
    setFormData(prev => ({ ...prev, [step.field]: value }));
  };

  const goNext = () => {
    if (currentStep < totalSteps) setCurrentStep(s => s + 1);
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const editStep = (index: number) => setCurrentStep(index);

  const handleSubmit = () => onSubmit(formData);

  // ── Step Indicator ─────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((s, i) => {
        const isDone = i < currentStep || isReview;
        const isActive = i === currentStep && !isReview;
        const hasValue = (formData[s.field] as string).trim().length > 0;
        return (
          <React.Fragment key={i}>
            <button
              type="button"
              onClick={() => (isDone || isActive) && editStep(i)}
              className={cn(
                'relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 shrink-0',
                isDone && hasValue
                  ? 'bg-primary text-primary-foreground cursor-pointer shadow-sm'
                  : isActive
                  ? 'bg-primary/10 text-primary border-2 border-primary ring-2 ring-primary/20 cursor-default'
                  : 'bg-muted text-muted-foreground cursor-default',
              )}
              title={isDone ? `Edit: ${s.question}` : undefined}
            >
              {isDone && hasValue ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                s.number
              )}
            </button>
            {i < totalSteps - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 max-w-[1.25rem] rounded-full transition-all duration-500',
                  i < currentStep ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Review screen ───────────────────────────────────────────────
  if (isReview) {
    return (
      <div className="space-y-6">
        <StepIndicator />
        <StepView stepKey={totalSteps}>
          <div className="space-y-4">
            <div className="text-center space-y-1 mb-6">
              <p className="text-xs font-mono text-primary/60 uppercase tracking-widest">Review</p>
              <h2 className="text-xl font-semibold">Your startup foundation</h2>
              <p className="text-sm text-muted-foreground">Review all answers, then generate your ICP analysis.</p>
            </div>

            {STEPS.map((s, i) => (
              <Card key={i} className="hover-lift border-border/60 group">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-xs font-mono text-primary/50 mt-0.5 shrink-0">{s.number}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{s.question}</p>
                        <p className="text-sm font-medium text-foreground whitespace-pre-wrap break-words">
                          {(formData[s.field] as string) || <span className="text-muted-foreground italic">Not answered</span>}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                      onClick={() => editStep(i)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Advanced optional fields */}
            <AdvancedFieldsSection
              defaultOpen={false}
              completedCount={[formData.mainCompetitors, formData.industry, formData.revenueModel, formData.currentTraction].filter(Boolean).length}
              totalCount={4}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mainCompetitors">Named Competitors</Label>
                  <Textarea
                    id="mainCompetitors"
                    value={formData.mainCompetitors}
                    onChange={(e) => setFormData(prev => ({ ...prev, mainCompetitors: e.target.value }))}
                    placeholder="List specific competitor products or companies, and what they offer."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={formData.industry} onValueChange={(v) => setFormData(prev => ({ ...prev, industry: v }))}>
                      <SelectTrigger id="industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revenueModel">Revenue Model</Label>
                    <Select value={formData.revenueModel} onValueChange={(v) => setFormData(prev => ({ ...prev, revenueModel: v }))}>
                      <SelectTrigger id="revenueModel"><SelectValue placeholder="Select model" /></SelectTrigger>
                      <SelectContent>
                        {REVENUE_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentTraction">Current Traction</Label>
                  <Textarea
                    id="currentTraction"
                    value={formData.currentTraction}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentTraction: e.target.value }))}
                    placeholder="Any early signals? Waitlist sign-ups, pilot users, paid customers, interviews…"
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </AdvancedFieldsSection>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={goBack} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 btn-magnetic gap-2"
                size="lg"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Analyzing Your Niche Market...</>
                ) : (
                  <><Target className="w-4 h-4" />Identify My ICP</>
                )}
              </Button>
            </div>
          </div>
        </StepView>
      </div>
    );
  }

  // ── Step screen ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <StepIndicator />
      <StepView stepKey={currentStep}>
        <div className="space-y-6">
          {/* Question header */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold font-mono text-primary/20 leading-none select-none">{step.number}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
              <span className="text-xs text-muted-foreground tabular-nums">{currentStep + 1} of {totalSteps}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold leading-snug">{step.question}</h2>
            <p className="text-sm text-muted-foreground">{step.hint}</p>
          </div>

          {/* Analytical objective badge */}
          <div className="inline-flex items-center gap-1.5 text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
            {step.analyticalObjective}
          </div>

          {/* Textarea */}
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={currentValue}
              onChange={(e) => handleFieldChange(e.target.value)}
              placeholder={step.placeholder}
              rows={5}
              className={cn(
                'resize-none text-base transition-all duration-200',
                'focus:ring-2 focus:ring-primary/30 focus:border-primary/60',
                canContinue && 'border-primary/30',
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canContinue) goNext();
              }}
            />
            <p className="text-xs text-muted-foreground text-right">
              {canContinue ? (
                <span className="text-green-600 dark:text-green-400 flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              ) : (
                <span>Cmd/Ctrl + Enter to continue</span>
              )}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={goBack} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <Button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className={cn('flex-1 gap-2 btn-magnetic', currentStep === 0 && 'w-full')}
              size="lg"
            >
              {currentStep === totalSteps - 1 ? (
                <>Review Answers <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      </StepView>
    </div>
  );
};

export default ICPInputForm;
