import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DecisionSprintStepNav } from "@/components/decision-sprint/DecisionSprintStepNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountContext } from "@/hooks/useAccountContext";
import { captureEvent } from "@/lib/analytics";
import {
  CHECK_ANSWER_LABELS,
  CHECK_QUESTIONS,
  MAX_SPRINT_IDEAS,
  answeredCount,
  buildSprintSeed,
  canOpenStep,
  createSprintDraft,
  createSprintIdea,
  furthestStep,
  hasSprintContent,
  ideaReason,
  isIdeaFilled,
  parseSprintDraft,
  pickSprintDraft,
  rankIdeas,
  scoreIdea,
  scoreVerdict,
  sprintStorageKey,
  DECISION_SPRINT_STORAGE_PREFIX,
  type CheckAnswer,
  type CheckKey,
  type SprintDraft,
  type SprintIdea,
  type SprintStep,
} from "@/lib/decisionSprint";
import { buildIcpSeedReturnPath } from "@/lib/icpSeed";
import { loadValidationDraftArtifact, saveValidationDraftArtifact, trackRetentionEvent, updateValidationDraft } from "@/lib/retentionSystem";
import { getSafeLocalStorage } from "@/lib/safeStorage";
import { scrollToTopFrom } from "@/lib/scrollToTop";
import { cn } from "@/lib/utils";
import { clearPendingValueCapture, persistPendingValueCapture, readPendingValueCapture } from "@/lib/valueCapture";
import { useLeanStartupStore } from "@/store/leanStartupStore";

const AUTOSAVE_DELAY_MS = 1500;
const ANSWERS: CheckAnswer[] = [0, 1, 2];

type SaveState = "idle" | "saving" | "saved" | "error";

const VERDICT_STYLES = {
  strong: "border-success/40 bg-success/10 text-success",
  mixed: "border-warning/40 bg-warning/10 text-warning",
  weak: "border-destructive/40 bg-destructive/10 text-destructive",
} as const;

function readLocalDraft(key: string): SprintDraft | null {
  try {
    const raw = getSafeLocalStorage().getItem(key);
    return typeof raw === "string" && raw ? parseSprintDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function ideaLabel(idea: SprintIdea, index: number) {
  return idea.name.trim() || `Idea ${index + 1}`;
}

function AnswerPicker({
  value,
  onChange,
  label,
}: {
  value: CheckAnswer | undefined;
  onChange: (answer: CheckAnswer) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-muted/40 p-1">
      {ANSWERS.map((answer) => {
        const selected = value === answer;
        return (
          <button
            key={answer}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(answer)}
            className={cn(
              "min-h-9 rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? answer === 2
                  ? "bg-success text-white shadow-sm"
                  : answer === 1
                    ? "bg-warning text-white shadow-sm"
                    : "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            {CHECK_ANSWER_LABELS[answer]}
          </button>
        );
      })}
    </div>
  );
}

function ScorePill({ idea }: { idea: SprintIdea }) {
  const score = scoreIdea(idea);
  if (score === null) {
    return (
      <span className="text-xs text-muted-foreground">
        {answeredCount(idea)} of {CHECK_QUESTIONS.length} answered
      </span>
    );
  }
  const verdict = scoreVerdict(score);
  return (
    <Badge variant="outline" className={cn("font-semibold", VERDICT_STYLES[verdict.tone])}>
      {score}/100 · {verdict.label}
    </Badge>
  );
}

export default function ValidateJourneyPage() {
  const [searchParams] = useSearchParams();
  const focusedActivation = searchParams.get("activation") === "1" && Boolean(searchParams.get("journey"));
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [draft, setDraft] = useState<SprintDraft>(() => createSprintDraft());
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<SprintStep>(1);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isValidating, setIsValidating] = useState(false);
  const dirtyRef = useRef(false);
  const savedThisSessionRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  const markToolUsed = useLeanStartupStore((s) => s.markToolUsed);
  useEffect(() => { markToolUsed("decision-sprint"); }, [markToolUsed]);

  // Decision Sprint is the builder tool; founders already have a project and
  // bring it in at /project-setup instead.
  const account = useAccountContext();
  const isFounder = Boolean(userId) && !account.isLoading && !account.isError && account.userType === "founder";
  useEffect(() => {
    if (isFounder) navigate("/project-setup", { replace: true });
  }, [isFounder, navigate]);

  // Open the newest of this account's local and cloud drafts.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoaded(false);
    dirtyRef.current = false;

    const restore = async () => {
      const storage = getSafeLocalStorage();
      const local = readLocalDraft(sprintStorageKey(userId));
      // Drafts from before per-account keys were saved under the bare prefix;
      // they are only adopted like a guest draft, when the account has nothing.
      const guest = userId
        ? readLocalDraft(sprintStorageKey(null)) ?? readLocalDraft(DECISION_SPRINT_STORAGE_PREFIX)
        : local ?? readLocalDraft(DECISION_SPRINT_STORAGE_PREFIX);
      let remote: SprintDraft | null = null;
      if (userId) {
        try {
          remote = parseSprintDraft(await loadValidationDraftArtifact(userId));
        } catch (error) {
          console.error("Failed to restore validation draft", error);
        }
      }
      if (cancelled) return;

      const picked = userId ? pickSprintDraft({ local, remote, guest }) : { draft: guest, fromGuest: false };
      storage.removeItem(DECISION_SPRINT_STORAGE_PREFIX);
      if (picked.fromGuest) {
        storage.removeItem(sprintStorageKey(null));
        dirtyRef.current = true;
      }

      const next = picked.draft ?? createSprintDraft();
      setDraft(next);
      setSelectedIdeaId(next.chosenIdeaId);
      setStep(furthestStep(next.ideas));
      setLoaded(true);

      const pending = readPendingValueCapture();
      if (userId && pending?.action === "save_validation") {
        clearPendingValueCapture();
        dirtyRef.current = true;
        toast.success("Your sprint is saved to your account.");
      }
    };

    void restore();
    return () => { cancelled = true; };
  }, [authLoading, userId]);

  const persistCloud = useCallback(async (next: SprintDraft) => {
    if (!userId) return;
    setSaveState("saving");
    const artifact = { id: next.id, ideas: next.ideas, activeIdeaId: next.activeIdeaId, chosenIdeaId: next.chosenIdeaId, updatedAt: next.updatedAt };
    try {
      if (savedThisSessionRef.current) {
        await updateValidationDraft(userId, artifact);
      } else {
        await saveValidationDraftArtifact(userId, artifact);
        savedThisSessionRef.current = true;
        captureEvent("artifact_saved", { artifactType: "validation_draft", artifactId: next.id, resumeUrl: "/decision-sprint" });
        void trackRetentionEvent("artifact_saved", { user_id: userId, artifactType: "validation_draft", artifactId: next.id, resumeUrl: "/decision-sprint" });
      }
      setSaveState("saved");
    } catch (error) {
      console.error("Failed to save validation draft", error);
      setSaveState("error");
      throw error;
    }
  }, [userId]);

  // Every change is kept on this device right away, and in the account after
  // a short pause in typing.
  useEffect(() => {
    if (!loaded || !dirtyRef.current) return;
    getSafeLocalStorage().setItem(sprintStorageKey(userId), JSON.stringify(draft));
    if (!userId || !hasSprintContent(draft.ideas)) return;
    const timer = window.setTimeout(() => { void persistCloud(draft).catch(() => undefined); }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, loaded, persistCloud, userId]);

  useEffect(() => {
    captureEvent("decision_sprint_step_viewed", { step });
  }, [step]);

  const changeDraft = (change: (current: SprintDraft) => Partial<SprintDraft>) => {
    dirtyRef.current = true;
    setDraft((current) => {
      const next = { ...current, ...change(current), updatedAt: new Date().toISOString() };
      return { ...next, activeIdeaId: next.ideas[0]?.id ?? next.activeIdeaId };
    });
  };

  const updateIdea = (ideaId: string, updates: Partial<SprintIdea>) => {
    changeDraft((current) => ({
      ideas: current.ideas.map((idea) => (idea.id === ideaId ? { ...idea, ...updates } : idea)),
    }));
  };

  const setAnswer = (ideaId: string, key: CheckKey, answer: CheckAnswer) => {
    changeDraft((current) => ({
      ideas: current.ideas.map((idea) => (idea.id === ideaId ? { ...idea, answers: { ...idea.answers, [key]: answer } } : idea)),
    }));
  };

  const addIdea = () => {
    changeDraft((current) => (current.ideas.length >= MAX_SPRINT_IDEAS ? {} : { ideas: [...current.ideas, createSprintIdea()] }));
  };

  const removeIdea = (ideaId: string) => {
    changeDraft((current) => {
      if (current.ideas.length <= 1) return {};
      return {
        ideas: current.ideas.filter((idea) => idea.id !== ideaId),
        chosenIdeaId: current.chosenIdeaId === ideaId ? null : current.chosenIdeaId,
      };
    });
    if (selectedIdeaId === ideaId) setSelectedIdeaId(null);
  };

  const ideas = draft.ideas;
  const ranked = useMemo(() => rankIdeas(ideas), [ideas]);
  const pickedIdea = ideas.find((idea) => idea.id === selectedIdeaId) ?? ranked[0];
  const pickedScore = pickedIdea ? scoreIdea(pickedIdea) : null;

  const firstUnfilled = ideas.findIndex((idea) => !isIdeaFilled(idea));
  const firstUnchecked = ideas.findIndex((idea) => answeredCount(idea) < CHECK_QUESTIONS.length);
  const canOpen = (target: SprintStep) => canOpenStep(ideas, target);

  const goTo = (target: SprintStep) => {
    if (!canOpen(target)) return;
    setStep(target);
    scrollToTopFrom(topRef.current);
  };

  const handleValidate = async () => {
    if (!pickedIdea) return;
    const next: SprintDraft = { ...draft, chosenIdeaId: pickedIdea.id, updatedAt: new Date().toISOString() };
    dirtyRef.current = true;
    setDraft(next);
    getSafeLocalStorage().setItem(sprintStorageKey(userId), JSON.stringify(next));
    captureEvent("decision_sprint_idea_chosen", { score: pickedScore, ideas: ideas.length });

    if (!userId) {
      persistPendingValueCapture({
        action: "save_validation",
        entityId: pickedIdea.id,
        source: "decision_sprint",
        resumeLabel: "Validation sprint draft",
      });
      navigate(`/signup?source=save-validation&return=${encodeURIComponent("/decision-sprint")}`);
      return;
    }

    setIsValidating(true);
    try {
      await persistCloud(next);
      navigate(buildIcpSeedReturnPath(buildSprintSeed(pickedIdea)));
    } catch {
      toast.error("Couldn't save your choice. Check your connection and try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const saveLabel = !userId
    ? "Saved on this device"
    : saveState === "saving"
      ? "Saving…"
      : saveState === "error"
        ? "Not saved yet. We'll retry when you edit."
        : saveState === "saved"
          ? "Saved"
          : "";

  return (
    <>
      <SEO
        title="Decision Sprint - Creatives Takeover"
        description="Compare up to three startup ideas with five plain questions and pick the one to validate next."
        keywords="startup idea scoring, idea validation, startup prioritization, founder decision framework"
        url="/decision-sprint"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Decision Sprint",
            description: "Compare up to three startup ideas with five plain questions and pick the one to validate next.",
            url: "https://creatives-takeover.com/decision-sprint",
          },
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "BizMap AI", url: "/bizmap-ai" },
            { name: "Decision Sprint", url: "/decision-sprint" },
          ]),
        ]}
      />
      <DashboardLayout title="Decision Sprint" subtitle="Compare your ideas and pick one to validate.">
        <div ref={topRef} className="mx-auto w-full max-w-5xl space-y-8">
          <div className="space-y-2">
            <DecisionSprintStepNav active={step} onSelect={goTo} canOpen={canOpen} />
            <p className="min-h-4 text-right text-xs text-muted-foreground" aria-live="polite">
              {loaded && hasSprintContent(ideas) ? saveLabel : ""}
            </p>
          </div>

          {!loaded ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Opening your sprint…
            </div>
          ) : null}

          {loaded && step === 1 ? (
            <section className="space-y-5" aria-labelledby="sprint-ideas-title">
              <div>
                <h2 id="sprint-ideas-title" className="text-xl font-semibold">Which ideas are you choosing between?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add one to three. Short answers are fine; you can change them later.
                </p>
              </div>

              <div className="grid gap-4">
                {ideas.map((idea, index) => (
                  <Card key={idea.id} className="border-border/70">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-primary">Idea {index + 1}</span>
                        {ideas.length > 1 ? (
                          <Button variant="ghost" size="sm" onClick={() => removeIdea(idea.id)} aria-label={`Remove idea ${index + 1}`}>
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1.5">
                          <span className="text-sm font-medium">Idea name</span>
                          <Input
                            value={idea.name}
                            onChange={(event) => updateIdea(idea.id, { name: event.target.value })}
                            placeholder="e.g. Invoice reminders for freelancers"
                          />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-sm font-medium">Who it's for</span>
                          <Input
                            value={idea.customer}
                            onChange={(event) => updateIdea(idea.id, { customer: event.target.value })}
                            placeholder="e.g. freelance designers"
                          />
                        </label>
                      </div>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">The problem it solves</span>
                        <Textarea
                          value={idea.problem}
                          onChange={(event) => updateIdea(idea.id, { problem: event.target.value })}
                          placeholder="e.g. clients pay late and chasing them takes hours every month"
                          rows={2}
                          className="resize-none"
                        />
                      </label>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                {!focusedActivation && ideas.length < MAX_SPRINT_IDEAS ? (
                  <Button variant="outline" onClick={addIdea}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                    Add another idea
                  </Button>
                ) : null}
                <div className="flex flex-col items-stretch gap-1.5 sm:ml-auto sm:items-end">
                  <Button onClick={() => goTo(2)} disabled={!canOpen(2)}>
                    Next: quick check
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Button>
                  {firstUnfilled >= 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Fill in all three fields for {ideaLabel(ideas[firstUnfilled], firstUnfilled)} to continue.
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {loaded && step === 2 ? (
            <section className="space-y-5" aria-labelledby="sprint-check-title">
              <div>
                <h2 id="sprint-check-title" className="text-xl font-semibold">Answer honestly, from what you've seen</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  "Partly" is fine when you're unsure. A score appears once all five are answered.
                </p>
              </div>

              {/* Desktop: one row per question, one column per idea. */}
              <div className="hidden overflow-hidden rounded-xl border border-border/70 bg-card md:block">
                <div
                  className="grid items-center gap-x-4 border-b border-border/70 bg-muted/30 px-5 py-3"
                  style={{ gridTemplateColumns: `minmax(200px, 1.1fr) repeat(${ideas.length}, minmax(0, 1fr))` }}
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Question</span>
                  {ideas.map((idea, index) => (
                    <div key={idea.id} className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold">{ideaLabel(idea, index)}</p>
                      <ScorePill idea={idea} />
                    </div>
                  ))}
                </div>
                {CHECK_QUESTIONS.map((question, rowIndex) => (
                  <div
                    key={question.key}
                    className={cn("grid items-center gap-x-4 px-5 py-3.5", rowIndex > 0 && "border-t border-border/50")}
                    style={{ gridTemplateColumns: `minmax(200px, 1.1fr) repeat(${ideas.length}, minmax(0, 1fr))` }}
                  >
                    <p className="text-sm font-medium">{question.question}</p>
                    {ideas.map((idea, index) => (
                      <AnswerPicker
                        key={idea.id}
                        value={idea.answers[question.key]}
                        onChange={(answer) => setAnswer(idea.id, question.key, answer)}
                        label={`${question.question} ${ideaLabel(idea, index)}`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Phones: one card per idea. */}
              <div className="space-y-4 md:hidden">
                {ideas.map((idea, index) => (
                  <Card key={idea.id} className="border-border/70">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate font-semibold">{ideaLabel(idea, index)}</p>
                        <ScorePill idea={idea} />
                      </div>
                      {CHECK_QUESTIONS.map((question) => (
                        <div key={question.key} className="space-y-1.5">
                          <p className="text-sm font-medium">{question.question}</p>
                          <AnswerPicker
                            value={idea.answers[question.key]}
                            onChange={(answer) => setAnswer(idea.id, question.key, answer)}
                            label={`${question.question} ${ideaLabel(idea, index)}`}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <Button variant="ghost" onClick={() => goTo(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                  Edit ideas
                </Button>
                <div className="flex flex-col items-stretch gap-1.5 sm:ml-auto sm:items-end">
                  <Button onClick={() => goTo(3)} disabled={!canOpen(3)}>
                    See the decision
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Button>
                  {firstUnchecked >= 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Answer all five questions for {ideaLabel(ideas[firstUnchecked], firstUnchecked)} to continue.
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {loaded && step === 3 && pickedIdea ? (
            <section className="space-y-5" aria-labelledby="sprint-decision-title">
              <Card className="overflow-hidden border-primary/30">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-primary">
                    <Trophy className="h-4 w-4" aria-hidden />
                    {pickedIdea.id === ranked[0]?.id ? (ideas.length > 1 ? "Your strongest idea" : "Your idea") : "Your pick"}
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 id="sprint-decision-title" className="text-2xl font-bold">{pickedIdea.name}</h2>
                    <ScorePill idea={pickedIdea} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    For {pickedIdea.customer}. {ideaReason(pickedIdea)}
                  </p>
                  <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      {userId
                        ? "Next, ICP Builder opens with this idea filled in, so you can define who to talk to first."
                        : "Create a free account to keep this sprint and continue in ICP Builder."}
                    </p>
                    <Button onClick={handleValidate} disabled={isValidating} className="shrink-0">
                      {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                      {userId ? "Validate this idea" : "Sign up to validate this idea"}
                      {!isValidating ? <ArrowRight className="ml-2 h-4 w-4" aria-hidden /> : null}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {ideas.length > 1 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Ranking</h3>
                  <div role="radiogroup" aria-label="Idea to validate" className="space-y-2">
                    {ranked.map((idea, position) => {
                      const selected = idea.id === pickedIdea.id;
                      return (
                        <button
                          key={idea.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setSelectedIdeaId(idea.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selected ? "border-primary/60 bg-primary/5" : "border-border/70 bg-card hover:border-primary/30",
                          )}
                        >
                          <span className="w-5 text-sm font-semibold text-muted-foreground">{position + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold sm:truncate">{idea.name}</span>
                            <span className="block text-xs text-muted-foreground sm:truncate">{ideaReason(idea)}</span>
                            {/* Phones: the score sits under the name so neither gets cut off. */}
                            <span className="mt-1.5 block sm:hidden"><ScorePill idea={idea} /></span>
                          </span>
                          <span className="hidden sm:block"><ScorePill idea={idea} /></span>
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                              selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                            )}
                            aria-hidden
                          >
                            {selected ? <Check className="h-3 w-3" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Tap another idea if you'd rather validate that one.</p>
                </div>
              ) : null}

              <Button variant="ghost" onClick={() => goTo(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                Change answers
              </Button>
            </section>
          ) : null}
        </div>
      </DashboardLayout>
    </>
  );
}
