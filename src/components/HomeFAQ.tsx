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
      answer: "Creatives Takeover is a SaaS platform where founders and indie builders start and test their projects. It brings the tools for each stage into one workspace: defining your customer, testing demand, building a first version, planning your launch, measuring traction, and preparing to raise.\n\nAround the tools you also have Pulse, an assistant that reads your project, plus mentors, cofounders, service providers and investors. The Rookie plan is free; some tools use monthly credits."
    },
    {
      question: "How does the Startup Development Cycle work?",
      answer: "It splits the work of building a startup into seven stages: Identity, Prototyping, Validation, Building, Launch, Traction and Fundraising. Each stage has a clear goal and the tools for it, for example ICP Builder for Identity, PMF Lab for Validation, MVP Builder for Building, and GTM Strategist and Traction Engine for Launch and Traction.\n\nYou don't have to follow it in order. Start at the stage that matches where your project is; your dashboard keeps the tasks and progress for each one."
    },
    {
      question: "I don't have a clear business idea yet. Can this platform still help me?",
      answer: "Yes. You can start with a rough idea. Describe it in the box at the top of this page and ICP Builder gives you a first assessment of who it could serve, before you create an account.\n\nYou can also explore business directions in the Prompt Library, work through a first plan with BizMap AI, and read Founder Stories to see how others started."
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
      answer: "Insighta groups the fundraising tools.\n\nVC Search lets you browse and filter venture capital firms by industry, stage, location and check size. Every plan can browse; opening full profiles takes a paid plan: 5 a month on Starter, 10 on Rising, unlimited on Pro. Accelerator Hunt works the same way.\n\nPitch Deck Analyzer and Insighta Test help you prepare before you reach out, and Find Your Angel, on Pro, connects you with angel investors. We can't promise investment; these tools help you find the right people and prepare for the conversation."
    },
    {
      question: "Will I be working on my own?",
      answer: "No. Besides the tools, the platform connects you with people: mentors you can book for focused advice, a cofounder marketplace, service providers for sales, marketing, operations and tech support, and Rooms and Launchpad to work next to other founders. On Pro, Find Your Angel connects you with angel investors.\n\nYour Founder ID gives you a public page to share your progress with all of them."
    },
    {
      question: "What tools help me validate my startup idea?",
      answer: "ICP Builder helps you define exactly who you are building for and what pain points matter most. PMF Lab helps you pressure test whether the market actually wants what you are making. BizMap AI helps you challenge your assumptions through conversation and turn research into action.\n\nTogether, these tools help you move from 'this sounds interesting' to 'there is real evidence worth building on.'"
    },
    {
      question: "Who is behind Creatives Takeover and why should I trust the service?",
      answer: "We're a small team of founders, builders, and growth people who genuinely care about helping others launch what matters.\n\nJavier Alonso (Founder and CEO) started this because he wanted to give ambitious builders a realistic path from idea to execution. Domagoj Markota (Fractional CTO) brings the technical and AI depth needed to make the platform genuinely useful. Daniela Hägg (Growth Associate) focuses on helping startups grow with clear priorities and better distribution.\n\nWe're Creatives Takeover Ltd, a company registered in England and Wales (Company No. 16741912). Our mission is simple: help people build startups from scratch with practical AI support, useful tools, and a founder-first ecosystem.\n\nGot questions? Hit up javier@creatives-takeover.com or admin@creatives-takeover.com anytime."
    },
    {
      question: "How much does it cost and what do I get?",
      answer: "Rookie is free forever with 50 credits per month, standard AI models, 3 directory visits, and investor and accelerator browsing.\n\nStarter is $9/month or $79/year with 100 credits per month. It adds the PROVE workspace, Email Templates, 5 VC profiles, 5 accelerator profiles, and 10 directory visits a month.\n\nRising is $29/month or $239/year with 250 credits per month. It adds advanced MVP models, the complete First Customer Proof workflow, full Prompt Library and exports, and expanded research quotas.\n\nPro is $65/month or $589/year with 600 credits per month. It adds Find Your Angel and unlimited VC profiles, accelerator profiles, and directory visits. Core founder tools are available across plans and use credits where noted. Mentor marketplace access is also shared; mentor services are priced and paid separately."
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
