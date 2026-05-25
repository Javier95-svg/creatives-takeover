import { useEffect, useMemo, useRef, useState } from "react";
import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import { useLeanStartupStore } from "@/store/leanStartupStore";
import { getSafeLocalStorage } from "@/lib/safeStorage";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ClipboardList, Rocket, Target, ArrowRight, Scale, Star, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { captureEvent } from "@/lib/analytics";
import { loadValidationDraftArtifact, saveValidationDraftArtifact, trackRetentionEvent } from "@/lib/retentionSystem";
import { clearPendingValueCapture, persistPendingValueCapture, readPendingValueCapture } from "@/lib/valueCapture";

type CriteriaKey =
  | "problemSeverity"
  | "frequency"
  | "willingnessToPay"
  | "reachableCustomer"
  | "differentiation"
  | "founderAdvantage"
  | "earlyEvidence";

interface IdeaScore {
  id: string;
  name: string;
  oneLiner: string;
  targetCustomer: string;
  coreProblem: string;
  currentAlternative: string;
  unfairAdvantage: string;
  marketSignals: string[];
  risks: string;
  criteria: Record<CriteriaKey, number>;
}

const MAX_IDEAS = 3;
const STORAGE_KEY = "validateDecisionSprint";

const SIGNAL_OPTIONS = [
  {
    id: "search_demand",
    title: "Search or community demand",
    description: "People are already asking for this solution."
  },
  {
    id: "competitor_spend",
    title: "Competitors spending on ads",
    description: "Others are paying to acquire these customers."
  },
  {
    id: "manual_workaround",
    title: "Painful manual workaround",
    description: "Customers are hacking together a fix today."
  },
  {
    id: "paid_alternatives",
    title: "Paid alternatives exist",
    description: "Indicates willingness to pay."
  },
  {
    id: "urgent_deadline",
    title: "Urgent deadline or regulatory pressure",
    description: "The problem cannot wait."
  },
  {
    id: "early_interest",
    title: "Early inbound interest",
    description: "People already asked for a solution."
  }
];

const CRITERIA = [
  {
    key: "problemSeverity" as const,
    title: "Problem severity",
    description: "How painful is the problem?",
  },
  {
    key: "frequency" as const,
    title: "Frequency",
    description: "How often does it happen?",
  },
  {
    key: "willingnessToPay" as const,
    title: "Willingness to pay",
    description: "Will customers pay to solve it?",
  },
  {
    key: "reachableCustomer" as const,
    title: "Reachability",
    description: "Can you reach the customer cheaply?",
  },
  {
    key: "differentiation" as const,
    title: "Differentiation",
    description: "Is there a clear edge vs alternatives?",
  },
  {
    key: "founderAdvantage" as const,
    title: "Founder advantage",
    description: "Do you have unique insight or access?",
  },
  {
    key: "earlyEvidence" as const,
    title: "Early evidence",
    description: "Any proof of demand today?",
  }
];

const createIdea = (): IdeaScore => ({
  id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  oneLiner: "",
  targetCustomer: "",
  coreProblem: "",
  currentAlternative: "",
  unfairAdvantage: "",
  marketSignals: [],
  risks: "",
  criteria: {
    problemSeverity: 3,
    frequency: 3,
    willingnessToPay: 3,
    reachableCustomer: 3,
    differentiation: 3,
    founderAdvantage: 3,
    earlyEvidence: 3,
  },
});

const computeScore = (idea: IdeaScore) => {
  const total = CRITERIA.reduce((sum, criterion) => sum + idea.criteria[criterion.key], 0);
  const max = CRITERIA.length * 5;
  return Math.round((total / max) * 100);
};

const getDecisionLabel = (score: number) => {
  if (score >= 80) {
    return {
      title: "Build",
      description: "Strong signal. Move to Market Need Lab and design your MVP scope.",
      tone: "text-emerald-600",
      badge: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    };
  }
  if (score >= 60) {
    return {
      title: "Refine",
      description: "Promising, but tighten the problem or segment before building.",
      tone: "text-amber-600",
      badge: "bg-amber-500/10 text-amber-700 border-amber-200",
    };
  }
  return {
    title: "Pause",
    description: "Weak signal. Replace or reshape this idea before investing time.",
    tone: "text-rose-600",
    badge: "bg-rose-500/10 text-rose-700 border-rose-200",
  };
};

export default function ValidateJourneyPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [ideas, setIdeas] = useState<IdeaScore[]>([createIdea()]);
  const [activeIdeaId, setActiveIdeaId] = useState<string>(ideas[0]?.id || "");
  const [chosenIdeaId, setChosenIdeaId] = useState<string | null>(null);
  const [draftArtifactId, setDraftArtifactId] = useState<string>(`validation-draft-${Date.now()}`);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const restoredFromLocal = useRef(false);
  const remoteDraftLoaded = useRef(false);

  const { markToolUsed } = useLeanStartupStore();
  useEffect(() => { markToolUsed('decision-sprint'); }, [markToolUsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storage = getSafeLocalStorage();
    const stored = storage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        ideas?: IdeaScore[];
        activeIdeaId?: string;
        chosenIdeaId?: string | null;
      };
      if (parsed.ideas && parsed.ideas.length > 0) {
        restoredFromLocal.current = true;
        setIdeas(parsed.ideas);
        setActiveIdeaId(parsed.activeIdeaId || parsed.ideas[0].id);
        setChosenIdeaId(parsed.chosenIdeaId ?? null);
        setDraftArtifactId(parsed.chosenIdeaId || parsed.activeIdeaId || parsed.ideas[0].id);
      }
    } catch (error) {
      console.error("Failed to load validation sprint data", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({ ideas, activeIdeaId, chosenIdeaId });
    const storage = getSafeLocalStorage();
    storage.setItem(STORAGE_KEY, payload);
  }, [ideas, activeIdeaId, chosenIdeaId]);

  useEffect(() => {
    if (!user || restoredFromLocal.current || remoteDraftLoaded.current) return;

    remoteDraftLoaded.current = true;

    const restoreRemoteDraft = async () => {
      try {
        const remoteDraft = await loadValidationDraftArtifact(user.id);
        if (!remoteDraft) return;

        const restoredIdeas = remoteDraft.ideas as IdeaScore[];
        if (!Array.isArray(restoredIdeas) || restoredIdeas.length === 0) return;

        // FIX(retention): /decision-sprint — signed-in users now reopen their saved validation draft instead of starting from a blank local-only state.
        setIdeas(restoredIdeas);
        setActiveIdeaId(remoteDraft.activeIdeaId || restoredIdeas[0].id);
        setChosenIdeaId(remoteDraft.chosenIdeaId ?? null);
        setDraftArtifactId(remoteDraft.id);
      } catch (error) {
        console.error('Failed to restore validation draft', error);
      }
    };

    void restoreRemoteDraft();
  }, [user]);

  const rankedIdeas = useMemo(() => {
    return [...ideas].sort((a, b) => computeScore(b) - computeScore(a));
  }, [ideas]);

  const activeIdea = ideas.find((idea) => idea.id === activeIdeaId) || ideas[0];

  const updateIdea = (ideaId: string, updates: Partial<IdeaScore>) => {
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === ideaId ? { ...idea, ...updates } : idea))
    );
  };

  const updateCriteria = (ideaId: string, key: CriteriaKey, value: number) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId
          ? {
              ...idea,
              criteria: {
                ...idea.criteria,
                [key]: value,
              },
            }
          : idea
      )
    );
  };

  const toggleSignal = (ideaId: string, signalId: string) => {
    setIdeas((prev) =>
      prev.map((idea) => {
        if (idea.id !== ideaId) return idea;
        const hasSignal = idea.marketSignals.includes(signalId);
        return {
          ...idea,
          marketSignals: hasSignal
            ? idea.marketSignals.filter((signal) => signal !== signalId)
            : [...idea.marketSignals, signalId],
        };
      })
    );
  };

  const handleAddIdea = () => {
    if (ideas.length >= MAX_IDEAS) return;
    const nextIdea = createIdea();
    setIdeas((prev) => [...prev, nextIdea]);
    setActiveIdeaId(nextIdea.id);
  };

  const handleRemoveIdea = (ideaId: string) => {
    if (ideas.length <= 1) return;
    setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId));
    if (activeIdeaId === ideaId) {
      const remaining = ideas.filter((idea) => idea.id !== ideaId);
      setActiveIdeaId(remaining[0]?.id || "");
    }
    if (chosenIdeaId === ideaId) {
      setChosenIdeaId(null);
    }
  };

  const decisionScore = activeIdea ? computeScore(activeIdea) : 0;
  const decisionLabel = getDecisionLabel(decisionScore);
  const readinessFields = [
    activeIdea?.name,
    activeIdea?.oneLiner,
    activeIdea?.targetCustomer,
    activeIdea?.coreProblem,
  ];
  const readinessCount = readinessFields.filter((field) => field && field.trim()).length + (activeIdea?.marketSignals.length >= 2 ? 1 : 0);
  const readinessTotal = 5;
  const readinessPercent = Math.round((readinessCount / readinessTotal) * 100);
  const hasMeaningfulDraft = ideas.some((idea) =>
    [
      idea.name,
      idea.oneLiner,
      idea.targetCustomer,
      idea.coreProblem,
      idea.currentAlternative,
      idea.unfairAdvantage,
      idea.risks,
    ].some((value) => value.trim().length > 0) || idea.marketSignals.length > 0,
  );

  const handleSaveDraft = async () => {
    if (!hasMeaningfulDraft) {
      toast.error('Add at least one idea or signal before saving this validation draft.');
      return;
    }

    if (!user || !isAuthenticated) {
      // FIX(retention): /decision-sprint — anonymous users can build the sprint first and only hit auth when they decide to save the draft.
      persistPendingValueCapture({
        action: 'save_validation',
        entityId: activeIdeaId,
        source: 'decision_sprint',
        resumeLabel: 'Validation sprint draft',
      });
      navigate(`/signup?source=save-validation&return=${encodeURIComponent('/decision-sprint')}`);
      return;
    }

    setIsSavingDraft(true);

    try {
      const updatedAt = new Date().toISOString();
      const nextDraftId = draftArtifactId || chosenIdeaId || activeIdeaId || `validation-draft-${Date.now()}`;
      await saveValidationDraftArtifact(user.id, {
        id: nextDraftId,
        ideas,
        activeIdeaId,
        chosenIdeaId,
        updatedAt,
      });
      setDraftArtifactId(nextDraftId);
      captureEvent('artifact_saved', {
        artifactType: 'validation_draft',
        artifactId: nextDraftId,
        resumeUrl: '/decision-sprint',
      });
      // FIX(retention): /decision-sprint — validation saves now emit durable artifact events so tranche 3 reporting can measure activation outcomes outside PostHog.
      void trackRetentionEvent('artifact_saved', {
        user_id: user.id,
        artifactType: 'validation_draft',
        artifactId: nextDraftId,
        resumeUrl: '/decision-sprint',
      });
      toast.success('Validation draft saved. You can now resume it from the dashboard.');
    } catch (error) {
      console.error('Failed to save validation draft', error);
      toast.error('Failed to save validation draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  useEffect(() => {
    if (!user || !hasMeaningfulDraft) return;

    const pendingCapture = readPendingValueCapture();
    if (pendingCapture?.action !== 'save_validation') return;

    clearPendingValueCapture();
    void handleSaveDraft();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasMeaningfulDraft]);

  return (
    <>
      <SEO
        title="Decision Sprint - Creatives Takeover"
        description="Compare startup ideas side by side, score them against practical demand criteria, and choose the idea that deserves your next sprint."
        keywords="startup idea scoring, idea validation, startup prioritization, founder decision framework"
        url="/decision-sprint"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Decision Sprint",
            description:
              "Compare startup ideas side by side, score them against practical demand criteria, and choose the idea that deserves your next sprint.",
            url: "https://creatives-takeover.com/decision-sprint",
          },
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "BizMap AI", url: "/bizmap-ai" },
            { name: "Decision Sprint", url: "/decision-sprint" },
          ]),
        ]}
      />
	      <DashboardLayout
	        title="Decision Sprint"
	        subtitle="Score ideas and pick your next build."
	      >
	        <div className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft || !hasMeaningfulDraft}>
              <Save className="mr-2 h-4 w-4" />
              {isSavingDraft ? 'Saving draft...' : 'Save validation draft'}
            </Button>
          </div>
	        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-primary/20 bg-background/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
                Shortlist ideas
              </CardTitle>
              <CardDescription>
                Capture the top 2-3 concepts you are considering building.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/20 bg-background/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scale className="h-5 w-5 text-primary" />
                Score the signal
              </CardTitle>
              <CardDescription>
                Use a simple rubric to compare pain, reachability, and demand evidence.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/20 bg-background/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Rocket className="h-5 w-5 text-primary" />
                Choose the winner
              </CardTitle>
              <CardDescription>
                Pick the concept with the strongest signal and move forward with confidence.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

            <div id="shortlist" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Idea shortlist</h2>
                <Badge variant="outline">Up to {MAX_IDEAS} ideas</Badge>
              </div>

              <div className="grid gap-4">
                {ideas.map((idea, index) => {
                  const score = computeScore(idea);
                  const isActive = idea.id === activeIdeaId;
                  const isChosen = idea.id === chosenIdeaId;

                  return (
                    <Card
                      key={idea.id}
                      className={cn(
                        "border-border/70 bg-background/90",
                        isActive && "border-primary/50 shadow-sm"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle className="flex items-center gap-2">
                            <span className="text-primary font-semibold">Idea {index + 1}</span>
                            <span className="text-sm text-muted-foreground">Score {score}/100</span>
                            {isChosen && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">
                                Chosen
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={isActive ? "default" : "outline"}
                              onClick={() => setActiveIdeaId(idea.id)}
                            >
                              {isActive ? "Active" : "Score this idea"}
                            </Button>
                            {ideas.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveIdea(idea.id)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Idea name</label>
                            <Input
                              value={idea.name}
                              onChange={(event) => updateIdea(idea.id, { name: event.target.value })}
                              placeholder="e.g., AI scheduling assistant"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Target customer</label>
                            <Input
                              value={idea.targetCustomer}
                              onChange={(event) => updateIdea(idea.id, { targetCustomer: event.target.value })}
                              placeholder="e.g., boutique agencies, solo consultants"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">One-line value prop</label>
                          <Textarea
                            value={idea.oneLiner}
                            onChange={(event) => updateIdea(idea.id, { oneLiner: event.target.value })}
                            placeholder="Describe the promise in one clear sentence."
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Core problem</label>
                          <Textarea
                            value={idea.coreProblem}
                            onChange={(event) => updateIdea(idea.id, { coreProblem: event.target.value })}
                            placeholder="What painful outcome are you fixing?"
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleAddIdea}
                  disabled={ideas.length >= MAX_IDEAS}
                >
                  Add another idea
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveIdeaId(rankedIdeas[0]?.id || "")}
                  disabled={ideas.length === 0}
                >
                  Focus highest score
                </Button>
              </div>
            </div>

            {activeIdea && (
              <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                <div className="space-y-6">
                  <Card className="border-primary/20 bg-background/90">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Active idea deep dive
                      </CardTitle>
                      <CardDescription>
                        Clarify the problem, market signal, and your edge for the idea you are scoring.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Current alternative</label>
                        <Textarea
                          value={activeIdea.currentAlternative}
                          onChange={(event) => updateIdea(activeIdea.id, { currentAlternative: event.target.value })}
                          placeholder="What do customers do today instead?"
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Unfair advantage</label>
                        <Textarea
                          value={activeIdea.unfairAdvantage}
                          onChange={(event) => updateIdea(activeIdea.id, { unfairAdvantage: event.target.value })}
                          placeholder="What edge do you have (data, access, brand, speed)?"
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Key risks</label>
                        <Textarea
                          value={activeIdea.risks}
                          onChange={(event) => updateIdea(activeIdea.id, { risks: event.target.value })}
                          placeholder="What could break demand or execution?"
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Market signals observed</label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {SIGNAL_OPTIONS.map((signal) => (
                            <label
                              key={signal.id}
                              className="flex items-start gap-2 rounded-md border border-border/70 bg-background/80 p-3 text-sm"
                            >
                              <Checkbox
                                checked={activeIdea.marketSignals.includes(signal.id)}
                                onCheckedChange={() => toggleSignal(activeIdea.id, signal.id)}
                              />
                              <span>
                                <span className="font-medium">{signal.title}</span>
                                <span className="block text-xs text-muted-foreground mt-1">{signal.description}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-primary/20 bg-background/90">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        Decision scorecard
                      </CardTitle>
                      <CardDescription>
                        Rate each dimension from 1 to 5. Use real evidence where possible.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {CRITERIA.map((criterion) => (
                        <div key={criterion.key} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{criterion.title}</p>
                              <p className="text-xs text-muted-foreground">{criterion.description}</p>
                            </div>
                            <Badge variant="outline">{activeIdea.criteria[criterion.key]} / 5</Badge>
                          </div>
                          <Slider
                            value={[activeIdea.criteria[criterion.key]]}
                            onValueChange={(value) => updateCriteria(activeIdea.id, criterion.key, value[0])}
                            min={1}
                            max={5}
                            step={1}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-primary/20 bg-background/90">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        Decision output
                      </CardTitle>
                      <CardDescription>
                        Live score and recommendation for the active idea.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Decision readiness</span>
                          <span className="text-muted-foreground">{readinessPercent}%</span>
                        </div>
                        <Progress value={readinessPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Complete the basics and add two signals to finalize a decision.
                        </p>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-background/80 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Score</span>
                          <span className="text-2xl font-bold text-primary">{decisionScore}</span>
                        </div>
                        <Badge className={decisionLabel.badge}>{decisionLabel.title}</Badge>
                        <p className={cn("text-sm", decisionLabel.tone)}>{decisionLabel.description}</p>
                      </div>

	                      <Button
	                        className="w-full"
	                        onClick={() => {
                            setChosenIdeaId(activeIdea.id);
                            setDraftArtifactId(activeIdea.id);
                          }}
	                        disabled={!activeIdea.name.trim()}
	                      >
	                        Mark this idea as chosen
	                      </Button>
                        <Button variant="outline" className="w-full" onClick={handleSaveDraft} disabled={isSavingDraft || !hasMeaningfulDraft}>
                          <Save className="h-4 w-4 mr-2" />
                          {isSavingDraft ? 'Saving draft...' : 'Save and come back later'}
                        </Button>
	                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/pmf-lab">
                          Continue to Market Need Lab
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-primary/20 bg-background/90">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Scoreboard
                      </CardTitle>
                      <CardDescription>
                        Rank your shortlist before committing resources.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {rankedIdeas.map((idea, index) => (
                        <div
                          key={idea.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm",
                            idea.id === activeIdeaId && "border-primary/60 bg-primary/5"
                          )}
                        >
                          <div>
                            <p className="font-medium">{idea.name || `Idea ${index + 1}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {idea.targetCustomer || "Define a target customer"}
                            </p>
                          </div>
                          <Badge variant="outline">{computeScore(idea)}/100</Badge>
                        </div>
                      ))}
                      {chosenIdeaId && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          Chosen concept: {ideas.find((idea) => idea.id === chosenIdeaId)?.name || "Unnamed idea"}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
        </div>
      </DashboardLayout>
    </>
  );
}

