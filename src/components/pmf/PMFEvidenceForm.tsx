import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ChevronLeft, ChevronRight, Edit2, FlaskConical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { PMFEvidenceAnswers } from '@/hooks/usePMFLab';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';

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
    title: 'Validation setup',
    hint: 'Tell PMF Lab how you tested your Stage II landing page with real customers.',
    objective: 'Defines what evidence the AI should trust when it scores demand',
  },
  {
    number: '02',
    title: 'Interview volume and buying intent',
    hint: `Capture interview count, depth, and whether anyone showed willingness to pay across your ${PMF_REQUIRED_SIGNALS}-interview goal.`,
    objective: 'Measures whether you have enough signal before moving to Building',
  },
  {
    number: '03',
    title: 'Pain, objections, and missing features',
    hint: 'Record what users actually said, what blocked them, and what they felt was missing.',
    objective: 'Extracts the specific insight PMF Lab will use for iteration decisions',
  },
  {
    number: '04',
    title: 'Action-based demand signals',
    hint: 'Count concrete actions, not compliments or polite curiosity.',
    objective: 'Separates real demand from weak interest',
  },
  {
    number: '05',
    title: 'Founder decision check',
    hint: 'Force clarity on what would make you build versus what still needs to change.',
    objective: 'Keeps the final recommendation grounded and honest',
  },
] as const;

const SMART_QUESTION_SETS = [
  [
    'Did you show your landing page during the interview and pitch your solution?',
    'Which customer segment did you interview most in this round?',
    'Did this evidence come from real conversations, outreach replies, or only passive signups?',
  ],
  [
    'How many full interviews did you complete versus how many people did you only contact?',
    'Did anyone ask you about pricing, commitment, or implementation timing?',
    'Based on this evidence, would you feel confident spending time and money on building yet?',
  ],
  [
    'What problem sounded urgent enough that people are already using a workaround today?',
    'What objections kept coming up across multiple interviews?',
    'What feature or capability did people repeatedly say was missing before they would adopt your product?',
  ],
  [
    'Who joined your waitlist, asked follow-up questions, or shared the product with someone else?',
    'What behavior suggests real buying intent instead of polite encouragement?',
    'Which actions were strongest in your test: pricing questions, signups, referrals, or pre-commitment?',
  ],
  [
    'What would make you iterate before building again?',
    `If your score comes in below 75, what should you improve before another round of ${PMF_REQUIRED_SIGNALS} interviews?`,
    'What evidence would make you confident enough to move into Building?',
  ],
];

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
  const interviewProgress = Math.min(100, Math.round((conversationCount / PMF_REQUIRED_SIGNALS) * 100));
  const interviewsRemaining = Math.max(0, PMF_REQUIRED_SIGNALS - conversationCount);

  const toggleTestType = (type: string) => {
    setTestTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const isValid = testTypes.length > 0 && conversationCount >= PMF_REQUIRED_SIGNALS;

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
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-semibold text-foreground">Interview target progress</p>
                <p className="text-muted-foreground">
                  PMF Lab expects at least {PMF_REQUIRED_SIGNALS} founder interviews before it makes a build / iterate recommendation.
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-primary">{conversationCount}/{PMF_REQUIRED_SIGNALS}</p>
                <p className="text-xs text-muted-foreground">
                  {interviewsRemaining === 0 ? 'Target reached' : `${interviewsRemaining} interviews left`}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${interviewProgress}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberInput label="People reached / contacted" value={peopleReached} onChange={setPeopleReached} />
            <NumberInput label={`Completed interviews (goal: ${PMF_REQUIRED_SIGNALS})`} value={conversationCount} onChange={setConversationCount} />
            <NumberInput label="People who showed strong interest" value={strongInterestCount} onChange={setStrongInterestCount} />
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
          {conversationCount < PMF_REQUIRED_SIGNALS && (
            <p className="text-xs text-muted-foreground">
              You can keep filling the workflow, but PMF Lab will not unlock final AI analysis until you log at least {PMF_REQUIRED_SIGNALS} interviews.
            </p>
          )}
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Most painful thing you heard (quote or repeated pattern)</Label>
            <Textarea
              placeholder={'"I spend 90 minutes every project chasing feedback through email threads"'}
              value={mostPainfulQuote}
              onChange={(e) => setMostPainfulQuote(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">What do they do today without you, and what did that reveal about urgency or buying intent?</Label>
            <Textarea
              placeholder="e.g. Most still use Google Docs + email threads. Two already pay for a clunky alternative because the problem is urgent enough."
              value={urgencyProxy}
              onChange={(e) => setUrgencyProxy(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">What objections or missing features kept repeating across interviews?</Label>
            <Textarea
              placeholder="e.g. 9 out of 16 said the value proposition was clear, but 6 said they would need Slack integration before switching. The top objection was trust in setup complexity."
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
          <Label className="text-xs text-muted-foreground">What am I still unsure about before building?</Label>
          <Textarea
            placeholder="e.g. I still do not know whether agencies or solo founders feel the strongest pain, and I am unsure if willingness to pay is high enough without integrations."
            value={founderUncertainties}
            onChange={(e) => setFounderUncertainties(e.target.value)}
            className="text-sm min-h-[80px] resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">What evidence would make me iterate before building again?</Label>
          <Textarea
            placeholder="e.g. If the next 10 interviews keep raising the same missing integration, or if nobody asks about pricing after the landing-page rewrite, I should iterate before building."
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

              <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                PMF Lab will only issue a final Stage III decision once you reach at least {PMF_REQUIRED_SIGNALS} interviews. Below that, you still have directional evidence, but not enough to justify moving into Building.
              </div>

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
                        Analyze Interview Evidence
                      </>
                    )}
                  </Button>
                </div>
                {!isValid && (
                  <p className="text-xs text-muted-foreground text-right">
                    Add at least one test type and {PMF_REQUIRED_SIGNALS} completed interviews to unlock AI scoring.
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
            Turn raw founder interviews into a PMF score, decision, and clear next step before you start building.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Input</p>
              <p className="mt-2 text-sm text-muted-foreground">Show your Stage II landing page in interviews and record what people say in a structured way.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Decision Rule</p>
              <p className="mt-2 text-sm text-muted-foreground">PMF Lab recommends Building only when the score reaches 75+ with enough interview depth.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">AI Output</p>
              <p className="mt-2 text-sm text-muted-foreground">You get score meaning, objections, missing features, buying intent signals, and the next action.</p>
            </div>
          </div>

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

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Smart questions PMF Lab wants answered here</p>
                <ul className="space-y-2">
                  {SMART_QUESTION_SETS[currentStep].map((question) => (
                    <li key={question} className="text-sm text-muted-foreground">
                      {question}
                    </li>
                  ))}
                </ul>
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
