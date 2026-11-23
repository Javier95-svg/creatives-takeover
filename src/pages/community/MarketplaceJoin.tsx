import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DECK_OPTIONS,
  EMPTY_APPLICATION,
  FOCUS_OPTIONS,
  SERVICES_BY_FOCUS,
  STAGE_OPTIONS,
  START_BUDGET_OPTIONS,
  START_MODEL_OPTIONS,
  STEP_IDS,
  buildApplicationMessage,
  companyLabel,
  firstName,
  stepError,
  type Option,
  type PartnerApplication,
  type StepId,
} from "@/lib/marketplacePartnerApplication";

type Phase = "intro" | "questions" | "done";

const LETTERS = "ABCDEFGH";
const JOIN_PATH = "/marketplace/join";

/** A Typeform-style answer tile: a letter key, the label and an optional hint. */
function ChoiceTile({
  index,
  option,
  selected,
  multi,
  onSelect,
}: {
  index: number;
  option: Option;
  selected: boolean;
  multi?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-14 w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
        )}
      >
        {selected ? <Check className="h-4 w-4" /> : LETTERS[index]}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-base font-semibold">{option.label}</span>
        {option.hint && <span className="text-sm text-muted-foreground">{option.hint}</span>}
      </span>
    </button>
  );
}

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2.5 sm:grid-cols-2">
      {options.map((option, index) => (
        <ChoiceTile
          key={option.value}
          index={index}
          option={option}
          selected={value === option.value}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}

function MultiChoiceGroup({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: Option[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid gap-2.5 sm:grid-cols-2">
      {options.map((option, index) => (
        <ChoiceTile
          key={option.value}
          index={index}
          option={option}
          multi
          selected={values.includes(option.value)}
          onSelect={() => onToggle(option.value)}
        />
      ))}
    </div>
  );
}

const MarketplaceJoin = () => {
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<PartnerApplication>(EMPTY_APPLICATION);
  const [showError, setShowError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();

  const step: StepId = STEP_IDS[stepIndex];
  const first = firstName(answers.name);
  const company = companyLabel(answers.company);
  const error = stepError(step, answers);
  const progress = phase === "done" ? 100 : Math.round((stepIndex / STEP_IDS.length) * 100);

  // Each question starts at the top, and focus moves to it so keyboard and
  // screen-reader users follow along.
  useEffect(() => {
    if (phase === "intro") return;
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [phase, stepIndex]);

  const update = <K extends keyof PartnerApplication>(key: K, value: PartnerApplication[K]) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setShowError(false);
  };

  const toggle = (key: "services" | "stages", value: string) => {
    setAnswers((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));
    setShowError(false);
  };

  const goBack = () => {
    setShowError(false);
    setSendError(null);
    if (stepIndex === 0) setPhase("intro");
    else setStepIndex((index) => index - 1);
  };

  const submit = async () => {
    setIsSending(true);
    setSendError(null);
    try {
      const { error: invokeError } = await supabase.functions.invoke("contact-form-submission", {
        body: {
          name: answers.name.trim(),
          email: answers.email.trim(),
          role: "partner",
          reason: "Marketplace partner application",
          message: buildApplicationMessage(answers, window.location.pathname),
        },
      });
      if (invokeError) throw invokeError;
      setPhase("done");
    } catch (err) {
      console.error("Marketplace partner application failed:", err);
      setSendError(
        "We couldn't send your application. Please try again in a minute, or email it to admin@creatives-takeover.com.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const goNext = (event?: FormEvent) => {
    event?.preventDefault();
    if (error) {
      setShowError(true);
      return;
    }
    if (stepIndex === STEP_IDS.length - 1) {
      void submit();
      return;
    }
    setStepIndex((index) => index + 1);
  };

  // Single-choice questions move on by themselves once answered, like the /enterprise quiz.
  const chooseAndAdvance = (apply: () => void) => {
    apply();
    window.setTimeout(() => setStepIndex((index) => Math.min(index + 1, STEP_IDS.length - 1)), 220);
  };

  const questionTitle: Record<StepId, ReactNode> = {
    name: "First, what's your name?",
    company: `Nice to meet you, ${first}. What's your company called?`,
    focus: `What does ${company} mainly help founders with?`,
    services: `Which of these does ${company} deliver?`,
    stages: `Which founders are the best fit for ${company}?`,
    start: `How do founders usually start working with ${company}?`,
    deck: `Founders here compare partners by reading their pitch deck. Does ${company} have one?`,
    email: `Last step, ${first}. Where should we reply?`,
  };

  const questionHint: Partial<Record<StepId, string>> = {
    company: "Add your website too, if you have one.",
    services: "Pick all that apply.",
    stages: "Pick all that apply.",
    start: "Pick one of each. Ranges are fine; nothing here is shown publicly.",
    email: "We send our reply here.",
  };

  const focusServices = answers.focus ? SERVICES_BY_FOCUS[answers.focus] : [];

  const renderStep = () => {
    switch (step) {
      case "name":
        return (
          <Input
            id="partner-name"
            autoFocus
            autoComplete="name"
            value={answers.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Your full name"
            aria-label="Your name"
            className="h-14 rounded-xl text-lg"
          />
        );
      case "company":
        return (
          <div className="flex flex-col gap-3">
            <Input
              id="partner-company"
              autoFocus
              autoComplete="organization"
              value={answers.company}
              onChange={(event) => update("company", event.target.value)}
              placeholder="Company name"
              aria-label="Company name"
              className="h-14 rounded-xl text-lg"
            />
            <Input
              id="partner-website"
              autoComplete="url"
              inputMode="url"
              value={answers.website}
              onChange={(event) => update("website", event.target.value)}
              placeholder="Website (optional), e.g. acme.com"
              aria-label="Company website (optional)"
              className="h-12 rounded-xl text-base"
            />
          </div>
        );
      case "focus":
        return (
          <div className="flex flex-col gap-3">
            <ChoiceGroup
              label="Main focus"
              options={FOCUS_OPTIONS}
              value={answers.focus}
              onChange={(value) => {
                const focus = value as PartnerApplication["focus"];
                // A new focus brings a new list of services, so earlier picks no longer apply.
                if (focus !== answers.focus) setAnswers((current) => ({ ...current, services: [] }));
                if (focus === "other") update("focus", focus);
                else chooseAndAdvance(() => update("focus", focus));
              }}
            />
            {answers.focus === "other" && (
              <Input
                id="partner-focus-other"
                autoFocus
                value={answers.focusOther}
                onChange={(event) => update("focusOther", event.target.value)}
                placeholder="For example: legal, recruiting, fundraising support"
                aria-label="What your company does"
                className="h-12 rounded-xl text-base"
              />
            )}
          </div>
        );
      case "services":
        return (
          <div className="flex flex-col gap-3">
            {focusServices.length > 0 && (
              <MultiChoiceGroup
                label="Services"
                options={focusServices.map((service) => ({ value: service, label: service }))}
                values={answers.services}
                onToggle={(value) => toggle("services", value)}
              />
            )}
            <Input
              id="partner-services-other"
              autoFocus={focusServices.length === 0}
              value={answers.servicesOther}
              onChange={(event) => update("servicesOther", event.target.value)}
              placeholder={focusServices.length > 0 ? "Something else? Add it here (optional)" : "Describe what you deliver"}
              aria-label="Other services"
              className="h-12 rounded-xl text-base"
            />
          </div>
        );
      case "stages":
        return (
          <MultiChoiceGroup
            label="Best-fit founders"
            options={STAGE_OPTIONS}
            values={answers.stages}
            onToggle={(value) => toggle("stages", value)}
          />
        );
      case "start":
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">How they start</p>
              <ChoiceGroup
                label="How founders usually start"
                options={START_MODEL_OPTIONS}
                value={answers.startModel}
                onChange={(value) => update("startModel", value)}
              />
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Typical starting budget</p>
              <ChoiceGroup
                label="Typical starting budget"
                options={START_BUDGET_OPTIONS}
                value={answers.startBudget}
                onChange={(value) => update("startBudget", value)}
              />
            </div>
          </div>
        );
      case "deck":
        return (
          <div className="flex flex-col gap-3">
            <ChoiceGroup
              label="Pitch deck"
              options={DECK_OPTIONS}
              value={answers.deck}
              onChange={(value) => {
                const deck = value as PartnerApplication["deck"];
                if (deck === "yes") update("deck", deck);
                else chooseAndAdvance(() => update("deck", deck));
              }}
            />
            {answers.deck === "yes" && (
              <Input
                id="partner-deck-url"
                autoFocus
                inputMode="url"
                value={answers.deckUrl}
                onChange={(event) => update("deckUrl", event.target.value)}
                placeholder="Link to the deck (Google Drive, DocSend, a PDF link…)"
                aria-label="Pitch deck link"
                className="h-12 rounded-xl text-base"
              />
            )}
          </div>
        );
      case "email":
        return (
          <div className="flex flex-col gap-3">
            <Input
              id="partner-email"
              autoFocus
              type="email"
              autoComplete="email"
              value={answers.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="you@company.com"
              aria-label="Your email"
              className="h-14 rounded-xl text-lg"
            />
            <Textarea
              id="partner-note"
              value={answers.note}
              onChange={(event) => update("note", event.target.value)}
              placeholder={`Anything else we should know about ${company}? (optional)`}
              aria-label="Anything else (optional)"
              rows={4}
              className="rounded-xl text-base"
            />
            <p className="text-sm text-muted-foreground">
              We use your answers only to review this application. See our{" "}
              <Link to="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        );
    }
  };

  const isLast = stepIndex === STEP_IDS.length - 1;

  // Applying needs an account, like contacting a partner: visitors sign up
  // first and come straight back here (2026-11-23).
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to={`/signup?source=marketplace-apply&return=${encodeURIComponent(JOIN_PATH)}`} replace />;
  }

  return (
    <>
      <SEO
        title="Apply to join the Marketplace | Creatives Takeover"
        description="Run a service company that works with founders? Apply to be listed as a partner in the Creatives Takeover Marketplace."
        url="/marketplace/join"
      />
      <div className="relative min-h-screen bg-background">
        <Navigation />
        <main className="relative z-10 pt-header-offset">
          <section className="container mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
            {phase !== "intro" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  {phase === "questions" ? (
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex min-h-11 items-center gap-1.5 font-medium hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Back
                    </button>
                  ) : (
                    <span />
                  )}
                  <span aria-live="polite">
                    {phase === "done" ? "Application sent" : `Question ${stepIndex + 1} of ${STEP_IDS.length}`}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Application progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {phase === "intro" && (
              <div className="flex flex-col gap-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Marketplace partners</p>
                <h1 className="font-space-grotesk text-4xl font-bold tracking-tight sm:text-5xl">
                  Apply to join the Marketplace
                </h1>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Founders on Creatives Takeover come to the Marketplace to find companies that can build their product,
                  bring in customers or run operations. Tell us about yours.
                </p>
                <ul className="flex flex-col gap-2.5 text-base text-muted-foreground">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />8 short questions, about 3 minutes
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    Our team reviews every application
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    We reply by email
                  </li>
                </ul>
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="lg" className="h-12 gap-2 rounded-xl px-6 text-base" onClick={() => setPhase("questions")}>
                    Start
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Link to="/marketplace" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    Back to the Marketplace
                  </Link>
                </div>
              </div>
            )}

            {phase === "questions" && (
              <form
                key={step}
                onSubmit={goNext}
                noValidate
                className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
              >
                <div className="flex flex-col gap-2">
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="font-space-grotesk text-2xl font-bold leading-snug tracking-tight outline-none focus-visible:!shadow-none focus-visible:!outline-none sm:text-3xl"
                  >
                    <span className="mr-2 text-primary">{stepIndex + 1}.</span>
                    {questionTitle[step]}
                  </h1>
                  {questionHint[step] && <p className="text-base text-muted-foreground">{questionHint[step]}</p>}
                </div>

                {renderStep()}

                {showError && error && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
                {sendError && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {sendError}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <Button type="submit" size="lg" disabled={isSending} className="h-12 gap-2 rounded-xl px-6 text-base">
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Sending…
                      </>
                    ) : isLast ? (
                      "Send application"
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                  {!isLast && <span className="hidden text-sm text-muted-foreground sm:inline">or press Enter</span>}
                </div>
              </form>
            )}

            {phase === "done" && (
              <div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-6 w-6" aria-hidden="true" />
                </span>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-space-grotesk text-3xl font-bold tracking-tight outline-none focus-visible:!shadow-none focus-visible:!outline-none sm:text-4xl"
                >
                  Thanks, {first}. {company}'s application is in.
                </h1>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Our team reviews every application and replies to{" "}
                  <span className="font-semibold text-foreground">{answers.email.trim()}</span>. If {company} is a fit,
                  we'll be in touch about setting up its profile.
                </p>
                <div>
                  <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6 text-base">
                    <Link to="/marketplace">Back to the Marketplace</Link>
                  </Button>
                </div>
              </div>
            )}
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default MarketplaceJoin;
