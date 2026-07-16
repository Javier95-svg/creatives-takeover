import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";

import SEO, { createBreadcrumbSchema, createHowToSchema, createFAQSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RevealGroup, ScrollReveal } from "@/components/animations/ScrollReveal";

const STAGES = [
  {
    number: "01",
    cluster: "ICP / Customer Clarity",
    title: "Define who you're building for",
    description:
      "Before you write code or design screens, you need to know exactly who your first customer is and what pain they feel so urgently they'll take action to solve it. Most failed startups skipped this step.",
    color: "text-violet-400",
    borderColor: "border-violet-500/30",
    bgColor: "bg-violet-500/10",
    pages: [
      { slug: "how-to-define-icp-for-startup", label: "How to Define an ICP for Your Startup" },
      { slug: "ideal-customer-profile-template", label: "Ideal Customer Profile Template" },
      { slug: "startup-positioning-examples", label: "Startup Positioning Examples" },
    ],
    cta: { label: "Build My ICP Free", href: "/icp-builder" },
    checklist: [
      "One specific customer segment defined",
      "One painful job-to-be-done identified",
      "Current workaround documented",
      "Positioning sentence written",
    ],
  },
  {
    number: "02",
    cluster: "Validation",
    title: "Prove the problem before you build",
    description:
      "Validation is collecting evidence that real people have a real problem and will take real action to solve it. A waitlist, 15 honest customer interviews, or a presale converts an assumption into a decision.",
    color: "text-success",
    borderColor: "border-success/30",
    bgColor: "bg-success/10",
    pages: [
      { slug: "how-to-validate-startup-idea", label: "How to Validate a Startup Idea Before Building" },
      { slug: "waitlist-before-mvp", label: "Waitlist or MVP: What Should You Build First?" },
      { slug: "product-market-fit-survey-questions", label: "Product-Market Fit Survey Questions" },
    ],
    cta: { label: "Validate This Idea", href: "/validate" },
    checklist: [
      "Riskiest assumption identified",
      "15+ customer conversations or equivalent evidence",
      "Waitlist or landing page tested",
      "Decision rule for build vs. keep testing set",
    ],
  },
  {
    number: "03",
    cluster: "Build",
    title: "Scope and ship your MVP in 6–8 weeks",
    description:
      "An MVP is not a smaller version of the full product. It's the smallest thing that proves your core promise to one customer and generates the learning you need to decide what to build next.",
    color: "text-info",
    borderColor: "border-info/30",
    bgColor: "bg-info/10",
    pages: [
      { slug: "mvp-builder-for-startups", label: "MVP Builder for Startups: What to Build First" },
      { slug: "tech-stack-for-startup", label: "How to Choose a Tech Stack for Your Startup" },
    ],
    cta: { label: "Scope My MVP", href: "/mvp-builder" },
    checklist: [
      "One ICP and one core promise",
      "3–5 must-have features only",
      "Ship date set (max 6–8 weeks)",
      "First 10 users named before building",
    ],
  },
  {
    number: "04",
    cluster: "Launch / GTM",
    title: "Get your first 100 customers",
    description:
      "Early go-to-market is not a marketing campaign — it's a focused system for reaching one customer segment through one or two channels with a message specific enough to convert attention into signups.",
    color: "text-warning",
    borderColor: "border-warning/30",
    bgColor: "bg-warning/10",
    pages: [
      { slug: "go-to-market-strategy-for-startup", label: "Go-to-Market Strategy for an Early-Stage Startup" },
      { slug: "first-users-for-saas", label: "How to Find the First Users for a SaaS Startup" },
      { slug: "startup-launch-checklist", label: "Startup Launch Checklist for First-Time Founders" },
    ],
    cta: { label: "Map My GTM Strategy", href: "/go-to-market" },
    checklist: [
      "Primary GTM channel chosen",
      "Channel-native content written",
      "UTM tracking set up",
      "Weekly traction experiment running",
    ],
  },
  {
    number: "05",
    cluster: "Fundraising",
    title: "Prepare for investors when you're ready",
    description:
      "Fundraising is not a prerequisite for building a startup — but when you're ready, a focused investor list, a tight pitch deck, and the right timing dramatically increase your chances.",
    color: "text-pink-400",
    borderColor: "border-pink-500/30",
    bgColor: "bg-pink-500/10",
    pages: [
      { slug: "pitch-deck-feedback-for-startups", label: "Pitch Deck Feedback: What Investors Notice First" },
      { slug: "vc-search-for-startups", label: "VC Search for Startups: Build a Better Investor List" },
      { slug: "accelerator-alternatives", label: "Accelerator Alternatives for Founders Who Want to Build Now" },
    ],
    cta: { label: "Search Investors", href: "/insighta/vc-search" },
    checklist: [
      "Traction evidence documented",
      "Pitch deck narrative audited",
      "Investor shortlist filtered by stage and sector",
      "Warm intro path or cold angle identified",
    ],
  },
];

const FAQS = [
  {
    question: "How long does it take to build a startup from idea to launch?",
    answer:
      "A focused founder can go from idea to first paying customer in 60–90 days: 2 weeks on ICP and validation, 6–8 weeks building an MVP, and 2–4 weeks on launch. The biggest time killers are skipping validation and overbuilding the first version.",
  },
  {
    question: "Do I need a co-founder to build a startup?",
    answer:
      "No. Many successful startups were founded by solo founders. A co-founder reduces risk in specific areas (technical vs. business, for example), but the absence of one is not a reason to delay. Validate the idea first — then decide if you need a co-founder based on what the validation reveals.",
  },
  {
    question: "How much money do I need to start a startup?",
    answer:
      "Idea validation costs almost nothing — 15 customer interviews and a landing page can be done for under $100. An MVP for a SaaS startup can often be built for $0 if you use free tiers of tools. The question to ask is: what's the cheapest way to prove the riskiest assumption?",
  },
  {
    question: "What's the difference between a startup and a small business?",
    answer:
      "A startup is designed to test a hypothesis about a scalable business model — it's built to grow fast once the model is proven. A small business is designed to generate sustainable revenue from day one, usually in an established market. The tactics for each are very different.",
  },
  {
    question: "Should I raise funding or bootstrap my startup?",
    answer:
      "Bootstrap if you can get to $10K MRR with your own resources — investors give better terms to founders who don't need their money. Raise if your business requires capital to compete (high CAC, hardware, regulated industries) or if the window for your market is short.",
  },
  {
    question: "What is product-market fit and how do I know when I have it?",
    answer:
      "Product-market fit is when a specific customer segment regularly uses your product to solve a painful problem and would be genuinely upset if it disappeared. The Sean Ellis test asks: 'How would you feel if you could no longer use this?' If 40%+ say 'very disappointed', you likely have PMF in that segment.",
  },
];

const howToSteps = STAGES.map((s) => ({
  title: s.title,
  description: s.description,
}));

export default function StartupGuide() {
  const structuredData = [
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "How to Build a Startup", url: "/startup-guide" },
    ]),
    createHowToSchema({
      name: "How to Build a Startup: The Complete First-Time Founder Guide",
      description:
        "A step-by-step guide for first-time founders covering ICP definition, idea validation, MVP planning, go-to-market strategy, and fundraising preparation.",
      steps: howToSteps,
      url: "/startup-guide",
    }),
    createFAQSchema(FAQS),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "How to Build a Startup: The Complete First-Time Founder Guide",
      description:
        "A step-by-step guide for first-time founders covering ICP definition, idea validation, MVP planning, go-to-market strategy, and fundraising preparation.",
      dateModified: "2026-05-17",
      author: { "@type": "Organization", name: "Creatives Takeover" },
      publisher: {
        "@type": "Organization",
        name: "Creatives Takeover",
        logo: { "@type": "ImageObject", url: "https://creatives-takeover.com/favicon.png" },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": "https://creatives-takeover.com/startup-guide",
      },
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HomeWallpaper />
      <SEO
        title="How to Build a Startup: First-Time Founder Guide"
        description="A step-by-step guide for first-time founders: define your ICP, validate your idea, scope your MVP, plan go-to-market, and prepare for fundraising."
        keywords="how to build a startup, startup guide for beginners, first-time founder guide, startup idea validation, MVP planning, go-to-market strategy startup, startup fundraising guide, how to start a tech company"
        url="/startup-guide"
        canonical="https://creatives-takeover.com/startup-guide"
        image="/og-image.png"
        type="article"
        structuredData={structuredData}
      />
      <div className="relative z-10">
        <Navigation />
        <main className="container mx-auto px-4 py-24 sm:px-6">

          {/* Hero */}
          <header className="mx-auto max-w-4xl text-center">
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary mb-5">
              Complete Founder Guide
            </Badge>
            <h1 className="font-space-grotesk text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              How to Build a Startup
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              The complete step-by-step guide for first-time founders — from defining your first customer
              to landing your first hundred users. No fluff, no MBA required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/icp-builder">
                  Start Building Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/answers">Browse All Founder Answers</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              5 stages · 14 deep-dive guides · Free AI tools for each step
            </p>
          </header>

          {/* Stage overview nav */}
          <nav className="mx-auto mt-16 max-w-4xl" aria-label="Startup guide stages">
            <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-5" variant="card">
              {STAGES.map((stage) => (
                <a
                  key={stage.number}
                  href={`#stage-${stage.number}`}
                  className={`block rounded-xl border ${stage.borderColor} ${stage.bgColor} p-3 text-center transition-colors hover:bg-card`}
                >
                  <span className={`block text-xs font-bold ${stage.color}`}>{stage.number}</span>
                  <span className="mt-1 block text-xs font-medium text-foreground">{stage.cluster}</span>
                </a>
              ))}
            </RevealGroup>
          </nav>

          {/* Stages */}
          <RevealGroup className="mx-auto mt-16 max-w-4xl space-y-20" variant="default">
            {STAGES.map((stage) => (
              <section key={stage.number} id={`stage-${stage.number}`} className="scroll-mt-24">
                {/* Stage header */}
                <div className="flex items-start gap-5">
                  <div className={`flex-none rounded-2xl border ${stage.borderColor} ${stage.bgColor} px-4 py-3 text-center`}>
                    <span className={`block text-2xl font-bold ${stage.color}`}>{stage.number}</span>
                    <span className={`block text-xs font-semibold ${stage.color}`}>{stage.cluster}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{stage.title}</h2>
                    <p className="mt-2 text-base leading-relaxed text-muted-foreground">{stage.description}</p>
                  </div>
                </div>

                {/* Deep-dive links */}
                <div className="mt-6 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Deep-dive guides
                  </p>
                  {stage.pages.map((page) => (
                    <Link
                      key={page.slug}
                      to={`/answers/${page.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-4 text-sm font-medium transition-colors hover:bg-card hover:border-primary/30"
                    >
                      <ChevronRight className={`h-4 w-4 flex-none ${stage.color}`} />
                      {page.label}
                    </Link>
                  ))}
                </div>

                {/* Checklist + CTA */}
                <div className={`mt-6 rounded-2xl border ${stage.borderColor} ${stage.bgColor} p-6`}>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                        Stage checklist
                      </p>
                      <div className="space-y-2">
                        {stage.checklist.map((item) => (
                          <div key={item} className="flex gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-none ${stage.color}`} />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col justify-between">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Use the free CT tool to complete this stage with AI guidance — step by step.
                      </p>
                      <Button asChild className="mt-4 w-full sm:w-auto">
                        <Link to={stage.cta.href}>
                          {stage.cta.label}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </RevealGroup>

          {/* Mentor CTA */}
          <ScrollReveal variant="card">
            <section className="mx-auto mt-20 max-w-4xl rounded-5xl border border-primary/20 bg-primary/5 p-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Sometimes you need a human, not a framework</h2>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                CT's Mentor Marketplace connects first-time founders with vetted startup mentors who have
                hands-on experience in fundraising, MVP planning, customer discovery, and go-to-market strategy.
                Book a focused 1-on-1 session and get unstuck fast.
              </p>
              <Button asChild className="mt-6" size="lg">
                <Link to="/mentorship">
                  Browse Startup Mentors
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </section>
          </ScrollReveal>

          {/* FAQ */}
          <section className="mx-auto mt-20 max-w-4xl">
            <ScrollReveal>
              <h2 className="text-2xl font-semibold tracking-tight mb-8">Founder questions answered</h2>
            </ScrollReveal>
            <RevealGroup className="space-y-5" variant="card">
              {FAQS.map((faq) => (
                <Card key={faq.question} className="border-border/60 bg-card/80">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-base">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </RevealGroup>
          </section>

          {/* Bottom CTA */}
          <ScrollReveal>
          <section className="mx-auto mt-20 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Ready to start building?</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Everything in this guide maps to a free CT tool. Start with your ICP — it makes every other decision easier.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/icp-builder">
                  Build My ICP Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/bizmap-ai">Explore BizMap AI</Link>
              </Button>
            </div>
          </section>
          </ScrollReveal>

        </main>
        <Footer />
      </div>
    </div>
  );
}
