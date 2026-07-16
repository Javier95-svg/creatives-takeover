import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Database, Globe2, Loader2, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { CreditCostNotice } from '@/components/CreditCostNotice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { GTMBusinessModel, GTMIntakeV2 } from '@/lib/gtmV2';

interface GTMWorkspaceIntakeProps {
  prefill: Partial<GTMIntakeV2>;
  isSubmitting?: boolean;
  isRegeneration?: boolean;
  onSubmit: (intake: GTMIntakeV2) => void;
  onCancel?: () => void;
}

const MODELS: Array<{ value: GTMBusinessModel; label: string }> = [
  { value: 'b2b_saas', label: 'B2B SaaS' },
  { value: 'b2c_product', label: 'B2C product / app' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'service', label: 'Agency / service' },
  { value: 'media', label: 'Content / media' },
];

const STRENGTHS = ['Writing', 'Speaking / Video', 'Networking', 'Coding / Technical', 'Design', 'Cold outreach'];
type IntakeStep = 'product' | 'market' | 'constraints' | 'outcome' | 'confirm';
const STEP_LABELS: Record<IntakeStep, string> = {
  product: 'Product', market: 'Market', constraints: 'Constraints', outcome: 'Outcome', confirm: 'Confirm',
};

const defaults: GTMIntakeV2 = {
  productName: '',
  productUrl: '',
  lifecycle: 'launch_ready',
  businessModel: 'b2b_saas',
  targetSegment: '',
  geography: 'Global',
  problem: '',
  solution: '',
  buyerRole: '',
  userRole: '',
  buyingTrigger: '',
  pricing: '',
  averageCustomerValue: 0,
  currentTraction: 'No measured traction yet',
  weeklyTimeHours: 5,
  monthlyBudget: 0,
  founderStrengths: [],
  knownCompetitors: [],
  sixWeekOutcome: '',
};

const GTM_INTAKE_DRAFT_VERSION = 1;

interface GTMIntakeDraft {
  version: typeof GTM_INTAKE_DRAFT_VERSION;
  intake: GTMIntakeV2;
  evidenceNotes: string;
  updatedAt: number;
}

const readIntakeDraft = (storageKey: string): GTMIntakeDraft | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return null;
    const draft = JSON.parse(saved) as Partial<GTMIntakeDraft>;
    if (draft.version !== GTM_INTAKE_DRAFT_VERSION || !draft.intake || typeof draft.intake !== 'object') return null;
    return draft as GTMIntakeDraft;
  } catch (error) {
    console.warn('Could not restore the saved GTM intake draft.', error);
    return null;
  }
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
    {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
  </div>
);

const hasValue = (value: unknown) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
};

const missingForModel = (prefill: Partial<GTMIntakeV2>, model: GTMBusinessModel) => {
  const missing: Record<Exclude<IntakeStep, 'confirm'>, boolean> = {
    product: !hasValue(prefill.productName) || !hasValue(prefill.lifecycle) || !hasValue(prefill.businessModel)
      || (!hasValue(prefill.pricing) && !hasValue(prefill.averageCustomerValue)),
    market: !hasValue(prefill.targetSegment) || !hasValue(prefill.problem) || !hasValue(prefill.solution)
      || !hasValue(prefill.geography) || !hasValue(prefill.buyingTrigger),
    constraints: !hasValue(prefill.weeklyTimeHours) || !hasValue(prefill.founderStrengths),
    outcome: !hasValue(prefill.currentTraction) || !hasValue(prefill.sixWeekOutcome),
  };
  if (model === 'b2b_saas') missing.market ||= !hasValue(prefill.salesCycle);
  if (model === 'marketplace') missing.market ||= !hasValue(prefill.marketplaceSide);
  if (model === 'ecommerce') missing.market ||= !hasValue(prefill.averageOrderValue) || !hasValue(prefill.repeatPurchaseModel);
  if (model === 'service') missing.market ||= !hasValue(prefill.serviceCapacity);
  if (model === 'media') missing.market ||= !hasValue(prefill.subscriberGoal);
  return missing;
};

export default function GTMWorkspaceIntake({ prefill, isSubmitting = false, isRegeneration = false, onSubmit, onCancel }: GTMWorkspaceIntakeProps) {
  const { user } = useAuth();
  const draftStorageKey = `gtm-strategist-intake-draft:${user?.id ?? 'guest'}`;
  const savedDraft = useMemo(
    () => isRegeneration ? null : readIntakeDraft(draftStorageKey),
    [draftStorageKey, isRegeneration],
  );
  const effectivePrefill = useMemo<Partial<GTMIntakeV2>>(
    () => {
      const merged = { ...prefill };
      for (const [key, value] of Object.entries(savedDraft?.intake ?? {})) {
        const field = key as keyof GTMIntakeV2;
        const isDefaultValue = !hasValue(value) || JSON.stringify(value) === JSON.stringify(defaults[field]);
        if (!isDefaultValue || !hasValue(merged[field])) {
          (merged as Record<string, unknown>)[field] = value;
        }
      }
      return merged;
    },
    [prefill, savedDraft],
  );
  const [step, setStep] = useState(0);
  const [intake, setIntake] = useState<GTMIntakeV2>({ ...defaults, ...effectivePrefill });
  const [competitors, setCompetitors] = useState((effectivePrefill.knownCompetitors ?? []).join(', '));
  const [evidenceNotes, setEvidenceNotes] = useState(savedDraft?.evidenceNotes ?? (effectivePrefill.firstPartyEvidence ?? []).find((item) => item.id === 'founder-research-notes')?.content ?? '');
  const activeSteps = useMemo<IntakeStep[]>(() => {
    const missing = missingForModel(effectivePrefill, effectivePrefill.businessModel ?? defaults.businessModel);
    return [
      ...(Object.keys(missing) as Array<Exclude<IntakeStep, 'confirm'>>).filter((key) => missing[key]),
      'confirm',
    ];
  }, [effectivePrefill]);
  const currentStep = activeSteps[step] ?? 'confirm';
  const activeStepsKey = activeSteps.join('|');
  const importedFieldCount = useMemo(() => Object.values(prefill).filter(hasValue).length, [prefill]);

  useEffect(() => {
    setIntake((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(effectivePrefill)) {
        const field = key as keyof GTMIntakeV2;
        const currentValue = current[field];
        if (value !== undefined && value !== null && (currentValue === '' || currentValue === undefined || currentValue === defaults[field])) {
          (next as Record<string, unknown>)[field] = value;
        }
      }
      return next;
    });
    if ((effectivePrefill.knownCompetitors?.length ?? 0) > 0) setCompetitors(effectivePrefill.knownCompetitors!.join(', '));
    const importedEvidenceNotes = effectivePrefill.firstPartyEvidence?.find((item) => item.id === 'founder-research-notes')?.content;
    if (importedEvidenceNotes) setEvidenceNotes((current) => current || importedEvidenceNotes);
  }, [effectivePrefill]);

  useEffect(() => {
    setStep(0);
  }, [activeStepsKey]);

  const canContinue = useMemo(() => {
    if (currentStep === 'product') return intake.productName.trim().length > 1 && Boolean(intake.businessModel) && Boolean(intake.lifecycle)
      && (Boolean(intake.pricing?.trim()) || (intake.averageCustomerValue ?? 0) > 0);
    if (currentStep === 'market') return intake.targetSegment.trim().length > 10 && intake.problem.trim().length > 10
      && intake.solution.trim().length > 10 && Boolean(intake.geography.trim()) && Boolean(intake.buyingTrigger?.trim());
    if (currentStep === 'constraints') return intake.weeklyTimeHours > 0 && intake.monthlyBudget >= 0 && intake.founderStrengths.length > 0;
    if (currentStep === 'outcome') return intake.currentTraction.trim().length > 3 && intake.sixWeekOutcome.trim().length > 10;
    return intake.productName.trim().length > 1 && intake.targetSegment.trim().length > 10
      && intake.problem.trim().length > 10 && intake.solution.trim().length > 10
      && intake.weeklyTimeHours > 0 && intake.founderStrengths.length > 0 && intake.sixWeekOutcome.trim().length > 10;
  }, [currentStep, intake]);

  const update = <K extends keyof GTMIntakeV2>(key: K, value: GTMIntakeV2[K]) => {
    setIntake((current) => ({ ...current, [key]: value }));
  };

  const toggleStrength = (strength: string) => {
    update('founderStrengths', intake.founderStrengths.includes(strength)
      ? intake.founderStrengths.filter((item) => item !== strength)
      : [...intake.founderStrengths, strength]);
  };

  const buildIntake = (): GTMIntakeV2 => {
    const priorEvidence = (intake.firstPartyEvidence ?? []).filter((item) => item.id !== 'founder-research-notes');
    return {
      ...intake,
      knownCompetitors: competitors.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 8),
      firstPartyEvidence: evidenceNotes.trim().length >= 20 ? [...priorEvidence, {
        id: 'founder-research-notes',
        kind: 'founder_note',
        title: 'Founder research notes',
        content: evidenceNotes.trim().slice(0, 12_000),
        verified: false,
        createdAt: new Date().toISOString(),
      }] : priorEvidence,
    };
  };

  const saveDraft = () => {
    if (typeof window === 'undefined') return;
    const payload: GTMIntakeDraft = {
      version: GTM_INTAKE_DRAFT_VERSION,
      intake: buildIntake(),
      evidenceNotes,
      updatedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      toast.success('GTM progress saved on this device.');
    } catch (error) {
      console.error('Could not save the GTM intake draft.', error);
      toast.error('Could not save your GTM progress right now.');
    }
  };

  const submit = () => {
    onSubmit(buildIntake());
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-3 text-center">
        <h1 className="pb-2 text-3xl font-bold leading-tight creatives-font takeover-gradient sm:text-4xl md:text-5xl">
          GTM Strategist
        </h1>
        <p className="mx-auto max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Confirm the context we imported, then get a researched six-week motion connected to Directories and Traction Engine.
        </p>
      </div>

      {importedFieldCount > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-info/25 bg-info/5 p-4 text-sm">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <div><p className="font-medium">{importedFieldCount} context fields imported</p><p className="text-muted-foreground">Only missing decisions are being requested. You will review the complete brief before research begins.</p></div>
        </div>
      ) : null}

      <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${activeSteps.length}`}>
        {activeSteps.map((stepId, index) => (
          <div key={stepId} className="flex flex-1 items-center gap-2">
            <button type="button" onClick={() => index < step && setStep(index)} className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold', index < step ? 'bg-primary text-primary-foreground' : index === step ? 'border-2 border-primary bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
              {index < step ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </button>
            <span className="hidden text-xs text-muted-foreground sm:inline">{STEP_LABELS[stepId]}</span>
            {index < activeSteps.length - 1 ? <div className={cn('h-px flex-1', index < step ? 'bg-primary' : 'bg-border')} /> : null}
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-border/60 bg-background/85 p-5 shadow-sm sm:p-7">
        {currentStep === 'product' ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Product name"><Input value={intake.productName} onChange={(event) => update('productName', event.target.value)} placeholder="Acme" /></Field>
            <Field label="Product URL" hint="Optional for launch-ready products; live products should include the public URL."><Input type="url" value={intake.productUrl ?? ''} onChange={(event) => update('productUrl', event.target.value)} placeholder="https://…" /></Field>
            <Field label="Lifecycle">
              <Select value={intake.lifecycle} onValueChange={(value) => update('lifecycle', value as GTMIntakeV2['lifecycle'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="launch_ready">Launch-ready</SelectItem><SelectItem value="live">Live product</SelectItem></SelectContent></Select>
            </Field>
            <Field label="Business model">
              <Select value={intake.businessModel} onValueChange={(value) => update('businessModel', value as GTMBusinessModel)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MODELS.map((model) => <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>)}</SelectContent></Select>
            </Field>
            <Field label="Pricing or packaging"><Input value={intake.pricing ?? ''} onChange={(event) => update('pricing', event.target.value)} placeholder="$29/month, free trial, project fee…" /></Field>
            <Field label="Average customer value" hint="Use expected annual value for B2B/services or order value for transactional products."><Input type="number" min="0" value={intake.averageCustomerValue ?? 0} onChange={(event) => update('averageCustomerValue', Number(event.target.value) || 0)} /></Field>
          </div>
        ) : null}

        {currentStep === 'market' ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2"><Field label="Best-fit target segment"><Textarea value={intake.targetSegment} onChange={(event) => update('targetSegment', event.target.value)} rows={3} placeholder="Role, company/customer context, and the situation that makes the problem acute." /></Field></div>
            <Field label="Geography"><Input value={intake.geography} onChange={(event) => update('geography', event.target.value)} placeholder="Global, US, Colombia…" /></Field>
            <Field label="Buying trigger"><Input value={intake.buyingTrigger ?? ''} onChange={(event) => update('buyingTrigger', event.target.value)} placeholder="What makes them act now?" /></Field>
            <Field label="Buyer role"><Input value={intake.buyerRole ?? ''} onChange={(event) => update('buyerRole', event.target.value)} placeholder="Who controls budget?" /></Field>
            <Field label="User role"><Input value={intake.userRole ?? ''} onChange={(event) => update('userRole', event.target.value)} placeholder="Who experiences the value?" /></Field>
            <Field label="Problem"><Textarea value={intake.problem} onChange={(event) => update('problem', event.target.value)} rows={4} placeholder="Describe the costly status quo." /></Field>
            <Field label="Solution and differentiated mechanism"><Textarea value={intake.solution} onChange={(event) => update('solution', event.target.value)} rows={4} placeholder="What changes, and why can your product deliver it?" /></Field>
            <div className="md:col-span-2"><Field label="Known competitors or alternatives" hint="Comma-separated. Include spreadsheets, agencies, manual work, or doing nothing."><Input value={competitors} onChange={(event) => setCompetitors(event.target.value)} placeholder="Competitor A, spreadsheets, internal workflow" /></Field></div>
            {intake.businessModel === 'b2b_saas' ? <Field label="Expected sales cycle"><Input value={intake.salesCycle ?? ''} onChange={(event) => update('salesCycle', event.target.value)} placeholder="Self-serve, 14 days, 2 months…" /></Field> : null}
            {intake.businessModel === 'marketplace' ? <Field label="Which side needs focus first?"><Select value={intake.marketplaceSide ?? 'both'} onValueChange={(value) => update('marketplaceSide', value as GTMIntakeV2['marketplaceSide'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="supply">Supply</SelectItem><SelectItem value="demand">Demand</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent></Select></Field> : null}
            {intake.businessModel === 'ecommerce' ? <><Field label="Average order value"><Input type="number" min="0" value={intake.averageOrderValue ?? 0} onChange={(event) => update('averageOrderValue', Number(event.target.value) || 0)} /></Field><Field label="Repeat purchase model"><Input value={intake.repeatPurchaseModel ?? ''} onChange={(event) => update('repeatPurchaseModel', event.target.value)} placeholder="Monthly replenishment, one-off…" /></Field></> : null}
            {intake.businessModel === 'service' ? <Field label="Delivery capacity"><Input value={intake.serviceCapacity ?? ''} onChange={(event) => update('serviceCapacity', event.target.value)} placeholder="e.g. 4 new clients/month" /></Field> : null}
            {intake.businessModel === 'media' ? <Field label="Six-week subscriber goal"><Input type="number" min="0" value={intake.subscriberGoal ?? 0} onChange={(event) => update('subscriberGoal', Number(event.target.value) || 0)} /></Field> : null}
          </div>
        ) : null}

        {currentStep === 'constraints' ? (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Founder hours available per week"><Input type="number" min="1" max="80" value={intake.weeklyTimeHours} onChange={(event) => update('weeklyTimeHours', Number(event.target.value) || 0)} /></Field>
              <Field label="Monthly GTM budget (USD)"><Input type="number" min="0" value={intake.monthlyBudget} onChange={(event) => update('monthlyBudget', Number(event.target.value) || 0)} /></Field>
            </div>
            <Field label="Founder advantages" hint="Channel eligibility and scoring use these strengths.">
              <div className="flex flex-wrap gap-2">{STRENGTHS.map((strength) => <button key={strength} type="button" onClick={() => toggleStrength(strength)} className={cn('rounded-full border px-3 py-1.5 text-sm transition-colors', intake.founderStrengths.includes(strength) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/50')}>{strength}</button>)}</div>
            </Field>
          </div>
        ) : null}

        {currentStep === 'outcome' ? (
          <div className="space-y-5">
            <Field label="Current measured traction"><Textarea value={intake.currentTraction} onChange={(event) => update('currentTraction', event.target.value)} rows={4} placeholder="Users, revenue, conversion, retention, channel results, or ‘no measured traction yet’." /></Field>
            <Field label="One outcome for the next six weeks" hint="Make it measurable: qualified calls, activated users, transactions, purchases, or subscribers."><Textarea value={intake.sixWeekOutcome} onChange={(event) => update('sixWeekOutcome', event.target.value)} rows={3} placeholder="e.g. Reach 30 activated teams and retain at least 12 into week two." /></Field>
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-muted-foreground">Generation includes targeted live research, cited sources, deterministic channel scoring, and durable plays. Sparse research is labeled instead of presented as fact.</p></div>
          </div>
        ) : null}

        {currentStep === 'confirm' ? (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Research brief</p>
              <h2 className="mt-2 text-2xl font-semibold">Confirm the decisions that shape your motion</h2>
              <p className="mt-2 text-sm text-muted-foreground">Imported evidence and your answers will become a focused, editable six-week operating plan.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['Product', `${intake.productName} · ${MODELS.find((model) => model.value === intake.businessModel)?.label ?? intake.businessModel}`],
                ['Best-fit customer', intake.targetSegment],
                ['Six-week outcome', intake.sixWeekOutcome],
                ['Operating constraint', `${intake.weeklyTimeHours} founder hours/week · $${intake.monthlyBudget}/month`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-2 text-sm leading-relaxed">{value || 'Not provided'}</p>
                </div>
              ))}
            </div>
            <Field label="First-party research notes (optional)" hint="Paste customer language, interview findings, pricing evidence, or measured channel results. You can add PDFs and more sources inside the workspace."><Textarea rows={5} value={evidenceNotes} onChange={(event) => setEvidenceNotes(event.target.value)} placeholder="Customers repeatedly said… / Our last LinkedIn test produced…" /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-muted-foreground">Live research validates alternatives, buyer signals, and channel conditions with cited sources. Sparse evidence is labeled.</p></div>
              <div className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success/5 p-4 text-sm"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /><p className="text-muted-foreground">You approve every asset and external action. The system never sends outreach, posts content, or operates external accounts.</p></div>
            </div>
            <CreditCostNotice feature="GTM_ANALYSIS" featureName="GTM Strategist" />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {step > 0 ? <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button> : onCancel ? <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={saveDraft}>
            <Save className="mr-2 h-4 w-4" />Save
          </Button>
          <Button type="button" disabled={!canContinue || isSubmitting} onClick={() => step < activeSteps.length - 1 ? setStep((current) => current + 1) : submit()}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Building system…</> : step < activeSteps.length - 1 ? <>Continue<ArrowRight className="ml-2 h-4 w-4" /></> : <>{isRegeneration ? 'Regenerate GTM system' : 'Build GTM system'}<Sparkles className="ml-2 h-4 w-4" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}
