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
      answer: "Think of us as your AI powered startup buddy. We help first time founders and creative entrepreneurs turn their ideas into real, launchable businesses without all the corporate jargon and complex frameworks.\n\nYou get tools like BizMap AI (basically your AI co-founder), PMF Lab for figuring out if people actually want what you're building, a Pitch Deck Analyzer, VC Search to find the right investors, and Focus Funnel to keep your goals on track. Whether you're testing a side project or going all in on your first startup, we've got you covered."
    },
    {
      question: "How does BizMap AI help me build a business plan?",
      answer: "BizMap AI is like chatting with a smart co-founder who actually listens. It walks you through your business plan step by step: your overview, market, the problem you're solving, your solution, how you'll reach customers, pricing, and goals. All through a natural conversation.\n\nThe cool part? It remembers what you talked about before and adapts to your specific startup. You get real insights, not generic advice. Plus you can export everything as a professional PDF for investors. Each message only costs 1 credit, so you can chat as much as you need without burning through your balance.\n\nIt's perfect if you think better through conversations than spreadsheets."
    },
    {
      question: "I don't have a clear business idea yet. Can this platform still help me?",
      answer: "100%! This is actually the best place to start when you're still figuring things out.\n\nHop into our Prompt Library for AI prompts that spark ideas, or just chat with BizMap AI about whatever's on your mind. It's great at taking fuzzy thoughts and helping you shape them into something concrete.\n\nYou can also browse Founder Stories to see how other entrepreneurs found their direction. Sometimes seeing someone else's journey is all you need to unlock your own. The platform meets you where you are, whether that's \"I have a vague idea\" or \"I'm ready to launch tomorrow.\""
    },
    {
      question: "Is Creatives Takeover only for tech startups?",
      answer: "Nope! We built this for creative people, not Silicon Valley types.\n\nFreelance designers, content creators, coaches, consultants, indie makers, Etsy sellers, you name it. If you're building something with passion and want clear guidance without the VC speak, you're exactly who we made this for.\n\nOur tools and language reflect the reality of creative entrepreneurs, not corporate playbooks. We focus on actually getting stuff done, not drowning you in theory."
    },
    {
      question: "How can I discover investors that fit my startup?",
      answer: "VC Search is your go-to for finding investors who actually make sense for your startup. You can filter by industry, stage, location, check size, and what they typically invest in.\n\nFree users can check out 5 VC profiles per month, Rising gives you 25, and Pro users get unlimited access. Each profile has the key info you need to figure out if they're worth reaching out to.\n\nPair this with our Pitch Deck Analyzer (8 credits) to polish your deck before meetings, and the Cold Email Generator (3 credits) to write outreach that doesn't sound robotic."
    },
    {
      question: "What kind of community can I expect on the platform?",
      answer: "Founder Stories is where entrepreneurs share their real wins, struggles, and advice. No corporate fluff, just honest conversations from people who get it.\n\nYou can read stories from other founders, share your own journey, get feedback, jump into discussions, or hang out in our Telegram for real time chats. Pro members get featured profiles so more people see you.\n\nThe vibe here is collaboration over competition. We genuinely celebrate when others win because there's room for everyone."
    },
    {
      question: "Are my business plans and data private and secure?",
      answer: "Totally. We take this seriously.\n\nYour data is encrypted and isolated using Supabase with Row Level Security. Your workspace is private by default and you decide what to share. Everything you create with BizMap AI belongs to you.\n\nWe follow GDPR and UK data protection rules, we never sell your data, and we never use your business plans to train AI models. Your ideas stay yours. Period."
    },
    {
      question: "What tools help me validate my startup idea?",
      answer: "We've got a few solid ones:\n\nPMF Lab helps you figure out if you're building something people actually want. Free users can explore the frameworks, paid users can run full analyses (8 credits).\n\nInsighta Test looks at your landing page and messaging to spot what's unclear or not working (5 credits per test).\n\nAnd BizMap AI is great for stress testing your assumptions through conversation. It asks the tough questions about your market, competition, and business model so you can find the gaps before they become problems."
    },
    {
      question: "Who is behind Creatives Takeover and why should I trust the service?",
      answer: "We're Creatives Takeover Ltd, a UK registered company (Company Number: 15827341) built by entrepreneurs who've been through the startup grind ourselves.\n\nWe're big on transparency and building in public. Follow us on LinkedIn, join the Telegram community, or read real founder stories on the platform. We're genuinely invested in seeing you succeed because when you win, we win too.\n\nGot questions? Hit up javier@creatives-takeover.com or admin@creatives-takeover.com anytime."
    },
    {
      question: "How much does it cost and what do I get?",
      answer: "Our Rookie plan is free forever with 25 credits per month. You get BizMap AI, read only PMF Lab, 5 VC profile views, basic Insighta Test, Prompt Library browsing, Focus Funnel, and community access. No credit card needed.\n\nRising is $32.99/month (or $300/year) and bumps you to 50 credits with full feature access, Pitch Deck Analyzer, 25 VC views, and priority support.\n\nPro at $74.99/month (or $750/year) gives you 150 credits, unlimited VC searches, advanced analytics, custom email templates, a featured community profile, and 24 hour priority support.\n\nCredits power the AI stuff: BizMap AI chat is 1 credit, big analyses like PMF and Pitch Deck are 8 credits, Tech Stack Generation is 3 credits. Start free and upgrade when you're ready."
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
