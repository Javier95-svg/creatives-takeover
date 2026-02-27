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
  problemStatement: string;
  targetAudience: string;
  solutionDifferentiator: string;
  founderEdge: string;
  nextGoals: string;
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

const STEPS = [
  {
    number: '01',
    field: 'problemStatement' as keyof ICPInputFormData,
    question: 'What specific problem are you solving?',
    placeholder: "What painful gap or frustration does your startup address? Who experiences it, how often, and what does it cost them (time, money, stress)?",
    hint: 'Be specific about the pain and who feels it most.',
  },
  {
    number: '02',
    field: 'targetAudience' as keyof ICPInputFormData,
    question: 'Who are you solving it for?',
    placeholder: "Describe the specific person or group you're building for. Include their role, context, key traits, and why this problem matters most to them.",
    hint: 'The more specific, the better the analysis.',
  },
  {
    number: '03',
    field: 'solutionDifferentiator' as keyof ICPInputFormData,
    question: 'What makes your solution different and more efficient?',
    placeholder: "How does your solution work differently from what exists today? What makes it faster, cheaper, simpler, or more effective than the current alternatives?",
    hint: 'Focus on what makes you 10x better, not just slightly better.',
  },
  {
    number: '04',
    field: 'founderEdge' as keyof ICPInputFormData,
    question: 'Why are you the right person to build this?',
    placeholder: "What gives you an edge here? Domain expertise, lived experience with this problem, a unique network, proprietary insight, or a background that others in this space don't have.",
    hint: 'Investors and customers care about founder-market fit.',
  },
  {
    number: '05',
    field: 'nextGoals' as keyof ICPInputFormData,
    question: 'What do you want to achieve next?',
    placeholder: "e.g. Get my first 10 paying customers, validate PMF in 60 days, raise a pre-seed round, launch publicly on Product Hunt",
    hint: 'Be specific. These goals will shape your action plan.',
  },
];

// Animates when step changes — force re-mount
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
    targetAudience: initialData?.targetAudience || '',
    solutionDifferentiator: initialData?.solutionDifferentiator || '',
    founderEdge: initialData?.founderEdge || '',
    nextGoals: initialData?.nextGoals || '',
    mainCompetitors: initialData?.mainCompetitors || '',
    industry: initialData?.industry || '',
    revenueModel: initialData?.revenueModel || '',
    currentTraction: initialData?.currentTraction || '',
  });

  // 0–4 = steps, 5 = review
  const [currentStep, setCurrentStep] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const totalSteps = STEPS.length;
  const isReview = currentStep === totalSteps;
  const step = STEPS[currentStep];
  const currentValue = step ? (formData[step.field] as string) : '';
  const canContinue = currentValue.trim().length > 0;

  // Auto-focus textarea on step change
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

  // ── Step Indicator ──────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
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
                'relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                isDone && hasValue
                  ? 'bg-primary text-primary-foreground cursor-pointer shadow-md'
                  : isActive
                  ? 'bg-primary/10 text-primary border-2 border-primary ring-2 ring-primary/20 cursor-default'
                  : 'bg-muted text-muted-foreground cursor-default',
              )}
              title={isDone ? `Edit: ${s.question}` : undefined}
            >
              {isDone && hasValue ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                s.number
              )}
            </button>
            {i < totalSteps - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 max-w-[2rem] rounded-full transition-all duration-500',
                  i < currentStep ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Review screen ────────────────────────────────────────────
  if (isReview) {
    return (
      <div className="space-y-6">
        <StepIndicator />
        <StepView stepKey={totalSteps}>
          <div className="space-y-4">
            <div className="text-center space-y-1 mb-6">
              <p className="text-xs font-mono text-primary/60 uppercase tracking-widest">Review</p>
              <h2 className="text-xl font-semibold">Your startup foundation</h2>
              <p className="text-sm text-muted-foreground">Review your answers, then generate your ICP analysis.</p>
            </div>

            {STEPS.map((s, i) => (
              <Card
                key={i}
                className="hover-lift border-border/60 group"
              >
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
                  <Label htmlFor="mainCompetitors">Main Competitors</Label>
                  <Textarea
                    id="mainCompetitors"
                    value={formData.mainCompetitors}
                    onChange={(e) => setFormData(prev => ({ ...prev, mainCompetitors: e.target.value }))}
                    placeholder="List your main competitors and what they offer."
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
                    placeholder="Any early signals? Waitlist sign-ups, pilot users, interviews…"
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

  // ── Step screen ──────────────────────────────────────────────
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
