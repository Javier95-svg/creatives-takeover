import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  FlaskConical,
  Loader2,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { PMFEvidenceAnswers, PMFInterviewLog } from '@/hooks/usePMFLab';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';
import { CreditCostNotice } from '@/components/CreditCostNotice';

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

const BUYING_INTENT_OPTIONS: Array<{
  value: PMFInterviewLog['buyingIntent'];
  label: string;
}> = [
  { value: 'low', label: 'Low intent' },
  { value: 'medium', label: 'Some interest' },
  { value: 'high', label: 'High intent' },
  { value: 'ready_to_pay', label: 'Ready to pay' },
];

const STEPS = [
  {
    number: '01',
    title: 'Validation setup',
    question: 'How did you test demand with real people?',
    hint: 'Select every method you used and how many people you reached.',
    objective: 'Sets the context for the interview evidence PMF Lab will trust',
  },
  {
    number: '02',
    title: 'Interview tracker',
    question: 'What did each customer tell you?',
    hint: 'Log every interview with profile, objections, and buying intent.',
    objective: 'Makes sure the PMF score is based on recorded discovery work, not just a summary claim',
  },
  {
    number: '03',
    title: 'Pattern summary',
    question: 'What patterns repeated across your interviews?',
    hint: 'Summarize the strongest pain, urgency, and missing-feature signals.',
    objective: 'Helps AI identify the strongest recurring signals across your log',
  },
  {
    number: '04',
    title: 'Demand signal quality',
    question: 'How strong is the buying intent you captured?',
    hint: 'These counts come from your interview log. Add pricing context below.',
    objective: 'Separates real buying intent from polite encouragement',
  },
  {
    number: '05',
    title: 'Founder decision check',
    question: 'What are you still uncertain about?',
    hint: 'Record what feels unresolved before you commit to building.',
    objective: 'Keeps the recommendation grounded in honest founder judgment',
  },
] as const;


const newInterviewId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createEmptyInterview = (): PMFInterviewLog => ({
  id: newInterviewId(),
  intervieweeName: '',
  basicProfile: '',
  segment: '',
  mainFeedback: '',
  objections: '',
  missingFeatures: '',
  interestLevel: 3,
  buyingIntent: 'medium',
  landingPageShown: false,
  solutionPitched: false,
  askedAboutPricing: false,
  joinedWaitlist: false,
  referredSomeone: false,
  offeredToPay: false,
});

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
  belowThresholdOverride?: boolean;
}

const PMFEvidenceForm: React.FC<PMFEvidenceFormProps> = ({ onSubmit, isSubmitting = false }) => {
  const [testTypes, setTestTypes] = useState<string[]>([]);
  const [peopleReached, setPeopleReached] = useState(0);
  const [belowThresholdAcknowledged, setBelowThresholdAcknowledged] = useState(false);
  const [interviews, setInterviews] = useState<PMFInterviewLog[]>([]);
  const [draftInterview, setDraftInterview] = useState<PMFInterviewLog>(createEmptyInterview());
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);

  const [wtpDetail, setWtpDetail] = useState('');
  const [mostPainfulQuote, setMostPainfulQuote] = useState('');
  const [urgencyProxy, setUrgencyProxy] = useState('');
  const [consistencyNote, setConsistencyNote] = useState('');

  const [founderUncertainties, setFounderUncertainties] = useState('');
  const [whatWouldChangeMind, setWhatWouldChangeMind] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState(5);
  const [currentStep, setCurrentStep] = useState(0);
  const validationSetupRef = useRef<HTMLDivElement | null>(null);
  const interviewStepRef = useRef<HTMLDivElement | null>(null);
  const [stepFeedback, setStepFeedback] = useState<{ step: number; message: string } | null>(null);

  const conversationCount = interviews.length;
  const strongInterestCount = interviews.filter(
    (item) => item.interestLevel >= 4 || item.buyingIntent === 'high' || item.buyingIntent === 'ready_to_pay'
  ).length;
  const askedAboutPricing = interviews.filter((item) => item.askedAboutPricing).length;
  const joinedWaitlist = interviews.filter((item) => item.joinedWaitlist).length;
  const sharedWithSomeone = interviews.filter((item) => item.referredSomeone).length;
  const offeredToPay = interviews.filter((item) => item.offeredToPay).length;
  const willingnessToPaySignal =
    offeredToPay > 0 || interviews.some((item) => item.buyingIntent === 'ready_to_pay')
      ? 'yes'
      : conversationCount > 0
        ? 'no'
        : 'not_tested';
  const totalSteps = STEPS.length;
  const isReview = currentStep === totalSteps;
  const step = STEPS[currentStep];
  const interviewProgress = Math.min(100, Math.round((conversationCount / PMF_REQUIRED_SIGNALS) * 100));
  const interviewsRemaining = Math.max(0, PMF_REQUIRED_SIGNALS - conversationCount);
  const segmentCounts = interviews.reduce<Record<string, number>>((acc, item) => {
    const key = item.segment.trim();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topSegments = Object.entries(segmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([segment, count]) => `${segment} (${count})`);
  const interviewCoverage = interviews.filter((item) => item.landingPageShown && item.solutionPitched).length;
  const validInterviewDraft =
    draftInterview.intervieweeName.trim().length > 0 &&
    draftInterview.basicProfile.trim().length > 0 &&
    draftInterview.segment.trim().length > 0 &&
    draftInterview.mainFeedback.trim().length > 0 &&
    draftInterview.objections.trim().length > 0 &&
    draftInterview.missingFeatures.trim().length > 0;

  const toggleTestType = (type: string) => {
    setTestTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const updateDraft = <K extends keyof PMFInterviewLog>(field: K, value: PMFInterviewLog[K]) => {
    setDraftInterview((prev) => ({ ...prev, [field]: value }));
  };

  const resetDraft = () => {
    setDraftInterview(createEmptyInterview());
    setEditingInterviewId(null);
  };

  const saveInterview = () => {
    if (!validInterviewDraft) return;

    if (editingInterviewId) {
      setInterviews((prev) => prev.map((item) => (
        item.id === editingInterviewId ? draftInterview : item
      )));
    } else {
      setInterviews((prev) => [...prev, draftInterview]);
    }

    resetDraft();
  };

  const editInterview = (interview: PMFInterviewLog) => {
    setDraftInterview(interview);
    setEditingInterviewId(interview.id);
    if (currentStep !== 1) {
      setCurrentStep(1);
    }
  };

  const removeInterview = (id: string) => {
    setInterviews((prev) => prev.filter((item) => item.id !== id));
    if (editingInterviewId === id) {
      resetDraft();
    }
  };

  const meetsInterviewThreshold = conversationCount >= PMF_REQUIRED_SIGNALS;
  const canSubmit = testTypes.length > 0 && (meetsInterviewThreshold || belowThresholdAcknowledged);
  const isValid = testTypes.length > 0 && meetsInterviewThreshold;

  const stepHasValue = (index: number) => {
    if (index === 0) {
      return testTypes.length > 0 || peopleReached > 0;
    }
    if (index === 1) {
      return interviews.length > 0;
    }
    if (index === 2) {
      return (
        mostPainfulQuote.trim().length > 0 ||
        urgencyProxy.trim().length > 0 ||
        consistencyNote.trim().length > 0
      );
    }
    if (index === 3) {
      return (
        askedAboutPricing + joinedWaitlist + sharedWithSomeone + offeredToPay > 0 ||
        wtpDetail.trim().length > 0
      );
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
      ? interviews.length >= 1
      : true;

  useEffect(() => {
    if (stepFeedback?.step === currentStep && canContinue) {
      setStepFeedback(null);
    }
  }, [canContinue, currentStep, stepFeedback]);

  useEffect(() => {
    if (stepFeedback?.step === totalSteps && canSubmit) {
      setStepFeedback(null);
    }
  }, [canSubmit, stepFeedback, totalSteps]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      testTypes,
      peopleReached,
      conversationCount,
      interviews,
      strongInterestCount,
      willingnessToPaySignal,
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

  const scrollToRef = (targetRef: React.RefObject<HTMLDivElement>) => {
    window.setTimeout(() => {
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  // FIX(dead-click): /pmf-lab — blocked wizard CTAs now explain the missing requirement and scroll users to the exact step instead of leaving a dead disabled button.
  const handleBlockedContinue = () => {
    if (currentStep === 0) {
      setStepFeedback({
        step: 0,
        message: 'Select at least one validation method before moving to the interview tracker.',
      });
      scrollToRef(validationSetupRef);
      return;
    }

    if (currentStep === 1) {
      setStepFeedback({
        step: 1,
        message: 'Add your first customer interview to continue to the pattern summary.',
      });
      scrollToRef(interviewStepRef);
    }
  };

  // FIX(dead-click): /pmf-lab — the final analyze action now jumps users back to the missing prerequisite step with visible guidance instead of presenting an inert disabled CTA.
  const handleBlockedAnalysis = () => {
    if (testTypes.length === 0) {
      setCurrentStep(0);
      setStepFeedback({
        step: 0,
        message: 'Choose a validation method first so PMF Lab knows how you tested demand.',
      });
      scrollToRef(validationSetupRef);
      return;
    }

    setCurrentStep(1);
    setStepFeedback({
      step: 1,
      message: `Log at least ${PMF_REQUIRED_SIGNALS} interviews before running the PMF analysis.`,
    });
    scrollToRef(interviewStepRef);
  };


  const renderInterviewList = () => {
    if (interviews.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 text-sm text-muted-foreground">
          No interviews logged yet. Add each customer interview here so PMF Lab can verify the full validation process before scoring.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {interviews.map((interview, index) => (
          <div key={interview.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{interview.intervieweeName}</p>
                    <p className="text-xs text-muted-foreground">{interview.basicProfile} • {interview.segment}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border/60 px-2 py-1">Interest {interview.interestLevel}/5</span>
                  <span className="rounded-full border border-border/60 px-2 py-1">
                    {BUYING_INTENT_OPTIONS.find((item) => item.value === interview.buyingIntent)?.label}
                  </span>
                  {interview.askedAboutPricing && <span className="rounded-full border border-border/60 px-2 py-1">Asked pricing</span>}
                  {interview.joinedWaitlist && <span className="rounded-full border border-border/60 px-2 py-1">Joined waitlist</span>}
                  {interview.offeredToPay && <span className="rounded-full border border-border/60 px-2 py-1">Offered to pay</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => editInterview(interview)}>
                  <Edit2 className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeInterview(interview.id)}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Main feedback</p>
                <p className="mt-2 text-sm text-muted-foreground">{interview.mainFeedback}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Objections</p>
                <p className="mt-2 text-sm text-muted-foreground">{interview.objections}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Missing features</p>
                <p className="mt-2 text-sm text-muted-foreground">{interview.missingFeatures}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (currentStep === 0) {
      return (
        <Card ref={validationSetupRef} className="rounded-[1.75rem] border border-border/60 shadow-sm">
          <CardContent className="space-y-5 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Validation methods</p>
                <p className="mt-1 text-sm text-foreground/70">Select every method you used to test demand.</p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                {testTypes.length} selected
              </div>
            </div>
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
              <p className="text-xs text-muted-foreground">Select at least one validation method to continue.</p>
            )}
            <div className="max-w-xs">
              <NumberInput label="How many people did you reach or contact?" value={peopleReached} onChange={setPeopleReached} />
            </div>
            <p className="text-xs text-muted-foreground">
              The AI score becomes reliable after {PMF_REQUIRED_SIGNALS} logged interviews.
            </p>
          </CardContent>
        </Card>
      );
    }

    if (currentStep === 1) {
      return (
        <div ref={interviewStepRef} className="space-y-5">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-semibold text-foreground">Interview completion tracker</p>
                <p className="text-muted-foreground">
                  PMF Lab unlocks a reliable build versus iterate recommendation only after {PMF_REQUIRED_SIGNALS} logged interviews.
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
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-xs text-muted-foreground">Logged interviews</p>
                <p className="mt-1 font-semibold text-foreground">{conversationCount}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-xs text-muted-foreground">High-interest interviews</p>
                <p className="mt-1 font-semibold text-foreground">{strongInterestCount}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-xs text-muted-foreground">Landing page shown + pitched</p>
                <p className="mt-1 font-semibold text-foreground">{interviewCoverage}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/60 bg-background/80 p-5 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  {editingInterviewId ? 'Edit logged interview' : 'Add a customer interview'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Record who you interviewed, what they said, what blocked them, and how strong their buying intent was.
                </p>
              </div>
              <div className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Interview {editingInterviewId ? 'update' : conversationCount + 1}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Who did you interview?</Label>
                <Input
                  value={draftInterview.intervieweeName}
                  onChange={(e) => updateDraft('intervieweeName', e.target.value)}
                  placeholder="e.g. Maria Gomez"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Basic profile</Label>
                <Input
                  value={draftInterview.basicProfile}
                  onChange={(e) => updateDraft('basicProfile', e.target.value)}
                  placeholder="e.g. Agency owner, 8-person team"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Segment</Label>
                <Input
                  value={draftInterview.segment}
                  onChange={(e) => updateDraft('segment', e.target.value)}
                  placeholder="e.g. B2B marketing agencies"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs text-muted-foreground">Main feedback</Label>
                <Textarea
                  value={draftInterview.mainFeedback}
                  onChange={(e) => updateDraft('mainFeedback', e.target.value)}
                  placeholder="What did they say after seeing the landing page and hearing your pitch?"
                  className="min-h-[110px] resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs text-muted-foreground">Objections</Label>
                <Textarea
                  value={draftInterview.objections}
                  onChange={(e) => updateDraft('objections', e.target.value)}
                  placeholder="What stopped them from wanting it right now?"
                  className="min-h-[110px] resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs text-muted-foreground">Missing features</Label>
                <Textarea
                  value={draftInterview.missingFeatures}
                  onChange={(e) => updateDraft('missingFeatures', e.target.value)}
                  placeholder="What did they say was missing before they would adopt or buy?"
                  className="min-h-[110px] resize-none text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Interest level: <span className="font-medium text-foreground">{draftInterview.interestLevel}/5</span>
                </Label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={draftInterview.interestLevel}
                  onChange={(e) => updateDraft('interestLevel', Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>No real interest</span>
                  <span>Strong interest</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Buying intent</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BUYING_INTENT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateDraft('buyingIntent', option.value)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-sm transition-all',
                        draftInterview.buyingIntent === option.value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Interview context</p>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draftInterview.landingPageShown}
                      onChange={(e) => updateDraft('landingPageShown', e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    I showed my landing page during the interview
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draftInterview.solutionPitched}
                      onChange={(e) => updateDraft('solutionPitched', e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    I pitched my solution during the interview
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Demand behaviors</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draftInterview.askedAboutPricing}
                      onChange={(e) => updateDraft('askedAboutPricing', e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Asked about pricing
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draftInterview.joinedWaitlist}
                      onChange={(e) => updateDraft('joinedWaitlist', e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Joined waitlist
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draftInterview.referredSomeone}
                      onChange={(e) => updateDraft('referredSomeone', e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Referred or shared it
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draftInterview.offeredToPay}
                      onChange={(e) => updateDraft('offeredToPay', e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Offered to pay or pre-commit
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={saveInterview} disabled={!validInterviewDraft} className="gap-2">
                <Plus className="h-4 w-4" />
                {editingInterviewId ? 'Update Interview' : 'Add Interview'}
              </Button>
              {editingInterviewId && (
                <Button type="button" variant="outline" onClick={resetDraft}>
                  Cancel Edit
                </Button>
              )}
              {!validInterviewDraft && (
                <p className="text-xs text-muted-foreground self-center">
                  Add the interviewee, profile, segment, main feedback, objections, and missing features before saving.
                </p>
              )}
            </div>
          </div>

          {renderInterviewList()}
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <Card className="rounded-[1.75rem] border border-border/60 shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">What repeated pain sounded strongest across your logged interviews?</Label>
              <Textarea
                placeholder={'e.g. "We lose deals because proposal feedback is scattered across email and Slack."'}
                value={mostPainfulQuote}
                onChange={(e) => setMostPainfulQuote(e.target.value)}
                className="text-sm min-h-[80px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">What do people do today, and what did that reveal about urgency?</Label>
              <Textarea
                placeholder="e.g. Most still stitch together email, docs, and Slack. Three already pay for a clunky workaround because the problem is urgent every week."
                value={urgencyProxy}
                onChange={(e) => setUrgencyProxy(e.target.value)}
                className="text-sm min-h-[80px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">What objections or missing-feature patterns repeated enough to matter?</Label>
              <Textarea
                placeholder="e.g. Agencies liked the concept, but many said they would need Slack and client approval workflows before switching."
                value={consistencyNote}
                onChange={(e) => setConsistencyNote(e.target.value)}
                className="text-sm min-h-[80px] resize-none"
              />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentStep === 3) {
      return (
        <Card className="rounded-[1.75rem] border border-border/60 shadow-sm">
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs text-muted-foreground">Asked about pricing</p>
                <p className="mt-2 text-2xl font-semibold">{askedAboutPricing}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs text-muted-foreground">Joined waitlist</p>
                <p className="mt-2 text-2xl font-semibold">{joinedWaitlist}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs text-muted-foreground">Shared or referred</p>
                <p className="mt-2 text-2xl font-semibold">{sharedWithSomeone}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs text-muted-foreground">Offered to pay</p>
                <p className="mt-2 text-2xl font-semibold">{offeredToPay}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              These counts are derived directly from the interview log. The final score stays tied to recorded customer evidence.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">What did people say about pricing, commitment, or buying timing?</Label>
              <Textarea
                placeholder="e.g. Two interviewees asked if this would cost less than their current stack. One said they would pay immediately if it plugged into Slack and Notion."
                value={wtpDetail}
                onChange={(e) => setWtpDetail(e.target.value)}
                className="text-sm min-h-[90px] resize-none"
              />
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="rounded-[1.75rem] border border-border/60 shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">What are you still unsure about before building?</Label>
            <Textarea
              placeholder="e.g. I still need to confirm whether agencies with 5 to 20 people feel this pain strongly enough to switch without deeper integrations."
              value={founderUncertainties}
              onChange={(e) => setFounderUncertainties(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">What evidence would make you iterate before building again?</Label>
            <Textarea
              placeholder="e.g. If the next interview round keeps repeating the same integration objection and nobody asks about pricing, I should revise the landing page and offer before building."
              value={whatWouldChangeMind}
              onChange={(e) => setWhatWouldChangeMind(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
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
        </CardContent>
      </Card>
    );
  };

  const reviewItems = [
    {
      title: 'Validation setup',
      content: `Methods: ${testTypes.length ? testTypes.join(', ') : 'No methods selected.'}\nPeople reached: ${peopleReached || 0}`,
    },
    {
      title: 'Interview tracker',
      content: `Logged ${conversationCount} interviews. Strong-interest interviews: ${strongInterestCount}. Top segments: ${topSegments.join(', ') || 'Not enough interviews to identify segment patterns yet.'}`,
    },
    {
      title: 'Pattern summary',
      content: [mostPainfulQuote, urgencyProxy, consistencyNote].filter(Boolean).join('\n\n') || 'No cross-interview pattern summary added yet.',
    },
    {
      title: 'Demand signal quality',
      content: `Pricing asks: ${askedAboutPricing}, waitlist signups: ${joinedWaitlist}, shares/referrals: ${sharedWithSomeone}, offered to pay: ${offeredToPay}.${wtpDetail ? `\n\nPricing context: ${wtpDetail}` : ''}`,
    },
    {
      title: 'Founder reflection',
      content: [founderUncertainties, whatWouldChangeMind].filter(Boolean).join('\n\n') || `Confidence: ${confidenceLevel}/10`,
    },
  ];

  if (isReview) {
    return (
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        <StepView stepKey={totalSteps}>
          <div className="space-y-4">
            <div className="text-center space-y-1 mb-6">
              <p className="text-xs font-mono text-primary/60 uppercase tracking-widest">Review</p>
              <h2 className="text-xl font-semibold">Your PMF validation brief</h2>
              <p className="text-sm text-muted-foreground">Confirm your logged evidence, then run PMF Lab.</p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Interview log status</p>
                  <p className="text-sm text-muted-foreground">
                    {conversationCount} recorded interviews, {interviewCoverage} with landing page shown and solution pitched, {strongInterestCount} with high interest.
                  </p>
                  {topSegments.length > 0 && (
                    <p className="text-sm text-muted-foreground">Top segments: {topSegments.join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <UserRound className="h-4 w-4" />
                  {conversationCount}/{PMF_REQUIRED_SIGNALS}
                </div>
              </div>
            </div>

            {reviewItems.map((item, index) => (
              <Card key={item.title} className="hover-lift border-border/60 group rounded-[1.5rem]">
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

            {/* Soft warning for below-threshold interview count */}
            {testTypes.length > 0 && !meetsInterviewThreshold && (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-amber-500/10 p-1.5">
                    <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      You have {conversationCount} of {PMF_REQUIRED_SIGNALS} recommended interviews
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      PMF Lab can still run, but the score reliability is reduced with fewer than {PMF_REQUIRED_SIGNALS} interviews. We recommend reaching the full target before analyzing.
                    </p>
                  </div>
                </div>
                <label htmlFor="pmf-below-threshold-ack" className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer pl-10">
                  <input
                    id="pmf-below-threshold-ack"
                    type="checkbox"
                    checked={belowThresholdAcknowledged}
                    onChange={(e) => setBelowThresholdAcknowledged(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-amber-600"
                  />
                  I understand the results may be less accurate with fewer interviews
                </label>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <CreditCostNotice feature="PMF_SCORING" featureName="PMF Evidence Score" />
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={goBack} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  type={canSubmit ? "submit" : "button"}
                  onClick={canSubmit ? undefined : handleBlockedAnalysis}
                  disabled={isSubmitting}
                  variant={canSubmit ? "default" : "outline"}
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
                      Analyze Logged Interviews
                    </>
                  )}
                </Button>
              </div>
            </div>
            {!canSubmit && (
              <p className="text-xs text-right text-muted-foreground">
                {stepFeedback?.step === totalSteps
                  ? stepFeedback.message
                  : testTypes.length === 0
                    ? 'Select at least one validation method to unlock AI scoring.'
                    : `Log ${PMF_REQUIRED_SIGNALS} interviews or acknowledge the warning above to run the analysis.`}
              </p>
            )}
          </div>
        </StepView>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      {/* Pre-requisite callout */}
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400 mb-1">
          Before you start
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Run at least <span className="font-semibold text-foreground">{PMF_REQUIRED_SIGNALS} one-to-one customer interviews</span> before using PMF Lab. Results based on fewer interviews will be flagged as potentially inaccurate.
        </p>
      </div>

      <StepView stepKey={currentStep}>
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
                {step.objective}
              </div>
            </div>
          </div>

          {renderCurrentStep()}

          <div className="space-y-3">
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button type="button" variant="outline" onClick={goBack} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <Button
                type="button"
                onClick={canContinue ? goNext : handleBlockedContinue}
                variant={canContinue ? "default" : "outline"}
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
          {!canContinue && (
            <p className="text-xs text-right text-muted-foreground">
              {stepFeedback?.step === currentStep
                ? stepFeedback.message
                : currentStep === 0
                  ? 'Select at least one validation method to continue.'
                  : 'Add your first interview to continue.'}
            </p>
          )}
        </div>
      </StepView>
    </form>
  );
};

export default PMFEvidenceForm;
