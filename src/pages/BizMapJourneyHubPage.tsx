import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, ClipboardList, Rocket, Target, CheckCircle2 } from "lucide-react";
import { useJourneyStore } from "@/store/journeyStore";
import { Progress } from "@/components/ui/progress";
import { journeyDefinitions } from "@/data/journeys";
import type { JourneySlug } from "@/types/journey";

const journeys = [
  {
    title: "Validate in 7 Days",
    description: "A 7-day sprint with daily tasks to narrow your ideas, test demand signals, and choose what to build.",
    tag: "Live",
    href: "/validate",
    slug: "validate" as JourneySlug,
    icon: Target,
    highlights: [
      "Day-by-day tasks with templates",
      "DM scripts + scoring tools",
      "Founder examples at every step"
    ]
  },
  {
    title: "Ship MVP in 14 Days",
    description: "A 14-day sprint from validated idea to deployed MVP — with daily build checkpoints.",
    tag: "Live",
    href: "/mvp-builder",
    slug: "mvp" as JourneySlug,
    icon: Rocket,
    highlights: [
      "Scope lock + tech stack selection",
      "Landing page + payment templates",
      "Ship-ready in 14 days"
    ]
  },
  {
    title: "Get 5 Paying Users in 30 Days",
    description: "A 30-day playbook to go from MVP to first revenue with outreach, pricing, and closing.",
    tag: "Live",
    href: "/client-acquisition",
    slug: "first-customers" as JourneySlug,
    icon: ClipboardList,
    highlights: [
      "Daily outreach + DM scripts",
      "Pricing experiments + objection handling",
      "Repeatable channel playbook"
    ]
  }
];

function JourneyCards() {
  const store = useJourneyStore();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {journeys.map((journey) => {
        const Icon = journey.icon;
        const journeyProgress = store.journeys[journey.slug];
        const journeyDef = journeyDefinitions[journey.slug];
        const started = !!journeyProgress;

        // Calculate completion
        let percent = 0;
        if (started && journeyDef) {
          const tasksPerDay: Record<number, number> = {};
          journeyDef.days.forEach((d) => { tasksPerDay[d.dayNumber] = d.tasks.length; });
          percent = store.getJourneyCompletionPercent(journey.slug, journeyDef.totalDays, tasksPerDay);
        }

        return (
          <Card key={journey.title} className="border-primary/10 bg-background/90">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="default">
                  {started ? (percent === 100 ? "Complete" : `${percent}%`) : journey.tag}
                </Badge>
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl">{journey.title}</CardTitle>
              <CardDescription>{journey.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {started && (
                <Progress value={percent} className="h-1.5 mb-2" />
              )}
              {journey.highlights.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
              <Button size="sm" className="mt-4 w-full" asChild>
                <Link to={journey.href}>
                  {started ? (percent === 100 ? "Review Journey" : "Continue Journey") : "Start Journey"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function BizMapJourneyHubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get("session");
    if (sessionId) {
      navigate(`/bizmap-ai/chat?session=${sessionId}`, { replace: true });
    }
  }, [navigate, searchParams]);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "BizMap AI Journeys - Creatives Takeover",
      "description": "Choose a fixed execution journey to decide what to build, confirm market need, and launch your startup with clear daily tasks.",
      "url": "https://creatives-takeover.com/bizmap-ai"
    },
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "BizMap AI", url: "/bizmap-ai" }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="BizMap AI Journeys - Creatives Takeover"
        description="Execution-first journeys for founders: decide what to build, confirm market need, ship an MVP, and reach paying users."
        keywords="startup validation, market need, founder journeys, execution plan, MVP launch"
        url="/bizmap-ai"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.2), transparent 60%), radial-gradient(circle at 70% 70%, rgba(34, 197, 94, 0.2), transparent 55%)",
                animationDuration: "28s"
              }}
            />
          </div>

          <div className="container mx-auto max-w-6xl relative z-10 space-y-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1">
                  Execution-First Journeys
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold takeover-gradient creatives-font">
                BizMap AI Journeys
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                Pick a fixed path and execute daily. Decide what to build, confirm market need, then ship.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/validate">
                    <Target className="h-4 w-4 mr-2" />
                    Start Validation Sprint
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/pmf-lab">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Run Market Need Lab
                  </Link>
                </Button>
              </div>
            </div>

            <JourneyCards />

            <Card className="border-primary/20 bg-background/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  BizMap AI Assist
                </CardTitle>
                <CardDescription>
                  Use the AI assistant to fill templates, rewrite copy, and pressure-test your assumptions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/bizmap-ai/chat">Open AI Assistant</Link>
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

