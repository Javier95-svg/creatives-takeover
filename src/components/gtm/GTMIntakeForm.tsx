import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Rocket, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GTMIntakeAnswers } from '@/hooks/useGTMStrategist';

interface GTMIntakeFormProps {
  prefillData: Partial<GTMIntakeAnswers>;
  onSubmit: (answers: GTMIntakeAnswers) => void;
  isSubmitting?: boolean;
}

const BUSINESS_TYPES = [
  'B2B SaaS',
  'B2C Product',
  'Marketplace',
  'Agency / Service',
  'E-commerce',
  'Content / Media',
  'Other',
];

const TRACTION_OPTIONS = [
  'None yet',
  '< 10 users',
  '10–100 users',
  'Waitlist of 100+',
  'First paying customer',
  '$1K+ MRR',
];

const TIME_OPTIONS = [
  '1–2 hrs/week',
  '3–5 hrs/week',
  '5–10 hrs/week',
  '10+ hrs/week',
];

const BUDGET_OPTIONS = [
  '$0 (time only)',
  '< $100/month',
  '$100–$500/month',
  '$500+/month',
];

const ONLINE_CHANNELS = [
  'LinkedIn',
  'Twitter / X',
  'Reddit',
  'Discord',
  'Instagram',
  'TikTok',
  'YouTube',
  'Email newsletters',
  'Industry blogs / forums',
];

const FOUNDER_STRENGTHS = [
  'Writing',
  'Speaking / Video',
  'Networking',
  'Coding / Technical',
  'Design',
  'Cold outreach',
];

// Animates on step change
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

const TOTAL_STEPS = 8;

const GTMIntakeForm: React.FC<GTMIntakeFormProps> = ({ prefillData, onSubmit, isSubmitting = false }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<GTMIntakeAnswers>({
    businessType: '',
    targetAudience: prefillData.targetAudience || '',
    audienceOnlineHabits: [],
    problemAndSolution: prefillData.problemAndSolution || '',
    currentTraction: '',
    weeklyTimeForMarketing: '',
    budget: '',
    founderStrengths: [],
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update prefill when it loads asynchronously
  useEffect(() => {
    setAnswers(prev => ({
      ...prev,
      targetAudience: prefillData.targetAudience || prev.targetAudience,
      problemAndSolution: prefillData.problemAndSolution || prev.problemAndSolution,
    }));
  }, [prefillData.targetAudience, prefillData.problemAndSolution]);

  useEffect(() => {
    if (currentStep === 1 || currentStep === 3) {
      const t = setTimeout(() => textareaRef.current?.focus(), 550);
      return () => clearTimeout(t);
    }
  }, [currentStep]);

  const isOptional = currentStep === 6 || currentStep === 7;

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 0: return !!answers.businessType;
      case 1: return answers.targetAudience.trim().length > 0;
      case 2: return answers.audienceOnlineHabits.length > 0;
      case 3: return answers.problemAndSolution.trim().length > 0;
      case 4: return !!answers.currentTraction;
      case 5: return !!answers.weeklyTimeForMarketing;
      case 6: return true; // optional
      case 7: return true; // optional
      default: return false;
    }
  };

  const toggleMultiSelect = (field: 'audienceOnlineHabits' | 'founderStrengths', value: string) => {
    setAnswers(prev => {
      const arr = prev[field] || [];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  };

  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) setCurrentStep(s => s + 1);
    else handleSubmit();
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const skip = () => {
    if (currentStep < TOTAL_STEPS - 1) setCurrentStep(s => s + 1);
    else handleSubmit();
  };

  const handleSubmit = () => onSubmit(answers);

  const isPrefilled = (field: keyof GTMIntakeAnswers) => {
    if (field === 'targetAudience' && prefillData.targetAudience) return true;
    if (field === 'problemAndSolution' && prefillData.problemAndSolution) return true;
    return false;
  };

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        const stepNum = String(i + 1).padStart(2, '0');
        return (
          <React.Fragment key={i}>
            <button
              type="button"
              onClick={() => isDone && setCurrentStep(i)}
              className={cn(
                'relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 shrink-0',
                isDone
                  ? 'bg-primary text-primary-foreground cursor-pointer shadow-sm'
                  : isActive
                  ? 'bg-primary/10 text-primary border-2 border-primary ring-2 ring-primary/20 cursor-default'
                  : 'bg-muted text-muted-foreground cursor-default',
              )}
            >
              {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNum}
            </button>
            {i < TOTAL_STEPS - 1 && (
              <div className={cn('h-0.5 flex-1 max-w-[1.25rem] rounded-full transition-all duration-500', i < currentStep ? 'bg-primary' : 'bg-muted')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold font-mono text-primary/20 leading-none select-none">01</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                <span className="text-xs text-muted-foreground">1 of {TOTAL_STEPS}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold leading-snug">What type of business is this?</h2>
              <p className="text-sm text-muted-foreground">This is the biggest factor in which channels work for you.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              Determines B2B vs B2C channel set
            </div>
            <Select value={answers.businessType} onValueChange={v => setAnswers(prev => ({ ...prev, businessType: v }))}>
              <SelectTrigger className="text-base h-12"><SelectValue placeholder="Select business type" /></SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold font-mono text-primary/20 leading-none select-none">02</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                <span className="text-xs text-muted-foreground">2 of {TOTAL_STEPS}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold leading-snug">Describe your ideal customer in 2–3 sentences.</h2>
              <p className="text-sm text-muted-foreground">Include their role, company size, context, and why this problem hits them hardest.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              Segment specificity determines which channels can reach them
            </div>
            {isPrefilled('targetAudience') && (
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary/80">
                <Sparkles className="w-3 h-3" />
                Pre-filled from ICP Builder
              </Badge>
            )}
            <Textarea
              ref={textareaRef}
              value={answers.targetAudience}
              onChange={e => setAnswers(prev => ({ ...prev, targetAudience: e.target.value }))}
              placeholder="e.g. Ops managers at 20–100 person remote-first tech companies who waste 3–5 hours/week manually tracking team status in Slack threads and spreadsheets."
              rows={4}
              className={cn('resize-none text-base transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/60', answers.targetAudience.trim() && 'border-primary/30')}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canContinue()) goNext(); }}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold font-mono text-primary/20 leading-none select-none">03</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                <span className="text-xs text-muted-foreground">3 of {TOTAL_STEPS}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold leading-snug">Where does your customer spend time online?</h2>
              <p className="text-sm text-muted-foreground">Select all that apply. Honest answers here dramatically improve channel recommendations.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              Validates channel hypotheses — don't guess where you wish they were
            </div>
            <div className="flex flex-wrap gap-2">
              {ONLINE_CHANNELS.map(ch => {
                const selected = answers.audienceOnlineHabits.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleMultiSelect('audienceOnlineHabits', ch)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border',
                      selected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                    )}
                  >
                    {selected && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                    {ch}
                  </button>
                );
              })}
            </div>
            {answers.audienceOnlineHabits.length > 0 && (
              <p className="text-xs text-primary flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {answers.audienceOnlineHabits.length} selected
              </p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold font-mono text-primary/20 leading-none select-none">04</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                <span className="text-xs text-muted-foreground">4 of {TOTAL_STEPS}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold leading-snug">What problem do you solve, and how?</h2>
              <p className="text-sm text-muted-foreground">Be specific about the pain and your mechanism. This feeds your positioning and messaging.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              Drives your positioning statement and messaging hierarchy
            </div>
            {isPrefilled('problemAndSolution') && (
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary/80">
                <Sparkles className="w-3 h-3" />
                Pre-filled from ICP Builder
              </Badge>
            )}
            <Textarea
              ref={textareaRef}
              value={answers.problemAndSolution}
              onChange={e => setAnswers(prev => ({ ...prev, problemAndSolution: e.target.value }))}
              placeholder="e.g. Remote ops managers waste 3–5 hours/week manually chasing team status in Slack. Our tool auto-surfaces blockers and creates a daily async standup digest, giving ops managers 4 hours back per week."
              rows={5}
              className={cn('resize-none text-base transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/60', answers.problemAndSolution.trim() && 'border-primary/30')}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canContinue()) goNext(); }}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold font-mono text-primary/20 leading-none select-none">05</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                <span className="text-xs text-muted-foreground">5 of {TOTAL_STEPS}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold leading-snug">What traction do you have right now?</h2>
              <p className="text-sm text-muted-foreground">Be honest. This sets realistic channel prerequisites (e.g., Product Hunt needs existing users).</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              Sets the realistic starting point for tactics
            </div>
            <Select value={answers.currentTraction} onValueChange={v => setAnswers(prev => ({ ...prev, currentTraction: v }))}>
              <SelectTrigger className="text-base h-12"><SelectValue placeholder="Select current traction" /></SelectTrigger>
              <SelectContent>
                {TRACTION_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold font-mono text-primary/20 leading-none select-none">06</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                <span className="text-xs text-muted-foreground">6 of {TOTAL_STEPS}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold leading-snug">How many hours per week can you spend on marketing?</h2>
              <p className="text-sm text-muted-foreground">This is a hard constraint. We'll only recommend channels you can realistically work.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              Eliminates high-effort channels if time is limited
            </div>
            <Select value={answers.weeklyTimeForMarketing} onValueChange={v => setAnswers(prev => ({ ...prev, weeklyTimeForMarketing: v }))}>
              <SelectTrigger className="text-base h-12"><SelectValue placeholder="Select weekly time" /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold font-mono text-primary/20 leading-none select-none">07</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                <span className="text-xs text-muted-foreground flex items-center gap-1">7 of {TOTAL_STEPS} <Badge variant="outline" className="text-[10px] py-0">Optional</Badge></span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold leading-snug">What's your monthly marketing budget?</h2>
              <p className="text-sm text-muted-foreground">Paid channels are excluded when budget is $0 or minimal. Skip if you're unsure.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              Eliminates paid / ads channels when budget is zero
            </div>
            <Select value={answers.budget || ''} onValueChange={v => setAnswers(prev => ({ ...prev, budget: v }))}>
              <SelectTrigger className="text-base h-12"><SelectValue placeholder="Select budget (optional)" /></SelectTrigger>
              <SelectContent>
                {BUDGET_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold font-mono text-primary/20 leading-none select-none">08</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                <span className="text-xs text-muted-foreground flex items-center gap-1">8 of {TOTAL_STEPS} <Badge variant="outline" className="text-[10px] py-0">Optional</Badge></span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold leading-snug">What are you naturally good at?</h2>
              <p className="text-sm text-muted-foreground">We match channels to your strengths so you build momentum faster.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              Channels that match your strengths outperform by 2–3x
            </div>
            <div className="flex flex-wrap gap-2">
              {FOUNDER_STRENGTHS.map(s => {
                const selected = (answers.founderStrengths || []).includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleMultiSelect('founderStrengths', s)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border',
                      selected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                    )}
                  >
                    {selected && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 pb-2">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold creatives-font takeover-gradient leading-tight pb-2">GTM Strategist</h1>
        <p className="text-lg sm:text-xl md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">8 targeted questions → an opinionated strategy built for your exact situation.</p>
      </div>

      <StepIndicator />

      <StepView stepKey={currentStep}>
        {renderStep()}
      </StepView>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {currentStep > 0 && (
          <Button type="button" variant="outline" onClick={goBack} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        {isOptional && (
          <Button type="button" variant="ghost" onClick={skip} className="text-muted-foreground">
            Skip
          </Button>
        )}
        <Button
          type="button"
          onClick={goNext}
          disabled={(!canContinue() && !isOptional) || isSubmitting}
          className={cn('flex-1 gap-2 btn-magnetic', currentStep === 0 && 'w-full')}
          size="lg"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</>
          ) : isLastStep ? (
            <><Rocket className="w-4 h-4" />Analyze My GTM Strategy</>
          ) : (
            <>Continue <ChevronRight className="w-4 h-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
};

export default GTMIntakeForm;
