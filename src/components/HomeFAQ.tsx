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
      answer: "Think of us as your AI powered startup support system. We help founders, indie hackers, and builders go from a rough idea to a real startup without needing to stitch together ten different tools on their own.\n\nOur moat is not just writing business plans. It is helping you build your startup from scratch through the Startup Development Cycle: clarify the problem, validate demand, define your ideal customer, shape the offer, choose the right stack, build the MVP, and keep moving with focus. You get AI guidance, practical tools, mentors, co-founders, and fundraising support in one place."
    },
    {
      question: "How does the Startup Development Cycle work?",
      answer: "The Startup Development Cycle is our step by step way of helping you build from zero instead of getting stuck in random advice.\n\nYou start by clarifying the problem, customer, and offer. Then you pressure test the idea using tools like ICP Builder and PMF Lab. From there, BizMap AI helps you make the practical decisions that matter next: your MVP scope, launch priorities, messaging, and execution plan. Tech Stack Builder helps with tool choices, while Focus Funnel and Core Metrics help you stay accountable once you're building.\n\nThe point is momentum. Every stage is designed to move you one step closer to a real startup people want, not just a document that looks impressive."
    },
    {
      question: "I don't have a clear business idea yet. Can this platform still help me?",
      answer: "100%. This is actually one of the best places to start when you're still figuring things out.\n\nYou can use the Prompt Library to explore business directions, talk things through with BizMap AI, and quickly pressure test rough concepts before you waste months building the wrong thing. It is designed to turn fuzzy thinking into concrete next steps.\n\nYou can also browse Founder Stories, connect with mentors, and learn from what other builders are actually doing. The platform meets you where you are, whether that's 'I have a vague idea' or 'I'm ready to launch.'"
    },
    {
      question: "Is Creatives Takeover only for tech startups?",
      answer: "No. We built this for founders, indie hackers, and creative builders in general, not just traditional venture backed startups.\n\nFreelancers, creators, consultants, educators, SaaS founders, service businesses, marketplace ideas, niche products, local businesses, and solo internet businesses can all use the platform.\n\nIf you are trying to build something real from scratch and want practical support instead of corporate jargon, you are exactly who this is for."
    },
    {
      question: "Is my business idea safe?",
      answer: "Yes. Your workspace is private by default, and we take idea confidentiality seriously.\n\nYour data is protected with secure infrastructure, encryption, and access controls. We do not sell your idea, share it with other founders, or expose your private startup work unless you choose to share something yourself. We also do not use your private startup data as public showcase material for other users.\n\nAnd to calm the bigger fear: startups are rarely won because someone heard an idea. They are won through execution, customer understanding, speed, and consistency. Our job is to help you move faster while keeping your work private."
    },
    {
      question: "How can I discover investors and funding opportunities?",
      answer: "Insighta is your fundraising toolkit with multiple tools.\n\nVC Search lets you browse and filter venture capitalists by industry, stage, location, and check size. Rookie can browse only, Starter can open 2 profiles per billing cycle, Rising gets 5, and Pro is unlimited.\n\nAccelerator Hunt follows the same model: Rookie browse only, Starter gets 2 profiles, Rising gets 5, and Pro is unlimited. Pair those with the Pitch Deck Analyzer and Email Templates so your outreach is sharper and more targeted."
    },
    {
      question: "What kind of community can I expect on the platform?",
      answer: "Our community is built around practical support, not passive scrolling.\n\nYou can find mentors, look for co-founders, read Founder Stories, and connect with investors through Find your Angel. The goal is to give founders real people around them while they build.\n\nThe vibe is collaboration over competition. You are not expected to figure everything out alone."
    },
    {
      question: "What tools help me validate my startup idea?",
      answer: "ICP Builder helps you define exactly who you are building for and what pain points matter most. PMF Lab helps you pressure test whether the market actually wants what you are making. BizMap AI helps you challenge your assumptions through conversation and turn research into action.\n\nTogether, these tools help you move from 'this sounds interesting' to 'there is real evidence worth building on.'"
    },
    {
      question: "Who is behind Creatives Takeover and why should I trust the service?",
      answer: "We're a small team of founders, builders, and growth people who genuinely care about helping others launch what matters.\n\nJavier Pena (Founder and CEO) started this because he wanted to give ambitious builders a realistic path from idea to execution. Domagoj Markota (Fractional CTO) brings the technical and AI depth needed to make the platform genuinely useful. Daniela Hagg (Growth Associate) focuses on helping startups grow with clear priorities and better distribution.\n\nWe're Creatives Takeover Ltd, a company registered in England and Wales (Company No. 16741912). Our mission is simple: help people build startups from scratch with practical AI support, useful tools, and a founder-first ecosystem.\n\nGot questions? Hit up javier@creatives-takeover.com or admin@creatives-takeover.com anytime."
    },
    {
      question: "How much does it cost and what do I get?",
      answer: "Rookie is free forever with 25 credits per month. It is built for idea clarity and first traction: ICP Builder is free, Insighta Test and Newspaper are included, community browsing stays open, and you get 1 discovery call plus 1 co-founder post per billing cycle.\n\nStarter is $9/month or $79/year with 50 credits per month. It unlocks credit-based Waitlist Maker and PMF Lab, gives you 2 discovery calls, 2 co-founder posts, 2 VC profiles, 2 accelerator profiles, full Email Templates access, and Prompt Library access for free models only.\n\nRising is $29/month or $239/year with 100 credits per month. It unlocks the full toolset, full email templates, pitch deck analyzer, and 5 VC plus 5 accelerator profiles per cycle. Most tools are included without per-use charges, but MVP Builder and GTM Strategist still consume credits.\n\nPro is $65/month or $589/year with 300 credits per month. It adds unlimited discovery calls, unlimited VC and accelerator profile views, Angels community access, group office hours, and priority support. Extra credit packs remain available on any plan."
    }
  ];

  return (
    <section className="relative py-20 lg:py-28">

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-space-grotesk text-3xl sm:text-4xl md:text-5xl font-semibold mb-4 sm:mb-6 text-foreground">
            FAQs
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Everything you need to know about Creatives Takeover.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 lg:p-8 shadow-sm">
            <Accordion type="single" collapsible className="space-y-0">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-b border-border/40 px-4 sm:px-6 last:border-b-0"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base md:text-lg font-semibold py-5 lg:py-6 tracking-tight">
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
