import React, { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { PMFEvidenceAnswers } from '@/hooks/usePMFLab';

// ─── Test type chips ───────────────────────────────────────────────────────────
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

// ─── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) => (
  <div className="flex items-start gap-3 mb-4">
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
      {num}
    </span>
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ─── Number input ──────────────────────────────────────────────────────────────
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
      onChange={e => onChange(Math.max(min, Number(e.target.value || 0)))}
      className="h-9 text-sm"
    />
  </div>
);

// ─── Props ────────────────────────────────────────────────────────────────────
interface PMFEvidenceFormProps {
  onSubmit: (answers: PMFEvidenceAnswers) => void;
  isSubmitting?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
const PMFEvidenceForm: React.FC<PMFEvidenceFormProps> = ({ onSubmit, isSubmitting = false }) => {
  // Section 1
  const [testTypes, setTestTypes] = useState<string[]>([]);

  // Section 2
  const [peopleReached, setPeopleReached] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [strongInterestCount, setStrongInterestCount] = useState(0);
  const [wtpSignal, setWtpSignal] = useState<'yes' | 'no' | 'not_tested'>('not_tested');
  const [wtpDetail, setWtpDetail] = useState('');

  // Section 3
  const [mostPainfulQuote, setMostPainfulQuote] = useState('');
  const [urgencyProxy, setUrgencyProxy] = useState('');
  const [consistencyNote, setConsistencyNote] = useState('');

  // Section 4
  const [askedAboutPricing, setAskedAboutPricing] = useState(0);
  const [joinedWaitlist, setJoinedWaitlist] = useState(0);
  const [sharedWithSomeone, setSharedWithSomeone] = useState(0);
  const [offeredToPay, setOfferedToPay] = useState(0);

  // Section 5
  const [founderUncertainties, setFounderUncertainties] = useState('');
  const [whatWouldChangeMind, setWhatWouldChangeMind] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState(5);

  const toggleTestType = (type: string) => {
    setTestTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const isValid = testTypes.length > 0 && conversationCount >= 1;

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

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pb-2">
        <div className="flex items-center justify-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">PMF Evidence Analyzer</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">~5 min</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Paste in what you actually heard — the AI will tell you if it's strong enough to build.
        </p>
      </div>

      {/* Section 1 — What did you test? */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <SectionHeader
          num="01"
          title="What did you test?"
          subtitle="Select all the validation methods you've used so far."
        />
        <div className="flex flex-wrap gap-2">
          {TEST_TYPES.map(type => (
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

      {/* Section 2 — Scale */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <SectionHeader
          num="02"
          title="Scale"
          subtitle="How many people did you reach, and how many actually responded?"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <NumberInput label="People reached / contacted" value={peopleReached} onChange={setPeopleReached} />
          <NumberInput label="Conversations / responses" value={conversationCount} onChange={setConversationCount} />
          <NumberInput label="Expressed strong interest" value={strongInterestCount} onChange={setStrongInterestCount} />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Did anyone signal willingness to pay or pre-commit?</Label>
          <div className="flex gap-3">
            {(['yes', 'no', 'not_tested'] as const).map(opt => (
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
              placeholder="Describe the signal (e.g. '2 people offered $29/mo, 1 asked for invoice')"
              value={wtpDetail}
              onChange={e => setWtpDetail(e.target.value)}
              className="text-sm min-h-[70px] resize-none"
            />
          )}
        </div>
      </div>

      {/* Section 3 — What you heard */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <SectionHeader
          num="03"
          title="What you heard"
          subtitle="Paste actual quotes or patterns — the more specific, the better the scoring."
        />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Most painful thing you heard (quote or pattern)
          </Label>
          <Textarea
            placeholder={`"I spend 90 minutes every project chasing feedback through email threads"`}
            value={mostPainfulQuote}
            onChange={e => setMostPainfulQuote(e.target.value)}
            className="text-sm min-h-[80px] resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            What do they do today to solve this without you? (urgency proxy)
          </Label>
          <Textarea
            placeholder="e.g. 'Most use Google Docs + email threads. A few are paying for Notion workflows.'"
            value={urgencyProxy}
            onChange={e => setUrgencyProxy(e.target.value)}
            className="text-sm min-h-[80px] resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Did different people say similar things? (consistency check)
          </Label>
          <Textarea
            placeholder="e.g. '5 out of 7 described the same email chaos problem without being prompted'"
            value={consistencyNote}
            onChange={e => setConsistencyNote(e.target.value)}
            className="text-sm min-h-[70px] resize-none"
          />
        </div>
      </div>

      {/* Section 4 — Demand signals */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <SectionHeader
          num="04"
          title="Demand signals"
          subtitle="Count concrete behaviors — not verbal agreements like 'sounds interesting'."
        />
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Asked about pricing" value={askedAboutPricing} onChange={setAskedAboutPricing} />
          <NumberInput label="Joined waitlist / signed up" value={joinedWaitlist} onChange={setJoinedWaitlist} />
          <NumberInput label="Shared with someone else" value={sharedWithSomeone} onChange={setSharedWithSomeone} />
          <NumberInput label="Offered to pay / pre-order" value={offeredToPay} onChange={setOfferedToPay} />
        </div>
        <p className="text-xs text-muted-foreground">
          Total demand behaviors: <span className="font-medium text-foreground">{askedAboutPricing + joinedWaitlist + sharedWithSomeone + offeredToPay}</span>
        </p>
      </div>

      {/* Section 5 — Founder reflection */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <SectionHeader
          num="05"
          title="Founder reflection"
          subtitle="Honest self-assessment improves your score — vagueness hurts it."
        />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">What am I still unsure about?</Label>
          <Textarea
            placeholder="e.g. 'Not sure if they'd pay monthly or one-time. Don't know if agencies vs solos respond differently.'"
            value={founderUncertainties}
            onChange={e => setFounderUncertainties(e.target.value)}
            className="text-sm min-h-[80px] resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">What would change my mind about building this?</Label>
          <Textarea
            placeholder="e.g. 'If 3 more interviews showed a different pain, or if nobody opens a pricing page'"
            value={whatWouldChangeMind}
            onChange={e => setWhatWouldChangeMind(e.target.value)}
            className="text-sm min-h-[70px] resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Confidence level in your evidence (1 = no idea, 10 = very confident): <span className="font-medium text-foreground">{confidenceLevel}</span>
          </Label>
          <input
            type="range"
            min={1}
            max={10}
            value={confidenceLevel}
            onChange={e => setConfidenceLevel(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>No idea</span>
            <span>Very confident</span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-col items-end gap-2 pb-8">
        {!isValid && (
          <p className="text-xs text-muted-foreground">
            Select at least one test type and enter your conversation count to continue.
          </p>
        )}
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full sm:w-auto px-8 py-2.5"
          size="lg"
        >
          <FlaskConical className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Analyzing…' : 'Analyze My Evidence'}
        </Button>
      </div>
    </form>
  );
};

export default PMFEvidenceForm;
