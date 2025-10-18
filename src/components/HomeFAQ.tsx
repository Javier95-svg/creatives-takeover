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
      answer: "Creatives Takeover Ltd is a UK-registered company dedicated exclusively to helping creators and entrepreneurs succeed. We regularly publish updates, educational content and real-founder stories to maintain transparency and build our community reputation. For more info, we suggest to visit our social media accounts (check footer section)."
    },
    {
      question: "How much does it cost and what happens next?",
      answer: "You can sign up and begin exploring the platform for free. As your planning and growth needs evolve, premium features may become available. Pricing is clearly communicated, and you decide when to upgrade. We believe you should first experience value before committing."
    }
  ];

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background">
      {/* Modern Geometric Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Subtle Mesh Grid */}
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 2px 2px, hsl(var(--primary) / 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }} />
        </div>

        {/* Animated Gradient Orbs */}
        <div className="absolute top-20 left-[15%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-20 right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-secondary/15 via-primary/8 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-accent/12 to-transparent blur-2xl" style={{ animation: 'spin 20s linear infinite' }} />

        {/* Floating Geometric Shapes */}
        <div className="absolute top-[15%] left-[8%]">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 border-2 border-primary/20 rounded-lg" style={{ 
              animation: 'spin 15s linear infinite',
              transformOrigin: 'center'
            }} />
            <div className="absolute inset-4 border-2 border-accent/15 rounded-lg" style={{ 
              animation: 'spin 12s linear infinite reverse',
              transformOrigin: 'center'
            }} />
            <div className="absolute inset-8 border-2 border-secondary/12 rounded-lg" style={{ 
              animation: 'spin 18s linear infinite',
              transformOrigin: 'center'
            }} />
          </div>
        </div>

        <div className="absolute top-[60%] right-[12%]">
          <div className="relative w-28 h-28">
            <div className="absolute inset-0 rounded-full border-2 border-primary/15" style={{ 
              animation: 'scale-in 6s ease-in-out infinite alternate'
            }} />
            <div className="absolute inset-3 rounded-full border-2 border-accent/12" style={{ 
              animation: 'scale-in 8s ease-in-out infinite alternate',
              animationDelay: '1s'
            }} />
            <div className="absolute inset-6 rounded-full border-2 border-secondary/10" style={{ 
              animation: 'scale-in 7s ease-in-out infinite alternate',
              animationDelay: '2s'
            }} />
          </div>
        </div>

        <div className="absolute bottom-[25%] left-[18%]">
          <div className="relative w-24 h-24" style={{ animation: 'float 12s ease-in-out infinite' }}>
            <div className="absolute inset-0" style={{
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.08))',
              animation: 'spin 20s linear infinite'
            }} />
          </div>
        </div>

        {/* Animated Connection Lines Network */}
        <svg className="absolute inset-0 w-full h-full opacity-20" style={{ pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="faqGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.6 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="faqGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.5 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          
          {/* Animated paths */}
          <path d="M 10% 20% Q 30% 40%, 50% 35%" stroke="url(#faqGrad1)" strokeWidth="2" fill="none">
            <animate attributeName="d" 
              values="M 10% 20% Q 30% 40%, 50% 35%; M 10% 25% Q 35% 38%, 50% 40%; M 10% 20% Q 30% 40%, 50% 35%"
              dur="15s" repeatCount="indefinite" />
          </path>
          <path d="M 90% 30% Q 70% 50%, 50% 45%" stroke="url(#faqGrad2)" strokeWidth="2" fill="none">
            <animate attributeName="d" 
              values="M 90% 30% Q 70% 50%, 50% 45%; M 90% 35% Q 65% 48%, 50% 50%; M 90% 30% Q 70% 50%, 50% 45%"
              dur="18s" repeatCount="indefinite" />
          </path>
          <path d="M 20% 80% Q 40% 60%, 60% 65%" stroke="url(#faqGrad1)" strokeWidth="2" fill="none">
            <animate attributeName="d" 
              values="M 20% 80% Q 40% 60%, 60% 65%; M 20% 75% Q 45% 58%, 60% 70%; M 20% 80% Q 40% 60%, 60% 65%"
              dur="20s" repeatCount="indefinite" />
          </path>
          <path d="M 80% 70% Q 60% 60%, 50% 55%" stroke="url(#faqGrad2)" strokeWidth="2" fill="none">
            <animate attributeName="d" 
              values="M 80% 70% Q 60% 60%, 50% 55%; M 80% 75% Q 55% 58%, 50% 60%; M 80% 70% Q 60% 60%, 50% 55%"
              dur="16s" repeatCount="indefinite" />
          </path>
        </svg>

        {/* Pulsing Node Points */}
        {[
          { top: '18%', left: '12%', delay: '0s' },
          { top: '28%', right: '15%', delay: '1s' },
          { top: '45%', left: '20%', delay: '2s' },
          { top: '55%', right: '22%', delay: '1.5s' },
          { bottom: '25%', left: '25%', delay: '0.5s' },
          { bottom: '35%', right: '18%', delay: '2.5s' },
          { top: '38%', left: '8%', delay: '1.8s' },
          { top: '72%', right: '12%', delay: '0.8s' }
        ].map((pos, i) => (
          <div key={`node-${i}`} className="absolute" style={pos}>
            <div className="relative w-3 h-3">
              <div className="absolute inset-0 bg-primary/40 rounded-full" style={{
                animation: 'pulse 3s ease-in-out infinite',
                animationDelay: pos.delay
              }} />
              <div className="absolute inset-0 bg-primary/60 rounded-full animate-ping" style={{
                animationDelay: pos.delay,
                animationDuration: '3s'
              }} />
            </div>
          </div>
        ))}

        {/* Flowing Particles */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute w-1 h-1 bg-accent/50 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${8 + Math.random() * 6}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
                opacity: 0.3 + Math.random() * 0.3
              }}
            />
          ))}
        </div>

        {/* Diagonal Light Streaks */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/25 to-transparent" style={{
          animation: 'slide-in-right 12s ease-in-out infinite',
          transformOrigin: 'left'
        }} />
        <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-accent/20 to-transparent" style={{
          animation: 'slide-in-right 15s ease-in-out infinite',
          animationDelay: '4s',
          transformOrigin: 'right'
        }} />

        {/* Corner Accent Frames */}
        <div className="absolute top-12 left-12 w-20 h-20">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/40 to-transparent" />
          <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-primary/40 to-transparent" />
        </div>
        <div className="absolute top-12 right-12 w-20 h-20">
          <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-accent/40 to-transparent" />
          <div className="absolute top-0 right-0 w-0.5 h-full bg-gradient-to-b from-accent/40 to-transparent" />
        </div>
        <div className="absolute bottom-12 left-12 w-20 h-20">
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-secondary/40 to-transparent" />
          <div className="absolute bottom-0 left-0 w-0.5 h-full bg-gradient-to-t from-secondary/40 to-transparent" />
        </div>
        <div className="absolute bottom-12 right-12 w-20 h-20">
          <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-l from-primary/40 to-transparent" />
          <div className="absolute bottom-0 right-0 w-0.5 h-full bg-gradient-to-t from-primary/40 to-transparent" />
        </div>

        {/* Morphing Blob Shapes */}
        <div className="absolute top-1/4 right-1/4 w-32 h-32 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent blur-2xl" style={{
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            animation: 'morph 10s ease-in-out infinite'
          }} />
        </div>
        <div className="absolute bottom-1/3 left-1/3 w-40 h-40 opacity-15">
          <div className="absolute inset-0 bg-gradient-to-tr from-accent to-secondary blur-2xl" style={{
            borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%',
            animation: 'morph 12s ease-in-out infinite',
            animationDelay: '2s'
          }} />
        </div>
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
                href="mailto:admin@creatives-takeover.com"
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
