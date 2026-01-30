import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ClipboardList, Rocket, Target } from "lucide-react";
import { Link } from "react-router-dom";

const validateDays = [
  {
    day: "Day 1",
    title: "Clarify the problem + persona",
    tasks: [
      "Write a one-sentence problem statement",
      "List 3 assumptions you must validate",
      "Run the PMF Lab to pressure-test your inputs"
    ],
    cta: true
  },
  {
    day: "Day 2",
    title: "Design 10 interview questions",
    tasks: [
      "Draft an interview guide (no pitching)",
      "Identify 20 people who fit the persona",
      "Send 10 interview DMs"
    ]
  },
  {
    day: "Day 3",
    title: "Run 5 interviews",
    tasks: [
      "Record exact pains, words, and priorities",
      "Tag: problem frequency + urgency",
      "Summarize top 3 patterns"
    ]
  },
  {
    day: "Day 4",
    title: "Draft a landing page + offer",
    tasks: [
      "Create a 1-screen landing page draft",
      "Write 3 value props + 1 CTA",
      "Create 2 pricing options"
    ]
  },
  {
    day: "Day 5",
    title: "Run a pricing test",
    tasks: [
      "Send the landing page to 15 people",
      "Track clicks + reply intent",
      "Refine offer and price"
    ]
  },
  {
    day: "Day 6",
    title: "Get your first soft commit",
    tasks: [
      "Ask for a pre-order / waitlist deposit",
      "Collect 3 LOIs or pre-orders",
      "Document objections"
    ]
  },
  {
    day: "Day 7",
    title: "Decide: build, pivot, or pause",
    tasks: [
      "Summarize validation signals",
      "Update the PMF Lab assumptions",
      "Pick your next 14-day build plan"
    ]
  }
];

export default function ValidateJourneyPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Validate in 7 Days - Creatives Takeover",
      "description": "A 7-day execution plan to validate your startup idea using PMF Lab, interviews, pricing tests, and real signals.",
      "url": "https://creatives-takeover.com/validate"
    },
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "BizMap AI", url: "/bizmap-ai" },
      { name: "Validate in 7 Days", url: "/validate" }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Validate in 7 Days - Creatives Takeover"
        description="Validate your startup idea in 7 days with daily tasks, templates, and PMF Lab checkpoints."
        keywords="startup validation, PMF, customer discovery, pricing test, founder journey"
        url="/validate"
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
                  "radial-gradient(circle at 30% 30%, rgba(34, 197, 94, 0.25), transparent 60%), radial-gradient(circle at 70% 70%, rgba(239, 68, 68, 0.2), transparent 55%)",
                animationDuration: "28s"
              }}
            />
          </div>

          <div className="container mx-auto max-w-6xl relative z-10 space-y-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1">
                  Execution Journey
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold takeover-gradient creatives-font">
                Validate in 7 Days
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                A clear path from idea to real signal. Use PMF Lab, real conversations, and pricing tests to decide what to build.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/pmf-lab">
                    <Target className="h-4 w-4 mr-2" />
                    Start PMF Lab
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/validate">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    View Daily Plan
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-primary/20 bg-background/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-primary" />
                    PMF Lab checkpoint
                  </CardTitle>
                  <CardDescription>
                    Day 1 runs through your core assumptions. Day 7 re-runs with real signal.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-primary/20 bg-background/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Tiny daily tasks
                  </CardTitle>
                  <CardDescription>
                    30–60 minutes per day. Focused, concrete, and accountable.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-primary/20 bg-background/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Rocket className="h-5 w-5 text-primary" />
                    Real outcome
                  </CardTitle>
                  <CardDescription>
                    By Day 7 you&apos;ll know: build, pivot, or pause.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div id="daily-plan" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Daily validation plan</h2>
                <Badge variant="outline">7 days</Badge>
              </div>
              <div className="grid gap-4">
                {validateDays.map((day) => (
                  <Card key={day.day} className="border-border/70 bg-background/90">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-primary font-semibold">{day.day}</span>
                        <span className="text-lg font-semibold">{day.title}</span>
                      </CardTitle>
                      {day.cta && (
                        <CardDescription className="flex items-center gap-2 text-sm">
                          PMF Lab is your validation engine for this step.
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {day.tasks.map((task) => (
                        <div key={task} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                          <span>{task}</span>
                        </div>
                      ))}
                      {day.cta && (
                        <Button size="sm" variant="outline" className="mt-4" asChild>
                          <Link to="/pmf-lab">Run PMF Lab</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
