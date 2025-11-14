import GuideLayout from "@/components/guides/GuideLayout";
import GuideSection from "@/components/guides/GuideSection";
import DownloadButton from "@/components/guides/DownloadButton";
import { FileText, Lightbulb, AlertCircle, Target, Users, TrendingUp } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PitchDeckGuide = () => {
  const essentialSlides = [
    { title: "Company/Introduction", description: "Who you are and what you do in one sentence" },
    { title: "Problem", description: "The pain point you're solving—make it relatable" },
    { title: "Solution", description: "Your product/service and how it solves the problem" },
    { title: "Market Opportunity", description: "Size of the market and growth potential" },
    { title: "Product/Demo", description: "Show your product in action or key features" },
    { title: "Traction", description: "Evidence of growth: users, revenue, partnerships" },
    { title: "Business Model", description: "How you make money" },
    { title: "Competition", description: "Who else is in the space and why you're different" },
    { title: "Team", description: "Key people and their relevant expertise" },
    { title: "Financials", description: "Revenue projections and key metrics" },
    { title: "The Ask", description: "How much you're raising and what it's for" },
  ];

  const commonMistakes = [
    { mistake: "Too much text", fix: "Use visuals and bullet points—not paragraphs" },
    { mistake: "No clear problem", fix: "Make the pain point obvious and relatable" },
    { mistake: "Weak market validation", fix: "Show real traction, not just assumptions" },
    { mistake: "Unclear ask", fix: "Be specific about funding amount and use of funds" },
    { mistake: "Generic design", fix: "Use consistent branding and professional design" },
    { mistake: "Too long", fix: "Keep it to 10-15 slides maximum" },
  ];

  return (
    <GuideLayout
      title="How to Create a Pitch Deck"
      description="Master the art of pitching with this comprehensive guide to creating a compelling pitch deck that gets investors excited."
      breadcrumbs={[{ name: "Pitch Deck Guide", url: "/insighta/pitch-deck" }]}
      seoKeywords="pitch deck, startup pitch, investor presentation, fundraising deck, pitch deck template"
    >
      <GuideSection id="why-it-matters" title="What is a Pitch Deck and Why It Matters" icon={FileText}>
        <p>
          A pitch deck is a visual presentation (typically 10-15 slides) that tells your startup's story 
          and convinces investors to fund you. It's your opportunity to demonstrate:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>The problem you're solving</strong> and why it matters</li>
          <li><strong>Your unique solution</strong> and competitive advantage</li>
          <li><strong>Market opportunity</strong> and growth potential</li>
          <li><strong>Traction</strong> proving people want what you're building</li>
          <li><strong>Your team's ability</strong> to execute the vision</li>
        </ul>
        <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 my-6">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            📊 <strong>Stat:</strong> Investors spend an average of 3 minutes and 44 seconds reviewing a pitch deck. 
            Make every slide count!
          </p>
        </div>
      </GuideSection>

      <GuideSection id="essential-slides" title="Essential Slides Breakdown" icon={Target}>
        <p className="mb-6">
          Here's what to include in each slide of your pitch deck:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {essentialSlides.map((slide, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-primary font-bold">#{index + 1}</span>
                  {slide.title}
                </CardTitle>
                <CardDescription>{slide.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="storytelling" title="Storytelling Tips & Narrative Flow" icon={Lightbulb}>
        <p>A great pitch deck tells a story, not just facts. Follow this narrative arc:</p>
        <ol className="list-decimal pl-6 space-y-3 my-4">
          <li>
            <strong>Hook with the problem:</strong> Start with a relatable pain point that makes investors 
            think "yes, I've experienced that!"
          </li>
          <li>
            <strong>Introduce your hero (solution):</strong> Show how your product elegantly solves the problem
          </li>
          <li>
            <strong>Prove it matters (market + traction):</strong> Demonstrate the size of the opportunity 
            and early validation
          </li>
          <li>
            <strong>Show you can win (team + strategy):</strong> Explain why you're uniquely positioned to succeed
          </li>
          <li>
            <strong>Make the ask:</strong> Clear, specific funding request with milestones
          </li>
        </ol>
        <div className="bg-muted p-4 rounded-lg my-6">
          <p className="text-sm">
            <strong>💡 Pro Tip:</strong> Use the "problem-solution" format. For example: 
            "73% of small businesses struggle with X (problem). Our platform does Y (solution), 
            resulting in Z improvement (benefit)."
          </p>
        </div>
      </GuideSection>

      <GuideSection id="mistakes" title="Common Pitch Deck Mistakes to Avoid" icon={AlertCircle}>
        <Accordion type="single" collapsible className="w-full">
          {commonMistakes.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                <span className="font-semibold">❌ {item.mistake}</span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-green-600 dark:text-green-400">
                  ✅ <strong>Fix:</strong> {item.fix}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </GuideSection>

      <GuideSection id="templates" title="Downloadable Templates & Resources" icon={FileText}>
        <p className="mb-6">
          Get started quickly with these professional pitch deck templates:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Slides Template</CardTitle>
              <CardDescription>
                Fully customizable template with all essential slides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DownloadButton 
                label="Open Template" 
                url="https://docs.google.com/presentation/d/1x9MYZJqFz7s3WqXVqLZ8JqX9MYZJqFz7s3WqXVqLZ8/edit"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>PowerPoint Template</CardTitle>
              <CardDescription>
                Download and edit in PowerPoint or Keynote
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DownloadButton 
                label="Download PPTX" 
                url="#"
                fileName="pitch-deck-template.pptx"
              />
            </CardContent>
          </Card>
        </div>
      </GuideSection>

      <GuideSection id="examples" title="Real-World Examples" icon={TrendingUp}>
        <p className="mb-4">
          Learn from successful pitch decks that raised millions:
        </p>
        <ul className="list-disc pl-6 space-y-3">
          <li>
            <strong>Airbnb:</strong> Simple, visual deck focused on the market gap and solution. 
            Raised $600K seed round.
          </li>
          <li>
            <strong>Uber:</strong> Clear problem statement (expensive, unreliable taxis) with 
            straightforward solution. Showed market size effectively.
          </li>
          <li>
            <strong>Buffer:</strong> Transparent, data-driven approach showing traction from day one. 
            Built trust through honesty.
          </li>
        </ul>
        <div className="bg-muted p-4 rounded-lg mt-6">
          <p className="text-sm">
            <strong>🔍 Where to find more examples:</strong> Search for "[Company] pitch deck" 
            on SlideShare or check out pitch deck galleries on sites like Pitchenvy.com
          </p>
        </div>
      </GuideSection>

      <GuideSection id="advanced-tips" title="Advanced Tips: Tailoring for Different Audiences" icon={Users}>
        <p className="mb-4">
          Customize your deck based on who you're pitching to:
        </p>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Early-Stage VCs</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Emphasize market size and growth potential</li>
                <li>Show strong founding team credentials</li>
                <li>Highlight unique insights or unfair advantages</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Angel Investors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Focus on the passion and vision</li>
                <li>Show early traction and customer validation</li>
                <li>Explain how their expertise can help</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Corporate Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>Highlight strategic fit and synergies</li>
                <li>Show how you complement their offerings</li>
                <li>Emphasize customer overlap and market access</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </GuideSection>
    </GuideLayout>
  );
};

export default PitchDeckGuide;
