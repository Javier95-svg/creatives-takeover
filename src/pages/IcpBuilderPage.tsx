import { useState } from "react";
import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Target, Users, Sparkles, CheckCircle2 } from "lucide-react";

type IcpFormState = {
  productName: string;
  productType: string;
  problem: string;
  targetRole: string;
  industry: string;
  companySize: string;
  geography: string;
  competitors: string;
  currentAlternatives: string;
  unfairAdvantage: string;
  valuePromise: string;
  buyingTrigger: string;
  budgetRange: string;
  objections: string;
  evidence: string;
  painPoints: string;
};

type IcpAnalysis = {
  icpSnapshot: string;
  nicheDefinition: string[];
  painPoints: string[];
  positioning: string[];
  differentiation: string[];
  messagingAngles: string[];
  channels: string[];
  objections: string[];
};

const parseList = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const buildAnalysis = (state: IcpFormState): IcpAnalysis => {
  const competitors = parseList(state.competitors);
  const painPoints = parseList(state.painPoints);
  const objections = parseList(state.objections);

  const nicheParts = [
    state.targetRole && `Role: ${state.targetRole}`,
    state.industry && `Industry: ${state.industry}`,
    state.companySize && `Company size: ${state.companySize}`,
    state.geography && `Region: ${state.geography}`,
  ].filter(Boolean);

  const icpSnapshot =
    `Ideal customer: ${state.targetRole || "decision maker"} ` +
    `at ${state.companySize || "small to mid-sized"} ${state.industry || "teams"} ` +
    `${state.geography ? `in ${state.geography}` : ""}. ` +
    `${state.problem ? `They struggle with ${state.problem}.` : ""}`.replace(/\s+/g, " ").trim();

  const derivedPainPoints =
    painPoints.length > 0
      ? painPoints
      : [
          state.problem ? `Pain is triggered by ${state.problem}.` : "Current workflows are slow and inconsistent.",
          state.currentAlternatives
            ? `Existing alternatives (${state.currentAlternatives}) feel clunky or expensive.`
            : "Current alternatives are fragmented or manual.",
          "Low confidence in ROI or outcomes from existing solutions.",
        ];

  const differentiation = [
    state.unfairAdvantage
      ? `Unfair advantage: ${state.unfairAdvantage}.`
      : "Clarify a defensible advantage (speed, accuracy, data, or network).",
    state.valuePromise
      ? `Primary promise: ${state.valuePromise}.`
      : "Define the outcome you deliver faster or more reliably.",
    competitors.length
      ? `Compete by narrowing focus vs. ${competitors.join(", ")}.`
      : "Position against generic alternatives by narrowing your niche.",
  ];

  const positioning = [
    "Pick a sharp wedge: choose the smallest segment with urgent pain and budget.",
    "Lead with a quantified outcome (time saved, revenue unlocked, risk reduced).",
    "Back claims with proof: customer quotes, benchmarks, or before/after metrics.",
    "Create a clear category: name the problem and own the language around it.",
  ];

  const messagingAngles = [
    state.valuePromise
      ? `Outcome-led: ${state.valuePromise}.`
      : "Outcome-led: focus on measurable wins.",
    state.buyingTrigger
      ? `Trigger-based: act when ${state.buyingTrigger}.`
      : "Trigger-based: act at key moments (growth, launch, compliance).",
    state.evidence
      ? `Proof-first: highlight ${state.evidence}.`
      : "Proof-first: showcase evidence, demos, or quick wins.",
  ];

  const channels = [
    state.targetRole ? `Direct outreach to ${state.targetRole} communities.` : "Direct outreach to niche communities.",
    state.industry ? `Industry channels and newsletters in ${state.industry}.` : "Industry-specific newsletters.",
    "LinkedIn + targeted partnerships for credibility.",
  ];

  const objectionsList =
    objections.length > 0
      ? objections
      : [
          "Not sure this will integrate with our stack.",
          "We already use a partial solution.",
          "Budget is tight for new tools.",
        ];

  return {
    icpSnapshot,
    nicheDefinition: nicheParts.length ? nicheParts : ["Define role, industry, size, and region to sharpen the niche."],
    painPoints: derivedPainPoints,
    positioning,
    differentiation,
    messagingAngles,
    channels,
    objections: objectionsList,
  };
};

const defaultState: IcpFormState = {
  productName: "",
  productType: "",
  problem: "",
  targetRole: "",
  industry: "",
  companySize: "",
  geography: "",
  competitors: "",
  currentAlternatives: "",
  unfairAdvantage: "",
  valuePromise: "",
  buyingTrigger: "",
  budgetRange: "",
  objections: "",
  evidence: "",
  painPoints: "",
};

export default function IcpBuilderPage() {
  const [form, setForm] = useState<IcpFormState>(defaultState);
  const [analysis, setAnalysis] = useState<IcpAnalysis | null>(null);

  const handleChange = (key: keyof IcpFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = () => {
    setAnalysis(buildAnalysis(form));
  };

  const handleReset = () => {
    setForm(defaultState);
    setAnalysis(null);
  };

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "ICP Builder - Creatives Takeover",
      description:
        "Define your Ideal Customer Profile and get a detailed target market analysis, pain points, and positioning strategy.",
      url: "https://creatives-takeover.com/icp-builder",
    },
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "BizMap AI", url: "/bizmap-ai" },
      { name: "ICP Builder", url: "/icp-builder" },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="ICP Builder - Creatives Takeover"
        description="Identify your Ideal Customer Profile, uncover niche pain points, and build a positioning strategy that stands out."
        keywords="ICP builder, ideal customer profile, niche positioning, target market analysis"
        url="/icp-builder"
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
                  "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.2), transparent 60%), radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.2), transparent 55%)",
                animationDuration: "28s",
              }}
            />
          </div>

          <div className="container mx-auto max-w-6xl relative z-10 space-y-10">
            <div className="text-center space-y-4">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1">
                ICP Builder
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold takeover-gradient creatives-font">
                Define Your Ideal Customer Profile
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                Pinpoint your niche, uncover core pain points, and craft a positioning strategy that makes you the obvious choice.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
              <Card className="border-primary/20 bg-background/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Product & Market Inputs
                  </CardTitle>
                  <CardDescription>
                    Share key details so the ICP analysis is specific and actionable.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Product name</label>
                      <Input
                        value={form.productName}
                        onChange={(e) => handleChange("productName", e.target.value)}
                        placeholder="e.g., SignalIQ"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Product type</label>
                      <Input
                        value={form.productType}
                        onChange={(e) => handleChange("productType", e.target.value)}
                        placeholder="SaaS, service, marketplace, etc."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Core problem to solve</label>
                    <Textarea
                      value={form.problem}
                      onChange={(e) => handleChange("problem", e.target.value)}
                      placeholder="Describe the painful outcome your product fixes."
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target role / title</label>
                      <Input
                        value={form.targetRole}
                        onChange={(e) => handleChange("targetRole", e.target.value)}
                        placeholder="Growth lead, founder, ops manager..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Industry / niche</label>
                      <Input
                        value={form.industry}
                        onChange={(e) => handleChange("industry", e.target.value)}
                        placeholder="e.g., DTC brands, creator economy"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company size / stage</label>
                      <Input
                        value={form.companySize}
                        onChange={(e) => handleChange("companySize", e.target.value)}
                        placeholder="1-10 employees, seed-stage, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Geography</label>
                      <Input
                        value={form.geography}
                        onChange={(e) => handleChange("geography", e.target.value)}
                        placeholder="North America, LATAM, remote-first"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Main competitors</label>
                    <Input
                      value={form.competitors}
                      onChange={(e) => handleChange("competitors", e.target.value)}
                      placeholder="List competitors (comma or line separated)"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current alternatives / workarounds</label>
                    <Textarea
                      value={form.currentAlternatives}
                      onChange={(e) => handleChange("currentAlternatives", e.target.value)}
                      placeholder="Spreadsheets, manual outreach, agency..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unfair advantage</label>
                      <Textarea
                        value={form.unfairAdvantage}
                        onChange={(e) => handleChange("unfairAdvantage", e.target.value)}
                        placeholder="Data access, founder credibility, automation..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Primary value promise</label>
                      <Textarea
                        value={form.valuePromise}
                        onChange={(e) => handleChange("valuePromise", e.target.value)}
                        placeholder="The measurable outcome you deliver."
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Buying trigger</label>
                      <Input
                        value={form.buyingTrigger}
                        onChange={(e) => handleChange("buyingTrigger", e.target.value)}
                        placeholder="What makes them search for a solution?"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Budget range</label>
                      <Input
                        value={form.budgetRange}
                        onChange={(e) => handleChange("budgetRange", e.target.value)}
                        placeholder="$100-500/mo, $5k project, etc."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Common objections</label>
                    <Textarea
                      value={form.objections}
                      onChange={(e) => handleChange("objections", e.target.value)}
                      placeholder="List objections (comma or line separated)"
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Evidence or traction</label>
                    <Textarea
                      value={form.evidence}
                      onChange={(e) => handleChange("evidence", e.target.value)}
                      placeholder="Results, testimonials, benchmarks, proof points."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Known pain points (optional)</label>
                    <Textarea
                      value={form.painPoints}
                      onChange={(e) => handleChange("painPoints", e.target.value)}
                      placeholder="List pain points (comma or line separated)"
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleGenerate} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Generate ICP Analysis
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-background/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    ICP Analysis Output
                  </CardTitle>
                  <CardDescription>
                    Detailed target market summary, pain points, and positioning strategy.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!analysis && (
                    <div className="text-sm text-muted-foreground">
                      Fill out the inputs and click "Generate ICP Analysis" to see your detailed output.
                    </div>
                  )}

                  {analysis && (
                    <div className="space-y-5">
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                          <CheckCircle2 className="h-4 w-4" />
                          ICP Snapshot
                        </div>
                        <p className="text-sm text-muted-foreground">{analysis.icpSnapshot}</p>
                        {form.budgetRange && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Typical budget: {form.budgetRange}
                          </p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-2">Niche Definition</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                          {analysis.nicheDefinition.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-2">Top Pain Points</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                          {analysis.painPoints.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-2">Positioning Strategy</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                          {analysis.positioning.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-2">Differentiation Signals</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                          {analysis.differentiation.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-2">Messaging Angles</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                          {analysis.messagingAngles.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-2">Recommended Channels</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                          {analysis.channels.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-2">Objections to Address</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                          {analysis.objections.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
