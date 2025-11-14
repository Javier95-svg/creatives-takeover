import GuideLayout from "@/components/guides/GuideLayout";
import GuideSection from "@/components/guides/GuideSection";
import { TrendingUp, Building, Users, Gift, Clock, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FundingWorksGuide = () => {
  const fundingTypes = [
    {
      type: "Equity Funding",
      description: "Give up ownership stake in exchange for capital",
      pros: ["Large capital amounts", "Expert guidance and connections", "Validation from investors"],
      cons: ["Dilution of ownership", "Loss of control", "Pressure for rapid growth"],
      bestFor: "High-growth startups with scalable business models",
    },
    {
      type: "Grants",
      description: "Non-dilutive funding from government or organizations",
      pros: ["No equity given up", "No repayment required", "Often includes support/resources"],
      cons: ["Highly competitive", "Strict requirements", "Time-consuming applications"],
      bestFor: "Social impact, research, or mission-driven ventures",
    },
    {
      type: "Crowdfunding",
      description: "Raise small amounts from many people online",
      pros: ["Market validation", "Community building", "No equity required (depends on type)"],
      cons: ["Requires marketing effort", "Platform fees", "All-or-nothing risk"],
      bestFor: "Consumer products with strong story or social mission",
    },
    {
      type: "Bootstrapping",
      description: "Self-funding through revenue or personal savings",
      pros: ["Full ownership and control", "No investor pressure", "Build sustainable business"],
      cons: ["Limited capital", "Slower growth", "Personal financial risk"],
      bestFor: "Service businesses or capital-efficient models",
    },
  ];

  const fundingStages = [
    { stage: "Pre-Seed", amount: "$50K - $500K", focus: "Idea validation, MVP, founding team" },
    { stage: "Seed", amount: "$500K - $2M", focus: "Product-market fit, initial traction" },
    { stage: "Series A", amount: "$2M - $15M", focus: "Scaling operations, proven business model" },
    { stage: "Series B", amount: "$15M - $50M", focus: "Market expansion, team growth" },
    { stage: "Series C+", amount: "$50M+", focus: "Major expansion, acquisitions, IPO prep" },
  ];

  const glossaryTerms = [
    { term: "Cap Table", definition: "Capitalization table showing who owns what percentage of your company" },
    { term: "Dilution", definition: "Reduction in ownership percentage when new shares are issued" },
    { term: "Valuation", definition: "The estimated worth of your company (pre-money or post-money)" },
    { term: "Term Sheet", definition: "Document outlining key terms of an investment deal" },
    { term: "Liquidation Preference", definition: "Order in which investors get paid if company is sold" },
    { term: "Runway", definition: "How long your current capital will last at current burn rate" },
    { term: "Burn Rate", definition: "How much money you're spending per month" },
    { term: "Equity", definition: "Ownership stake in a company" },
    { term: "Convertible Note", definition: "Short-term debt that converts to equity in future funding round" },
    { term: "SAFE", definition: "Simple Agreement for Future Equity - alternative to convertible notes" },
  ];

  return (
    <GuideLayout
      title="How Startup Funding Works"
      description="Understand the funding landscape, from bootstrapping to venture capital. Learn how to choose the right path for your startup."
      breadcrumbs={[{ name: "Funding Works Guide", url: "/insighta/funding-works" }]}
      seoKeywords="startup funding, venture capital, angel investors, equity funding, grants, crowdfunding"
    >
      <GuideSection id="overview" title="Overview of Startup Funding Types" icon={TrendingUp}>
        <p className="mb-6">
          There's no one-size-fits-all approach to funding. Here are the main options:
        </p>
        <div className="space-y-6">
          {fundingTypes.map((funding, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{funding.type}</CardTitle>
                <CardDescription>{funding.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Pros</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      {funding.pros.map((pro, i) => (
                        <li key={i}>{pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">❌ Cons</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      {funding.cons.map((con, i) => (
                        <li key={i}>{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="text-sm">
                    <strong>Best for:</strong> {funding.bestFor}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="how-vc-works" title="How Venture Capital Works" icon={Building}>
        <p className="mb-6">
          Venture Capital (VC) is a form of private equity financing provided by firms to startups 
          with high growth potential. Here's what you need to know:
        </p>

        <h3 className="text-xl font-semibold mb-4">Funding Stages & Amounts</h3>
        <div className="space-y-3 mb-8">
          {fundingStages.map((stage, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{stage.stage}</CardTitle>
                    <CardDescription>{stage.focus}</CardDescription>
                  </div>
                  <span className="text-primary font-bold text-lg">{stage.amount}</span>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <h3 className="text-xl font-semibold mb-4">What VCs Look For</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Large market opportunity:</strong> Usually $1B+ addressable market</li>
          <li><strong>Strong founding team:</strong> Domain expertise and ability to execute</li>
          <li><strong>Traction:</strong> Evidence of product-market fit and growth</li>
          <li><strong>Defensibility:</strong> Competitive moats (network effects, proprietary tech, etc.)</li>
          <li><strong>10x return potential:</strong> VCs need outliers to return their fund</li>
        </ul>

        <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 my-6">
          <p className="text-sm">
            <strong>💡 Key Insight:</strong> VCs invest in 1-2% of companies they review. 
            They expect most investments to fail, but need a few to return 100x to make the fund work.
          </p>
        </div>
      </GuideSection>

      <GuideSection id="angels-vs-vcs" title="Angel Investors vs VCs" icon={Users}>
        <Tabs defaultValue="angels" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="angels">Angel Investors</TabsTrigger>
            <TabsTrigger value="vcs">Venture Capitalists</TabsTrigger>
          </TabsList>
          <TabsContent value="angels" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Who They Are</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Wealthy individuals investing their own money, often successful entrepreneurs 
                  who want to support the next generation.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Investment Size</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Typically $25K - $500K per investor (angels often syndicate together)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Best Approach</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Warm introductions through mutual connections</li>
                  <li>Angel networks and platforms (AngelList, Gust)</li>
                  <li>Emphasize personal passion and vision</li>
                  <li>Show how their expertise can help</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="vcs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Who They Are</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Professional investors managing funds from limited partners (LPs) like pension funds, 
                  endowments, and wealthy individuals.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Investment Size</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Typically $500K+ (seed) to $50M+ (late stage)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Best Approach</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Research their portfolio and thesis</li>
                  <li>Get warm introduction from portfolio company</li>
                  <li>Lead with traction and market size</li>
                  <li>Demonstrate you're building a billion-dollar company</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </GuideSection>

      <GuideSection id="non-dilutive" title="Non-Dilutive Funding Options" icon={Gift}>
        <p className="mb-6">
          Keep 100% ownership while getting capital:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Grants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">Government and foundation funding for specific missions</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>SBIR/STTR grants (US government)</li>
                <li>Foundation grants for social impact</li>
                <li>Industry-specific grants</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Competitions & Accelerators</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">Win funding through pitch competitions</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Startup pitch competitions ($10K-$100K+)</li>
                <li>Accelerator programs (often include stipend)</li>
                <li>Innovation challenges</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revenue-Based Financing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">Repay investors with percentage of revenue</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>No equity dilution</li>
                <li>Best for businesses with revenue</li>
                <li>Flexible repayment tied to performance</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Crowdfunding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">Raise from customers/supporters online</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Kickstarter/Indiegogo for products</li>
                <li>Patreon for recurring support</li>
                <li>Validate demand before building</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </GuideSection>

      <GuideSection id="timeline" title="Typical Funding Timeline" icon={Clock}>
        <p className="mb-6">
          Here's what to expect when raising venture capital:
        </p>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-24 text-sm font-semibold text-primary">
              Weeks 1-4
            </div>
            <div>
              <h4 className="font-semibold mb-1">Preparation</h4>
              <p className="text-sm text-muted-foreground">
                Build pitch deck, financial model, data room. Research and target investors.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-24 text-sm font-semibold text-primary">
              Weeks 5-8
            </div>
            <div>
              <h4 className="font-semibold mb-1">Outreach & First Meetings</h4>
              <p className="text-sm text-muted-foreground">
                Send intros, take initial calls, refine pitch based on feedback.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-24 text-sm font-semibold text-primary">
              Weeks 9-12
            </div>
            <div>
              <h4 className="font-semibold mb-1">Partner Meetings & Due Diligence</h4>
              <p className="text-sm text-muted-foreground">
                Present to full partnership, answer deep questions, reference checks.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-24 text-sm font-semibold text-primary">
              Weeks 13-16
            </div>
            <div>
              <h4 className="font-semibold mb-1">Term Sheet & Negotiations</h4>
              <p className="text-sm text-muted-foreground">
                Receive and negotiate term sheet, agree on valuation and terms.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-24 text-sm font-semibold text-primary">
              Weeks 17-20
            </div>
            <div>
              <h4 className="font-semibold mb-1">Legal & Closing</h4>
              <p className="text-sm text-muted-foreground">
                Legal documentation, final due diligence, wire transfer.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-muted p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>⏰ Reality Check:</strong> Most fundraises take 3-6 months from start to finish. 
            Plan accordingly and don't let it distract from building your business.
          </p>
        </div>
      </GuideSection>

      <GuideSection id="glossary" title="Fundraising Terms Glossary" icon={BookOpen}>
        <div className="grid md:grid-cols-2 gap-4">
          {glossaryTerms.map((item, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{item.term}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.definition}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </GuideSection>
    </GuideLayout>
  );
};

export default FundingWorksGuide;
