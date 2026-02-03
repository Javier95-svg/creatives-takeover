import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Search,
  Hammer,
  BarChart3,
  FlaskConical,
  Boxes,
  BookOpen,
} from "lucide-react";
import { useJourneyStore } from "@/store/journeyStore";
import {
  useLeanStartupStore,
  getPhaseCompletion,
  isPhaseUnlocked,
  getCurrentPhase,
  getTransitionPrompt,
  type Phase,
} from "@/store/leanStartupStore";
import { journeyDefinitions } from "@/data/journeys";
import type { JourneySlug } from "@/types/journey";
import LeanStartupCycle from "@/components/bizmap/LeanStartupCycle";
import PhaseCard from "@/components/bizmap/PhaseCard";
import PhaseTransitionBanner from "@/components/bizmap/PhaseTransitionBanner";

// ---------------------------------------------------------------------------
// Phase configuration
// ---------------------------------------------------------------------------

const PHASE_CONFIG: {
  phase: Phase;
  title: string;
  description: string;
  icon: typeof Search;
  journey: { title: string; href: string; slug: JourneySlug; totalDays: number };
  tools: { name: string; href: string; icon: typeof Search; id: string }[];
}[] = [
  {
    phase: "learn",
    title: "Learn",
    description: "Validate your idea before you build. Test demand signals and confirm market need.",
    icon: Search,
    journey: { title: "Validate in 7 Days", href: "/validate", slug: "validate", totalDays: 7 },
    tools: [
      { name: "PMF Lab", href: "/pmf-lab", icon: FlaskConical, id: "pmf-lab" },
      { name: "Prompt Library", href: "/prompt-library", icon: BookOpen, id: "prompt-library" },
    ],
  },
  {
    phase: "build",
    title: "Build",
    description: "Ship your MVP fast. Choose a stack, set scope, and deploy in 14 days.",
    icon: Hammer,
    journey: { title: "Ship MVP in 14 Days", href: "/mvp-builder", slug: "mvp", totalDays: 14 },
    tools: [
      { name: "Tech Stack Builder", href: "/tech-stack", icon: Boxes, id: "tech-stack" },
      { name: "BizMap AI Chatbot", href: "/bizmap-ai", icon: Bot, id: "bizmap-chat" },
    ],
  },
  {
    phase: "measure",
    title: "Measure",
    description: "Get traction and iterate. Reach your first paying customers and track what matters.",
    icon: BarChart3,
    journey: {
      title: "Get 5 Paying Users in 30 Days",
      href: "/client-acquisition",
      slug: "first-customers",
      totalDays: 30,
    },
    tools: [],
  },
];

// ---------------------------------------------------------------------------
// Helper: get journey % from journeyStore
// ---------------------------------------------------------------------------

function useJourneyPercent(slug: JourneySlug): { percent: number; started: boolean } {
  const store = useJourneyStore();
  const def = journeyDefinitions[slug];
  const progress = store.journeys[slug];
  const started = !!progress;

  if (!started || !def) return { percent: 0, started };

  const tasksPerDay: Record<number, number> = {};
  def.days.forEach((d) => {
    tasksPerDay[d.dayNumber] = d.tasks.length;
  });

  return {
    percent: store.getJourneyCompletionPercent(slug, def.totalDays, tasksPerDay),
    started,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BizMapJourneyHubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leanStore = useLeanStartupStore();

  // Redirect ?session= to chat
  useEffect(() => {
    const sessionId = searchParams.get("session");
    if (sessionId) {
      navigate(`/bizmap-ai?session=${sessionId}`, { replace: true });
    }
  }, [navigate, searchParams]);

  // Read live state
  const currentPhase = getCurrentPhase();
  const transition = getTransitionPrompt();

  // Journey progress for each phase
  const validateProgress = useJourneyPercent("validate");
  const mvpProgress = useJourneyPercent("mvp");
  const customersProgress = useJourneyPercent("first-customers");

  const journeyProgressMap: Record<JourneySlug, { percent: number; started: boolean }> = {
    validate: validateProgress,
    mvp: mvpProgress,
    "first-customers": customersProgress,
  };

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "BizMap AI — Lean Startup System",
      description:
        "A cohesive system to validate your idea, ship an MVP, and reach your first paying customers using the Lean Startup Method.",
      url: "https://creatives-takeover.com/bizmap-ai/hub",
    },
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "BizMap AI", url: "/bizmap-ai" },
      { name: "Lean Startup System", url: "/bizmap-ai/hub" },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="BizMap AI — Lean Startup System"
        description="Learn, Build, Measure, Iterate. A cohesive founder system to validate your idea, ship an MVP, and reach paying users."
        keywords="lean startup, startup validation, MVP, founder journey, build measure learn"
        url="/bizmap-ai/hub"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="py-20 px-4 relative overflow-hidden">
          {/* Background animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.2), transparent 60%), radial-gradient(circle at 70% 70%, rgba(34, 197, 94, 0.2), transparent 55%)",
                animationDuration: "28s",
              }}
            />
          </div>

          <div className="container mx-auto max-w-6xl relative z-10 space-y-10">
            {/* Hero */}
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1">
                  The Lean Startup Method
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold takeover-gradient creatives-font">
                Learn. Build. Measure. Iterate.
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                One connected system to take your idea from validation to revenue.
                Every tool has a role. Every step moves you forward.
              </p>
              <LeanStartupCycle currentPhase={currentPhase} />
            </div>

            {/* Transition banner */}
            {transition && (
              <PhaseTransitionBanner
                prompt={transition}
                onDismiss={() =>
                  leanStore.dismissTransition(`${transition.from}->${transition.to}`)
                }
              />
            )}

            {/* Phase cards */}
            <div className="grid gap-6 md:grid-cols-3">
              {PHASE_CONFIG.map((cfg) => {
                const completion = getPhaseCompletion(cfg.phase);
                const unlocked = isPhaseUnlocked(cfg.phase);
                const jp = journeyProgressMap[cfg.journey.slug];

                return (
                  <PhaseCard
                    key={cfg.phase}
                    phase={cfg.phase}
                    title={cfg.title}
                    description={cfg.description}
                    icon={cfg.icon}
                    journey={{
                      ...cfg.journey,
                      journeyPercent: jp.percent,
                      started: jp.started,
                    }}
                    tools={cfg.tools.map((t) => ({
                      name: t.name,
                      href: t.href,
                      icon: t.icon,
                      used: leanStore.phases[cfg.phase].toolsUsed.includes(t.id),
                    }))}
                    completionPercent={completion}
                    isActive={currentPhase === cfg.phase}
                    isLocked={!unlocked}
                    onSkipAhead={() => leanStore.skipPhase(cfg.phase)}
                  />
                );
              })}
            </div>

            {/* AI Assist — always available */}
            <Card className="border-primary/20 bg-background/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  BizMap AI Assist
                </CardTitle>
                <CardDescription>
                  Available in every phase. Use the AI assistant to fill templates, rewrite copy,
                  and pressure-test your assumptions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/bizmap-ai">Open AI Assistant</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
