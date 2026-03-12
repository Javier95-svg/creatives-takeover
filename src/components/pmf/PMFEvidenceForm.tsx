import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ChevronLeft, ChevronRight, Edit2, FlaskConical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { PMFEvidenceAnswers } from '@/hooks/usePMFLab';

const TEST_TYPES = [
  'Landing page',
  'Cold DM outreach',
  'Email outreach',
  'Concept pitch',
  'Problem interview',
  'Survey',
  'Prototype demo',
  'Offer / pricing page',
  'Other',
];

const STEPS = [
  {
    number: '01',
    title: 'What did you test?',
    hint: "Select the validation methods you've already run.",
    objective: 'Establishes breadth of your PMF validation process',
  },
  {
    number: '02',
    title: 'Validation scale and depth',
    hint: 'Capture response volume and willingness-to-pay evidence.',
    objective: 'Quantifies evidence quality and market pull',
  },
  {
    number: '03',
    title: 'What users actually said',
    hint: 'Add real quotes or repeated patterns from conversations.',
    objective: 'Measures pain clarity and signal consistency',
  },
  {
    number: '04',
    title: 'Behavior-based demand signals',
    hint: 'Count concrete actions, not polite interest.',
    objective: 'Captures behavioral proof of demand',
  },
  {
    number: '05',
    title: 'Founder reflection',
    hint: 'Surface uncertainty and confidence before deciding to build.',
    objective: 'Assesses decision quality and self-awareness',
  },
] as const;

const NumberInput = ({ label, value, onChange, min = 0 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input
      type="number"
      min={min}
      value={value === 0 ? '' : value}
      placeholder="0"
      onChange={(e) => onChange(Math.max(min, Number(e.target.value || 0)))}
      className="h-9 text-sm"
    />
  </div>
);

const StepView: React.FC<{ children: React.ReactNode; stepKey: number }> = ({ children, stepKey }) => (
  <div key={stepKey} className="animate-fade-in-up">
    {children}
  </div>
);

interface PMFEvidenceFormProps {
  onSubmit: (answers: PMFEvidenceAnswers) => void;
  isSubmitting?: boolean;
}

const PMFEvidenceForm: React.FC<PMFEvidenceFormProps> = ({ onSubmit, isSubmitting = false }) => {
  const [testTypes, setTestTypes] = useState<string[]>([]);

  const [peopleReached, setPeopleReached] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [strongInterestCount, setStrongInterestCount] = useState(0);
  const [wtpSignal, setWtpSignal] = useState<'yes' | 'no' | 'not_tested'>('not_tested');
  const [wtpDetail, setWtpDetail] = useState('');

  const [mostPainfulQuote, setMostPainfulQuote] = useState('');
  const [urgencyProxy, setUrgencyProxy] = useState('');
  const [consistencyNote, setConsistencyNote] = useState('');

  const [askedAboutPricing, setAskedAboutPricing] = useState(0);
  const [joinedWaitlist, setJoinedWaitlist] = useState(0);
  const [sharedWithSomeone, setSharedWithSomeone] = useState(0);
  const [offeredToPay, setOfferedToPay] = useState(0);

  const [founderUncertainties, setFounderUncertainties] = useState('');
  const [whatWouldChangeMind, setWhatWouldChangeMind] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState(5);
  const [currentStep, setCurrentStep] = useState(0);

  const totalSteps = STEPS.length;
  const isReview = currentStep === totalSteps;
  const step = STEPS[currentStep];

  const toggleTestType = (type: string) => {
    setTestTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const isValid = testTypes.length > 0 && conversationCount >= 1;

  const stepHasValue = (index: number) => {
    if (index === 0) return testTypes.length > 0;
    if (index === 1) {
      return (
        peopleReached > 0 ||
        conversationCount > 0 ||
        strongInterestCount > 0 ||
        wtpSignal !== 'not_tested' ||
        wtpDetail.trim().length > 0
      );
    }
    if (index === 2) {
      return (
        mostPainfulQuote.trim().length > 0 ||
        urgencyProxy.trim().length > 0 ||
        consistencyNote.trim().length > 0
      );
    }
    if (index === 3) {
      return askedAboutPricing + joinedWaitlist + sharedWithSomeone + offeredToPay > 0;
    }
    return (
      founderUncertainties.trim().length > 0 ||
      whatWouldChangeMind.trim().length > 0 ||
      confidenceLevel !== 5
    );
  };

  const canContinue = currentStep === 0
    ? testTypes.length > 0
    : currentStep === 1
      ? conversationCount >= 1
      : true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSubmit({
      testTypes,
      peopleReached,
      conversationCount,
      strongInterestCount,
      willingnessToPaySignal: wtpSignal,
      willingnessToPayDetail: wtpDetail || undefined,
      mostPainfulQuote,
      urgencyProxy,
      consistencyNote,
      askedAboutPricing,
      joinedWaitlist,
      sharedWithSomeone,
      offeredToPay,
      founderUncertainties,
      whatWouldChangeMind,
      confidenceLevel,
    });
  };

  const goNext = () => {
    if (currentStep < totalSteps) setCurrentStep((prev) => prev + 1);
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((item, index) => {
        const isDone = index < currentStep || isReview;
        const isActive = index === currentStep && !isReview;
        const hasValue = stepHasValue(index);

        return (
          <React.Fragment key={item.number}>
            <button
              type="button"
              onClick={() => (isDone || isActive) && setCurrentStep(index)}
              className={cn(
                'relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 shrink-0',
                isDone && hasValue
                  ? 'bg-primary text-primary-foreground cursor-pointer shadow-sm'
                  : isActive
                    ? 'bg-primary/10 text-primary border-2 border-primary ring-2 ring-primary/20 cursor-default'
                    : 'bg-muted text-muted-foreground cursor-default'
              )}
              title={isDone ? `Edit: ${item.title}` : undefined}
            >
              {isDone && hasValue ? <CheckCircle2 className="w-3.5 h-3.5" /> : item.number}
            </button>
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 max-w-[1.25rem] rounded-full transition-all duration-500',
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderCurrentStep = () => {
    if (currentStep === 0) {
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TEST_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleTestType(type)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm border transition-all',
                  testTypes.includes(type)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {type}
              </button>
            ))}
          </div>
          {testTypes.length === 0 && (
            <p className="text-xs text-muted-foreground">Select at least one method to continue.</p>
          )}
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberInput label="People reached / contacted" value={peopleReached} onChange={setPeopleReached} />
            <NumberInput label="Conversations / responses" value={conversationCount} onChange={setConversationCount} />
            <NumberInput label="Expressed strong interest" value={strongInterestCount} onChange={setStrongInterestCount} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Did anyone signal willingness to pay or pre-commit?</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              {(['yes', 'no', 'not_tested'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWtpSignal(opt)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm border transition-all',
                    wtpSignal === opt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : "Didn't ask"}
                </button>
              ))}
            </div>
            {wtpSignal === 'yes' && (
              <Textarea
                placeholder="Describe the signal (e.g. '2 people offered $29/mo, 1 asked for invoice')."
                value={wtpDetail}
                onChange={(e) => setWtpDetail(e.target.value)}
                className="text-sm min-h-[70px] resize-none"
              />
            )}
          </div>
          {conversationCount < 1 && (
            <p className="text-xs text-muted-foreground">Add at least 1 conversation/response to continue.</p>
          )}
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Most painful thing you heard (quote or pattern)</Label>
            <Textarea
              placeholder={'"I spend 90 minutes every project chasing feedback through email threads"'}
              value={mostPainfulQuote}
              onChange={(e) => setMostPainfulQuote(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">What do they do today to solve this without you? (urgency proxy)</Label>
            <Textarea
              placeholder="e.g. Most use Google Docs + email threads. A few are paying for Notion workflows."
              value={urgencyProxy}
              onChange={(e) => setUrgencyProxy(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Did different people say similar things? (consistency check)</Label>
            <Textarea
              placeholder="e.g. 5 out of 7 described the same email chaos problem without being prompted."
              value={consistencyNote}
              onChange={(e) => setConsistencyNote(e.target.value)}
              className="text-sm min-h-[70px] resize-none"
            />
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberInput label="Asked about pricing" value={askedAboutPricing} onChange={setAskedAboutPricing} />
            <NumberInput label="Joined waitlist / signed up" value={joinedWaitlist} onChange={setJoinedWaitlist} />
            <NumberInput label="Shared with someone else" value={sharedWithSomeone} onChange={setSharedWithSomeone} />
            <NumberInput label="Offered to pay / pre-order" value={offeredToPay} onChange={setOfferedToPay} />
          </div>
          <p className="text-xs text-muted-foreground">
            Total demand behaviors:{' '}
            <span className="font-medium text-foreground">
              {askedAboutPricing + joinedWaitlist + sharedWithSomeone + offeredToPay}
            </span>
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">What am I still unsure about?</Label>
          <Textarea
            placeholder="e.g. Not sure if they'd pay monthly or one-time. Don't know if agencies vs solos respond differently."
            value={founderUncertainties}
            onChange={(e) => setFounderUncertainties(e.target.value)}
            className="text-sm min-h-[80px] resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">What would change my mind about building this?</Label>
          <Textarea
            placeholder="e.g. If 3 more interviews showed a different pain, or if nobody opens a pricing page."
            value={whatWouldChangeMind}
            onChange={(e) => setWhatWouldChangeMind(e.target.value)}
            className="text-sm min-h-[70px] resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Confidence level in your evidence (1 = no idea, 10 = very confident):{' '}
            <span className="font-medium text-foreground">{confidenceLevel}</span>
          </Label>
          <input
            type="range"
            min={1}
            max={10}
            value={confidenceLevel}
            onChange={(e) => setConfidenceLevel(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>No idea</span>
            <span>Very confident</span>
          </div>
        </div>
      </div>
    );
  };

  const reviewItems = [
    {
      title: 'What did you test?',
      content: testTypes.length ? testTypes.join(', ') : 'No methods selected yet.',
    },
    {
      title: 'Validation scale and depth',
      content: `Reached ${peopleReached}, got ${conversationCount} conversations, ${strongInterestCount} strong-interest signals, willingness to pay: ${wtpSignal === 'not_tested' ? "didn't ask" : wtpSignal}.`,
    },
    {
      title: 'What users actually said',
      content: [mostPainfulQuote, urgencyProxy, consistencyNote].filter(Boolean).join('\n\n') || 'No qualitative notes added.',
    },
    {
      title: 'Behavior-based demand signals',
      content: `Pricing asks: ${askedAboutPricing}, waitlist signups: ${joinedWaitlist}, shares: ${sharedWithSomeone}, offered to pay: ${offeredToPay}.`,
    },
    {
      title: 'Founder reflection',
      content: [founderUncertainties, whatWouldChangeMind].filter(Boolean).join('\n\n') || `Confidence: ${confidenceLevel}/10`,
    },
  ];

  if (isReview) {
    return (
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              PMF Lab
            </CardTitle>
            <CardDescription>
              Review your evidence and generate your PMF readiness analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <StepIndicator />

            <StepView stepKey={totalSteps}>
              <div className="space-y-4">
                <div className="text-center space-y-1 mb-6">
                  <p className="text-xs font-mono text-primary/60 uppercase tracking-widest">Review</p>
                  <h2 className="text-xl font-semibold">Your PMF evidence brief</h2>
                  <p className="text-sm text-muted-foreground">Confirm answers, then run your PMF analysis.</p>
                </div>

                {reviewItems.map((item, index) => (
                  <Card key={item.title} className="hover-lift border-border/60 group">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-xs font-mono text-primary/50 mt-0.5 shrink-0">{STEPS[index].number}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">{item.title}</p>
                            <p className="text-sm font-medium text-foreground whitespace-pre-wrap break-words">{item.content}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                          onClick={() => setCurrentStep(index)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={goBack} className="gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    className="flex-1 btn-magnetic gap-2"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <FlaskConical className="w-4 h-4" />
                        Analyze My Evidence
                      </>
                    )}
                  </Button>
                </div>
                {!isValid && (
                  <p className="text-xs text-muted-foreground text-right">
                    Add at least one test type and 1 conversation to analyze.
                  </p>
                )}
              </div>
            </StepView>
          </CardContent>
        </Card>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            PMF Lab
          </CardTitle>
          <CardDescription>
            Submit your validation evidence step-by-step, then generate a PMF readiness report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <StepIndicator />

          <StepView stepKey={currentStep}>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold font-mono text-primary/20 leading-none select-none">{step.number}</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {currentStep + 1} of {totalSteps}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-semibold leading-snug">{step.title}</h2>
                <p className="text-sm text-muted-foreground">{step.hint}</p>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                {step.objective}
              </div>

              {renderCurrentStep()}

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
                    <>
                      Review Answers
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </StepView>
        </CardContent>
      </Card>
    </form>
  );
};

export default PMFEvidenceForm;
