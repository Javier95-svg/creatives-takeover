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
      {/* Enhanced Tech Background Effects */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Tech Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
              linear-gradient(0deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
              linear-gradient(45deg, hsl(var(--accent) / 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px, 80px 80px, 40px 40px'
          }} />
        </div>

        {/* Floating Hexagons */}
        <div className="absolute top-20 left-[10%]">
          {[...Array(4)].map((_, i) => (
            <div key={`hex-tl-${i}`} className="absolute w-16 h-16" style={{ 
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              border: '1px solid',
              borderColor: `hsl(var(--primary) / ${0.25 - i * 0.06})`,
              transform: `scale(${1 + i * 0.2}) rotate(${i * 20}deg)`,
              animation: `spin ${15 - i * 2}s linear infinite ${i % 2 === 0 ? 'normal' : 'reverse'}`
            }} />
          ))}
        </div>

        <div className="absolute top-40 right-[15%]">
          {[...Array(3)].map((_, i) => (
            <div key={`hex-tr-${i}`} className="absolute w-20 h-20" style={{ 
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              border: '1px solid',
              borderColor: `hsl(var(--accent) / ${0.2 - i * 0.05})`,
              transform: `scale(${1 + i * 0.25}) rotate(${-i * 15}deg)`,
              animation: `spin ${18 - i * 3}s linear infinite reverse`
            }} />
          ))}
        </div>

        <div className="absolute bottom-32 left-[20%]">
          {[...Array(3)].map((_, i) => (
            <div key={`hex-bl-${i}`} className="absolute w-14 h-14" style={{ 
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              border: '1px solid',
              borderColor: `hsl(var(--secondary) / ${0.22 - i * 0.06})`,
              transform: `scale(${1 + i * 0.3}) rotate(${i * 25}deg)`,
              animation: `spin ${16 - i * 2}s linear infinite`
            }} />
          ))}
        </div>

        {/* Data Stream Particles */}
        <div className="absolute top-1/3 left-8">
          {[...Array(6)].map((_, i) => (
            <div key={`particle-l-${i}`} className="absolute w-1 h-1 bg-primary/40 rounded-full" style={{
              animation: `diagonal-float ${5 + i}s linear infinite`,
              animationDelay: `${i * 0.7}s`,
              left: `${i * 12}px`,
              top: `${i * -18}px`
            }} />
          ))}
        </div>

        <div className="absolute bottom-1/4 right-12">
          {[...Array(6)].map((_, i) => (
            <div key={`particle-r-${i}`} className="absolute w-1 h-1 bg-accent/40 rounded-full" style={{
              animation: `zigzag ${6 + i}s linear infinite`,
              animationDelay: `${i * 0.9}s`,
              right: `${i * 15}px`,
              bottom: `${i * -12}px`
            }} />
          ))}
        </div>

        {/* Scanning Lines */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-slide-down" style={{ animationDuration: '10s' }} />
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-accent/25 to-transparent animate-slide-down" style={{ animationDuration: '14s', animationDelay: '4s' }} />
        </div>

        {/* Tech Nodes */}
        {[
          { top: '15%', left: '12%' },
          { top: '25%', right: '18%' },
          { top: '45%', left: '8%' },
          { top: '65%', right: '25%' },
          { bottom: '20%', left: '30%' },
          { bottom: '35%', right: '15%' }
        ].map((pos, i) => (
          <div key={`node-${i}`} className="absolute w-1.5 h-1.5 bg-primary/50 rounded-full" style={{
            ...pos,
            animation: `pulse 2.5s ease-in-out infinite`,
            animationDelay: `${i * 0.6}s`
          }} />
        ))}

        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" style={{ pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="faqLineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.5 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="faqLineGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.4 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <line x1="12%" y1="15%" x2="18%" y2="25%" stroke="url(#faqLineGrad1)" strokeWidth="1.5" />
          <line x1="30%" y1="80%" x2="15%" y2="65%" stroke="url(#faqLineGrad2)" strokeWidth="1.5" />
          <line x1="82%" y1="25%" x2="75%" y2="65%" stroke="url(#faqLineGrad1)" strokeWidth="1.5" />
        </svg>

        {/* Rotating Angular Frames */}
        <div className="absolute top-1/4 right-1/4">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-l-2 border-t-2 border-primary/15" style={{ animation: 'scale-in 4s ease-in-out infinite alternate' }} />
            <div className="absolute inset-2 border-r-2 border-b-2 border-accent/12" style={{ animation: 'scale-in 5s ease-in-out infinite alternate', animationDelay: '1s' }} />
          </div>
        </div>

        <div className="absolute bottom-1/3 left-1/4 rotate-45">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-2 border-secondary/12" style={{ animation: 'scale-in 4.5s ease-in-out infinite alternate' }} />
            <div className="absolute inset-3 border border-primary/10" style={{ animation: 'scale-in 5.5s ease-in-out infinite alternate', animationDelay: '1.5s' }} />
          </div>
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-1/4 right-1/5 w-[400px] h-[400px] bg-gradient-radial from-primary/8 via-transparent to-transparent blur-3xl animate-drift" style={{ animationDuration: '18s' }} />
        <div className="absolute bottom-1/3 left-1/6 w-[450px] h-[450px] bg-gradient-radial from-accent/6 via-transparent to-transparent blur-3xl animate-drift" style={{ animationDuration: '22s', animationDelay: '4s', animationDirection: 'reverse' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-radial from-secondary/5 via-transparent to-transparent blur-2xl animate-float" style={{ animationDuration: '16s', animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
            FAQ
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Creatives Takeover, the all-in-one platform that uses AI, automation, and community support to help you plan, build, and grow your business from idea to execution.
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
