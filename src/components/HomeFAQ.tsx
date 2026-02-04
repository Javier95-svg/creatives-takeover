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
      answer: "Think of us as your AI powered startup buddy. We help first time founders and creative entrepreneurs turn their ideas into real, launchable businesses without all the corporate jargon and complex frameworks.\n\nYou get tools organized into three phases: Learn (ICP Builder, PMF Lab), Build (BizMap AI Chatbot, Tech Stack Builder), and Measure (Focus Funnel, Core Metrics). On the fundraising side, Insighta gives you VC Search, Accelerator Hunt, a Pitch Deck Analyzer, and Email Templates. Plus our Community features let you find mentors, co-founders, and connect with angel investors. Whether you're testing a side project or going all in on your first startup, we've got you covered."
    },
    {
      question: "How does BizMap AI help me build a business plan?",
      answer: "BizMap AI follows a lean startup framework organized into three phases: Learn, Build, and Measure.\n\nIn the Learn phase, ICP Builder (8 credits) helps you define your ideal customer profile with pain point analysis and positioning strategy, while PMF Lab (8 credits) validates whether people actually want what you're building with AI market analysis.\n\nIn the Build phase, the BizMap AI Chatbot (1 credit per message) acts like a smart co-founder you can chat with about any aspect of your startup. It remembers your previous conversations and adapts to your specific business. Tech Stack Builder (3 credits) helps you compare and select the right tools with budget calculators and framework recommendations.\n\nThe Measure phase includes Focus Funnel for goal tracking, Core Metrics for KPIs, and Weekly Missions to keep you on track. You can also export everything as a professional PDF for investors."
    },
    {
      question: "I don't have a clear business idea yet. Can this platform still help me?",
      answer: "100%! This is actually the best place to start when you're still figuring things out.\n\nHop into our Prompt Library with 60+ business cases across categories like AI & Automation, E-commerce, SaaS, Creator Economy, and more. Or just chat with BizMap AI about whatever's on your mind. It's great at taking fuzzy thoughts and helping you shape them into something concrete.\n\nYou can also browse Founder Stories to see how other entrepreneurs found their direction, or connect with a mentor through our Mentor Marketplace who can guide you through the early stages. The platform meets you where you are, whether that's \"I have a vague idea\" or \"I'm ready to launch tomorrow.\""
    },
    {
      question: "Is Creatives Takeover only for tech startups?",
      answer: "Nope! We built this for creative people, not Silicon Valley types.\n\nFreelance designers, content creators, coaches, consultants, indie makers, Etsy sellers, you name it. If you're building something with passion and want clear guidance without the VC speak, you're exactly who we made this for.\n\nOur tools and language reflect the reality of creative entrepreneurs, not corporate playbooks. We focus on actually getting stuff done, not drowning you in theory."
    },
    {
      question: "How can I discover investors and funding opportunities?",
      answer: "Insighta is your fundraising toolkit with multiple tools:\n\nVC Search lets you browse and filter venture capitalists by industry, stage, location, and check size. Free users get 5 profile views per month, Rising gets 25, and Pro users get unlimited access.\n\nAccelerator Hunt helps you find accelerator programs like Y Combinator, Techstars, Entrepreneur First, Antler, and Founder Institute. Each profile has detailed info on funding amounts, what they look for, and how to apply.\n\nPair these with the Pitch Deck Analyzer (8 credits) to polish your deck before meetings, and Email Templates (3 credits) to craft personalized outreach that doesn't sound robotic. Insighta Test also evaluates your overall fundraising readiness so you know where to improve."
    },
    {
      question: "What kind of community can I expect on the platform?",
      answer: "Our Community goes beyond just reading articles. You can find a mentor through our Mentor Marketplace, filtering by expertise and coaching format. Looking for a business partner? The Co-Founder Marketplace lets you browse profiles by industry, stage, and skills needed.\n\nFounder Stories is where entrepreneurs share their real wins, struggles, and advice. No corporate fluff, just honest conversations from people who get it. Find your Angel connects you directly with angel investors to showcase your product and build relationships.\n\nPro members get featured profiles so more people see you. The vibe here is collaboration over competition."
    },
    {
      question: "Are my business plans and data private and secure?",
      answer: "Totally. We take this seriously.\n\nYour data is encrypted and isolated using Supabase with Row Level Security. Your workspace is private by default and you decide what to share. Everything you create with BizMap AI belongs to you.\n\nWe follow GDPR and UK data protection rules, we never sell your data, and we never use your business plans to train AI models. Your ideas stay yours. Period."
    },
    {
      question: "What tools help me validate my startup idea?",
      answer: "We've got a few solid ones:\n\nICP Builder (8 credits) helps you define your ideal customer profile with pain point analysis so you know exactly who you're building for.\n\nPMF Lab (8 credits) helps you figure out if you're building something people actually want with AI powered market analysis and validation.\n\nInsighta Test evaluates your startup's fundraising readiness and identifies improvement gaps.\n\nAnd BizMap AI is great for stress testing your assumptions through conversation. It asks the tough questions about your market, competition, and business model so you can find the gaps before they become problems."
    },
    {
      question: "Who is behind Creatives Takeover and why should I trust the service?",
      answer: "We're a small team of founders, builders, and growth people who genuinely care about helping others launch what matters.\n\nJavier Peña (Founder & CEO) started this because he wanted to give visibility to ideas and connect founders with the tools they need. Domagoj Markota (Fractional CTO) brings deep tech and AI expertise to make sure everything actually works. Daniela Hägg (Growth Associate) focuses on helping startups scale efficiently.\n\nWe're Creatives Takeover Ltd, a UK registered company (Company Number: 15827341). Our mission is simple: empower anyone, anywhere, to launch their own startup by making AI tools accessible, affordable, and easy to use. We believe entrepreneurship shouldn't be limited by technical skills or resources.\n\nGot questions? Hit up javier@creatives-takeover.com or admin@creatives-takeover.com anytime."
    },
    {
      question: "How much does it cost and what do I get?",
      answer: "Our Rookie plan is free forever with 25 credits per month. You get BizMap AI, read only PMF Lab, 5 VC profile views, basic Insighta Test, Prompt Library browsing, Focus Funnel, and community access. No credit card needed.\n\nRising is $32.99/month (or $300/year) and bumps you to 50 credits with full feature access including ICP Builder, Pitch Deck Analyzer, Email Templates, 25 VC views, Mentor Marketplace, Co-Founder Marketplace, and priority support.\n\nPro at $74.99/month (or $750/year) gives you 150 credits, unlimited VC searches, advanced Pitch Deck Analyzer, custom email templates, a featured community profile, early access to new features, and 24 hour priority support.\n\nCredits power the AI stuff: BizMap AI chat is 1 credit, ICP Builder and PMF Lab are 8 credits each, Pitch Deck Analyzer is 8 credits, Tech Stack Builder and Email Templates are 3 credits. Start free and upgrade when you're ready."
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
            Everything you need to know about Creatives Takeover.
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
