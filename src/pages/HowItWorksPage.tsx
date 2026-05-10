import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  LayoutDashboard,
  Sparkles,
  Users,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const journeyPillars = [
  {
    title: "BizMap AI",
    href: "/bizmap-ai",
    icon: Bot,
    summary:
      "BizMap AI is the starting point of the journey. It helps founders map out their business model, validate the idea, and get AI-powered strategic guidance before they spend weeks building the wrong thing.",
    outcome: "A structured, validated roadmap the founder can act on from day one.",
  },
  {
    title: "Community",
    href: "/community",
    icon: Users,
    summary:
      "The community connects founders, creatives, and coaches at similar or complementary stages. Members use peer support, founder matching, accountability, and collaboration spaces to find cofounders, partners, and feedback loops.",
    outcome: "A support network and meaningful connections that accelerate growth.",
  },
  {
    title: "Insighta",
    href: "/insighta",
    icon: BarChart3,
    summary:
      "Insighta is the analytics and market intelligence layer of Creatives Takeover. It helps founders track traction, understand their ICP, and make data-informed decisions about what to test, improve, or stop.",
    outcome: "Clarity on what is working, what is not, and where to focus next.",
  },
  {
    title: "Dashboard",
    href: "/signup",
    icon: LayoutDashboard,
    summary:
      "The dashboard is the founder's mission control. It consolidates progress, daily routine, AI recommendations, and platform activity in one focused workspace.",
    outcome: "A personalized workspace that keeps the founder on track every day.",
  },
];

const HowItWorksPage = () => {
  return (
    <>
      <Helmet>
        <title>How It Works | Creatives Takeover</title>
        <meta
          name="description"
          content="See how Creatives Takeover helps early-stage founders validate, build, launch, and grow through BizMap AI, community, Insighta, and a focused dashboard."
        />
        <link rel="canonical" href="https://creatives-takeover.com/how-it-works" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <Navigation />

        <main>
          <section className="relative overflow-hidden px-4 pb-12 pt-32 sm:px-6 lg:px-8 lg:pb-16 lg:pt-36">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_34%),linear-gradient(180deg,hsl(var(--muted)/0.58),transparent_58%)]" />
            <div className="mx-auto max-w-5xl">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                  The startup development cycle
                </div>
                <h1 className="mt-6 font-space-grotesk text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  From first idea to focused execution.
                </h1>
                <p className="mt-5 text-lg leading-8 text-muted-foreground">
                  Creatives Takeover gives founders a practical path through validation, support, intelligence,
                  and daily execution. The goal is simple: know what to build, who to build it for, and what to do next.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link to="/signup">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/bizmap-ai">Start with BizMap AI</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
              {journeyPillars.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <article
                    key={pillar.title}
                    id={pillar.title.toLowerCase().replace(/\s+/g, "-")}
                    className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Step {index + 1}
                          </p>
                          <h2 className="font-space-grotesk text-xl font-semibold text-foreground">
                            {pillar.title}
                          </h2>
                        </div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">
                      {pillar.summary}
                    </p>
                    <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 p-4">
                      <p className="text-sm font-semibold text-foreground">What you will walk away with</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{pillar.outcome}</p>
                    </div>
                    <Link
                      to={pillar.href}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Explore {pillar.title}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default HowItWorksPage;
