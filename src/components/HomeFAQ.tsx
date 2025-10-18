import { ExternalLink, Mail } from "lucide-react";
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
      answer: "Creatives Takeover is a platform that combines AI-driven business planning, a rich prompt library, funding and incubator discovery, and a peer founder community so that creators, freelancers, indie hackers and entrepreneurs can go from idea to action all in one place."
    },
    {
      question: "How does BizMap AI help me build a business plan?",
      answer: "BizMap AI walks you through your idea by generating a detailed structure including problem definition, solution outline, target market, competitor landscape, go-to-market strategy and key financials. You then refine, iterate and personalise the plan using interactive prompts, turning your concept into a viable roadmap."
    },
    {
      question: "I don't have a clear business idea yet. Can this platform still help me?",
      answer: "Yes. Our Prompt Library gives you ready-to-use templates and inspiration to discover niches, generate new ideas or refine existing ones. Whether you're at the beginning or already have a draft, you'll gain clarity and direction."
    },
    {
      question: "Is Creatives Takeover only for tech startups?",
      answer: "No. While the tools are sophisticated, they are designed for makers, freelancers, creators and early founders in any field. Whether you're launching a service business, a product, software or a creative project, you'll find applicable support."
    },
    {
      question: "How can I discover funding or accelerators that fit my project?",
      answer: "In our Insighta tab you can explore an up-to-date directory of funding programmes, incubators and accelerators. The listings are tailored by business stage and focus, you can bookmark opportunities and receive notification reminders of upcoming deadlines."
    },
    {
      question: "What kind of community can I expect on the platform?",
      answer: "You'll find a friendly, engaged peer-to-peer community. Members share their entrepreneurial journey, post updates with text and images, ask for feedback, celebrate milestones and connect via profiles, messages and friend invites. It is designed for collaboration rather than competition."
    },
    {
      question: "Are my plans and data private and secure?",
      answer: "Yes. Your workspace, drafts and planning data are private unless you choose to share them. You control what you post in the community. We collect only essential account information, adhere to industry-standard security practices and clearly display our privacy and terms policies."
    },
    {
      question: "Can I export or share the business plan created with BizMap AI?",
      answer: "Yes. Once you've refined your plan you can download or share it in a format suitable for pitching to mentors, investors or collaborators. The goal is to make what you build here practical beyond the platform."
    },
    {
      question: "Who is behind Creatives Takeover and why should I trust the service?",
      answer: "Creatives Takeover Ltd is a UK-registered company dedicated exclusively to helping creators and entrepreneurs succeed. We regularly publish updates, educational content and real-founder stories to maintain transparency and build our community reputation. For more info, we suggest to visit our LinkedIn page: https://www.linkedin.com/company/creatives-takeover/"
    },
    {
      question: "How much does it cost and what happens next?",
      answer: "You can sign up and begin exploring the platform for free. As your planning and growth needs evolve, premium features may become available. Pricing is clearly communicated, and you decide when to upgrade. We believe you should first experience value before committing."
    }
  ];

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background">
      {/* Cosmic Background Effects */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Base starfield */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.3) 0px, transparent 50%),
                            radial-gradient(circle at 80% 80%, hsl(var(--accent) / 0.3) 0px, transparent 50%),
                            radial-gradient(circle at 40% 20%, hsl(var(--primary) / 0.2) 0px, transparent 50%)`
          }} />
        </div>

        {/* Animated floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Galaxy spiral effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-accent/20 rounded-full animate-[spin_20s_linear_infinite]" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Creatives Takeover and how we help you turn ideas into profitable businesses.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-sm bg-card/50 rounded-2xl border border-border/50 p-8 shadow-2xl animate-scale-in">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border border-border/50 rounded-lg px-6 bg-background/50 hover:bg-background/80 transition-all duration-300 hover:shadow-lg hover:border-primary/30"
                >
                  <AccordionTrigger className="text-left text-base md:text-lg font-semibold hover:text-primary transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Trust-Building Footer */}
        <div className="mt-16 text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="backdrop-blur-sm bg-card/30 border border-border/50 rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-6">
              We're here to help you succeed. Reach out to us directly or connect with us on LinkedIn.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="https://www.linkedin.com/company/creatives-takeover/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary/50"
              >
                <ExternalLink className="w-5 h-5" />
                Visit our LinkedIn
              </a>
              <a
                href="mailto:support@creativestakeover.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/90 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <Mail className="w-5 h-5" />
                Email Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeFAQ;
