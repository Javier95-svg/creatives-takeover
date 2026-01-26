import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const HomeFAQ = () => {
  const faqs = [
    {
      question: "What is Creatives Takeover?",
      answer: "Creatives Takeover is an AI-powered startup platform designed to help first-time founders and creative entrepreneurs turn ideas into real, launchable businesses. Instead of overwhelming you with complex frameworks, we guide you through a focused process using tools like BizMap AI (your AI co-founder), PMF Lab (product-market fit analysis), Pitch Deck Analyzer, VC Search (investor discovery), and Focus Funnel (goal management).\n\nWhether you're validating a side project, building your first startup, or turning a creative skill into a scalable business, our platform gives you the structure, AI assistance, and community support to move from scattered ideas to a clear execution plan."
    },
    {
      question: "How does BizMap AI help me build a business plan?",
      answer: "BizMap AI is your conversational AI co-founder that guides you through business planning step by step. It covers Overview, Market Analysis, Problem Definition, Solution Design, Go-to-Market Channels, Pricing Strategy, and Goals—all through natural conversation.\n\nUnlike template-based tools, BizMap AI remembers your context across sessions, adapts to your specific startup, and asks the right questions at the right time. You'll receive actionable insights, viability assessments, and professional PDF exports for investors. Each message costs just 1 credit, making it efficient for ongoing strategic planning.\n\nIt's designed for founders who think in conversations, not spreadsheets."
    },
    {
      question: "I don't have a clear business idea yet. Can this platform still help me?",
      answer: "Absolutely! This is actually the perfect place to start.\n\nUse our Prompt Library with curated AI prompts for market research, competitor analysis, and idea generation. Chat with BizMap AI to explore fuzzy concepts through natural conversation—it helps you organize scattered thoughts into coherent directions.\n\nBrowse Founder Stories from other entrepreneurs to see real journeys that might inspire your path. Use PMF Lab frameworks to validate concepts before investing time. The platform meets you wherever you are in your journey, from \"I have a vague idea\" to \"I'm ready to launch.\""
    },
    {
      question: "Is Creatives Takeover only for tech startups?",
      answer: "Not at all. We're built specifically for creative-first entrepreneurs, not corporate playbooks.\n\nWhether you're a freelance designer, content creator, service consultant, indie maker, coach, or any creative professional looking to build a sustainable business, our tools and language reflect your reality. We focus on practical execution over theoretical frameworks.\n\nIf you're building something with passion and want clear guidance without the VC-speak, you're in the right place."
    },
    {
      question: "How can I discover investors that fit my startup?",
      answer: "VC Search helps you discover and research venture capital firms and angel investors relevant to your startup. You can filter by industry, investment stage, location, check size, and investment thesis to build a targeted outreach list.\n\nRookie (Free) users can view 5 VC profiles per month, Rising users get 25 views per month, and Pro users have unlimited access. Each profile includes key information to help you determine fit before reaching out.\n\nCombine this with our Pitch Deck Analyzer (8 credits) to refine your deck before investor meetings, and Cold Email Generator (3 credits) to craft personalized outreach messages."
    },
    {
      question: "What kind of community can I expect on the platform?",
      answer: "Founder Stories is our community space where entrepreneurs share genuine wins, real challenges, and honest advice without corporate fakeness.\n\nYou can read and learn from other founders' journeys, share your own progress and get feedback, connect with like-minded entrepreneurs through comments and discussions, and join our Telegram community for real-time conversations.\n\nPro members get featured profiles for increased visibility. The culture is collaboration over competition—we celebrate others' wins because we know there's room for everyone to succeed."
    },
    {
      question: "Are my business plans and data private and secure?",
      answer: "Absolutely. Your privacy and security are our top priorities.\n\nWe use Supabase-powered infrastructure with Row Level Security, ensuring your data is encrypted and isolated. Your workspace is private by default—you control what gets shared. All conversations with BizMap AI and generated content belong solely to you.\n\nWe comply with GDPR and UK data protection standards, never sell your data, and never use your business plans to train AI models. Your ideas remain yours, always."
    },
    {
      question: "What tools help me validate my startup idea?",
      answer: "We offer several validation tools:\n\nPMF Lab (Product-Market Fit Lab) provides frameworks and AI-powered analysis to assess whether you're building something customers actually want. Free users get read-only access; paid users can run full analyses (8 credits).\n\nInsighta Test analyzes your landing page and value proposition, identifying unclear messaging and optimization opportunities (5 credits per test).\n\nBizMap AI helps you stress-test your assumptions through conversation, asking critical questions about your market, competition, and business model."
    },
    {
      question: "Who is behind Creatives Takeover and why should I trust the service?",
      answer: "Creatives Takeover Ltd is a UK-registered company (Company Number: 15827341) founded by passionate entrepreneurs who understand the challenges of building something from scratch.\n\nWe're committed to transparency and building in public. You can follow our journey on LinkedIn, join our Telegram community, and read real founder stories on the platform. We're deeply invested in your success—when you win, we win.\n\nQuestions? Reach out directly to javier@creatives-takeover.com or admin@creatives-takeover.com."
    },
    {
      question: "How much does it cost and what do I get?",
      answer: "Our Rookie plan is free forever with 25 credits per month. You get BizMap AI access, read-only PMF Lab, 5 VC profile views monthly, basic Insighta Test, Prompt Library viewing, Focus Funnel for goal management, and community access.\n\nRising ($32.99/month or $300/year) includes 50 credits, full feature access, Pitch Deck Analyzer, 25 VC views monthly, and priority support.\n\nPro ($74.99/month or $750/year) gives you 150 credits, unlimited VC searches, advanced analytics, custom email templates, featured community profile, and 24-hour priority support.\n\nCredits power AI features: BizMap AI chat (1 credit), analyses like PMF and Pitch Deck (8 credits), Tech Stack Generation (3 credits). Start free today—no credit card required."
    }
  ];

  return (
    <section className="relative py-20 lg:py-28 font-poppins">

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-space-grotesk text-3xl sm:text-4xl md:text-5xl font-semibold mb-4 sm:mb-6 text-primary">
            FAQ
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Everything you need to know about Creatives Takeover, the all-in-one platform that uses AI, automation, and community support to help you plan, build, and grow your business from idea to execution.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 lg:p-8 shadow-sm">
            <Accordion type="single" collapsible className="space-y-0">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border-b border-border/70 px-4 sm:px-6 last:border-b-0"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base md:text-lg font-semibold py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-2">
                    {faq.answer.split('\n\n').filter(para => para.trim()).map((paragraph, idx) => (
                      <p key={idx} className="mb-3 last:mb-0">
                        {paragraph.trim()}
                      </p>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HomeFAQ;
