import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Rocket, Workflow, Users, Sparkles, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { useState } from "react";
import creatorsImg from "@/assets/community-builders.jpg";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [idea, setIdea] = useState("");
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleStartNow = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Idea received",
      description: "We'll guide you through the next steps shortly.",
    });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Subscribed", description: "Thanks for joining our newsletter!" });
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Creatives Takeover",
    url: "/",
    logo: "/favicon.ico",
    sameAs: [],
  };

  return (
    <>
      <Helmet>
        <title>From Idea to Startup — Creatives Takeover</title>
        <meta name="description" content="Turn ideas into functional startups. We automate operations with AI so you can launch fast and grow confidently." />
        <link rel="canonical" href="/" />
        <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 pt-24 pb-16">
          {/* Hero Section */}
          <header className="grid gap-10 md:grid-cols-2 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm text-muted-foreground bg-accent/30">
                <Sparkles className="mr-2 h-4 w-4" /> AI-Powered Startup Builder
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                From idea to startup — powered by AI.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
                We turn your concepts into real, functional startups by automating your operations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg">
                  <a href="#start-now" aria-label="Start Your Idea">
                    Start Your Idea
                    <ArrowRight className="ml-2" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#how-it-works" aria-label="See How It Works">See How It Works</a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Free to start. No credit card required.</p>
            </div>

            {/* Right: Interactive mockup */}
            <div className="relative">
              <Card className="p-6 h-full animate-fade-in">
                <div className="mb-4 flex items-center gap-2">
                  <Workflow className="h-5 w-5" />
                  <span className="font-medium">AI Workflow Preview</span>
                </div>
                <div className="space-y-4">
                  <div className="rounded-md border border-dashed border-border p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">Capture Idea</p>
                        <p className="text-sm text-muted-foreground">Summarize goals, target users, and value.</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border border-dashed border-border p-4">
                    <div className="flex items-start gap-3">
                      <Workflow className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">Generate Operations</p>
                        <p className="text-sm text-muted-foreground">AI sets up tools, workflows, and templates.</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border border-dashed border-border p-4">
                    <div className="flex items-start gap-3">
                      <Rocket className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">Launch & Iterate</p>
                        <p className="text-sm text-muted-foreground">Deploy your MVP and refine with feedback.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </header>

          {/* How We Operate */}
          <section id="how-it-works" className="mt-24">
            <header className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold">How We Operate</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">Three simple steps to go from idea to launch.</p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <Users className="h-6 w-6" />
                  <div>
                    <h3 className="font-semibold text-lg">Share Your Idea</h3>
                    <p className="text-sm text-muted-foreground">Submit your concept in minutes.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <Workflow className="h-6 w-6" />
                  <div>
                    <h3 className="font-semibold text-lg">AI Builds Your Operations</h3>
                    <p className="text-sm text-muted-foreground">Automated setup of workflows, tools, and templates.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <Rocket className="h-6 w-6" />
                  <div>
                    <h3 className="font-semibold text-lg">Launch & Grow</h3>
                    <p className="text-sm text-muted-foreground">Deploy your startup and scale with our marketplace.</p>
                  </div>
                </div>
              </Card>
            </div>
            <div className="mt-8">
              <Button asChild size="lg">
                <a href="#start-now" aria-label="Get Started">Get Started</a>
              </Button>
            </div>
          </section>

          {/* Our Vision */}
          <section className="mt-24">
            <header className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold">Empowering Creators, One Startup at a Time.</h2>
            </header>
            <div className="grid gap-8 md:grid-cols-2 items-center">
              <p className="text-muted-foreground text-lg">
                We believe every creative idea deserves a chance to succeed. Our mission is to make startup building accessible to everyone by removing the barriers of time, cost, and complexity.
              </p>
              <figure className="rounded-lg overflow-hidden border border-border">
                <img src={creatorsImg} alt="Diverse creators collaborating with AI to build startups" loading="lazy" className="w-full h-full object-cover" />
              </figure>
            </div>
          </section>

          {/* Key Benefits */}
          <section className="mt-24">
            <header className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold">Key Benefits</h2>
            </header>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <Rocket className="h-5 w-5" />
                  <div>
                    <h3 className="font-semibold">Launch in weeks, not months</h3>
                    <p className="text-sm text-muted-foreground">Move from idea to MVP fast with AI workflows.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5" />
                  <div>
                    <h3 className="font-semibold">Keep 100% of your IP</h3>
                    <p className="text-sm text-muted-foreground">Your ideas and assets remain entirely yours.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5" />
                  <div>
                    <h3 className="font-semibold">AI agents + human expertise</h3>
                    <p className="text-sm text-muted-foreground">Best of both worlds to ensure quality and speed.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <h3 className="font-semibold">Templates for every stage</h3>
                    <p className="text-sm text-muted-foreground">Accelerators from idea validation to growth.</p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Interactive CTA */}
          <section id="start-now" className="mt-24">
            <header className="mb-6">
              <h2 className="text-3xl md:text-4xl font-bold">Ready to see your idea come to life?</h2>
              <p className="mt-2 text-muted-foreground">Free to start, no credit card required.</p>
            </header>
            <form onSubmit={handleStartNow} className="flex flex-col sm:flex-row gap-3">
              <Input
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Your Startup Idea"
                aria-label="Your Startup Idea"
              />
              <Button type="submit" size="lg">Start Now</Button>
            </form>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border">
          <div className="container mx-auto px-6 py-10 grid gap-8 md:grid-cols-3">
            <div>
              <p className="font-semibold">Creatives Takeover</p>
              <p className="mt-2 text-sm text-muted-foreground">Build your startup with AI-powered operations.</p>
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-2">
              <a className="text-sm text-muted-foreground hover:text-foreground" href="/">Home</a>
              <a className="text-sm text-muted-foreground hover:text-foreground" href="#how-it-works">How It Works</a>
              <a className="text-sm text-muted-foreground hover:text-foreground" href="/software">Solutions</a>
              <a className="text-sm text-muted-foreground hover:text-foreground" href="/pricing">Pricing</a>
              <a className="text-sm text-muted-foreground hover:text-foreground" href="/contact">Contact</a>
            </nav>
            <form onSubmit={handleSubscribe} className="space-y-3">
              <p className="font-medium">Subscribe to our newsletter</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  aria-label="Email address"
                  required
                />
                <Button type="submit">Subscribe</Button>
              </div>
            </form>
          </div>
          <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Creatives Takeover. All rights reserved.</div>
        </footer>
      </div>
    </>
  );
};

export default Index;
