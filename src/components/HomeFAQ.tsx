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
      answer: "Creatives Takeover is your AI co-founder for turning ideas into revenue in 30 days. We combine BizMap AI (conversational business planning that feels like talking to a mentor, not filling corporate templates), sprint-based accountability (daily check-ins, matched accountability partners, and real-time progress tracking), and a 15,000+ member community built on collaboration over competition. From scattered thoughts to your first dollar—we guide you through the actual journey, not just theory."
    },
    {
      question: "How does BizMap AI help me build a business plan?",
      answer: "BizMap AI is a 7-step conversational wizard that generates your business plan in 3 minutes: Overview → Market → Problem → Solution → Channels → Pricing → Goals. Unlike corporate jargon-filled templates, it feels like chatting with a co-founder who asks the right questions. You get a success score showing viability, automatic sprint integration to turn strategy into action, and professional PDF export. It's designed for creative minds who think in conversations, not spreadsheets."
    },
    {
      question: "I don't have a clear business idea yet. Can this platform still help me?",
      answer: "Perfect place to start! Use our Prompt Library with hundreds of idea-sparking templates, Creative Entrepreneur Templates for specific niches (freelancers, creators, service businesses, product startups), and the BizMap chatbot to explore fuzzy concepts through natural conversation. You can even start with voice notes or scattered thoughts—the AI organizes them into coherent directions. Plus, browse community stories from other founders to see real journeys that might inspire your path."
    },
    {
      question: "Is Creatives Takeover only for tech startups?",
      answer: "Not even close. We're built for creative-first intelligence, not corporate playbooks. Whether you're a freelance designer, indie game developer, service consultant, Etsy seller, content creator, coach, or any creative professional—our language and tools reflect your reality. We speak creativity, not VC-speak. If you're building something with passion (not just chasing unicorn status), you're in the right place."
    },
    {
      question: "How can I discover funding or accelerators that fit my project?",
      answer: "Insighta provides AI-powered market intelligence with real-time updates on funding opportunities, accelerators, grants, and competitions. Filter by business stage, focus area, and deadline. Bookmark programs you like, get deadline reminders, and see peer recommendations from the community. The database refreshes automatically so you never miss emerging opportunities. It's like having a research assistant scanning the funding landscape 24/7."
    },
    {
      question: "What kind of community can I expect on the platform?",
      answer: "A Reddit-style feed where founders share wins, challenges, and real advice—no corporate fakeness. Features include accountability partnership matching (get paired with someone in your niche), daily challenges with reputation points and badges, monthly Demo Days to showcase your progress, commitment tracking with gentle nudges if you miss check-ins, direct messaging, friend requests, and a culture of 'collaboration over competition.' We celebrate others' wins because we know there's room for everyone to succeed."
    },
    {
      question: "Are my plans and data private and secure?",
      answer: "Absolutely. We use Supabase-powered security with Row Level Security (RLS) policies ensuring your data is encrypted and isolated. You control exactly what gets shared to the community—your workspace is private by default. Share reports anonymously if you want feedback without revealing identity. All plans can be kept completely private or selectively shared. We comply with UK data protection standards and never sell your data. Your ideas are yours."
    },
    {
      question: "Can I export or share the business plan created with BizMap AI?",
      answer: "Yes! Export as a professionally-formatted PDF for investors or partners, share to the community feed as a post (with or without your name attached), integrate directly into sprint planning to turn strategy into tasks, create public 'shared reports' to gather feedback, or use in monthly Demo Day presentations. You own your work and can distribute it however you choose—from pitch decks to portfolio pieces."
    },
    {
      question: "Who is behind Creatives Takeover and why should I trust the service?",
      answer: "Creatives Takeover is a UK-registered company founded by passionate entrepreneurs who understand the challenges of building something from scratch. We're committed to transparency, innovation, and supporting the creative economy. Check our blog for real founder stories and educational resources, follow our active LinkedIn for company updates, and join our Discord to see the thriving community firsthand. We're building in public and genuinely invested in your success."
    },
    {
      question: "How much does it cost and what happens next?",
      answer: "New users get 5 free credits to test the platform. Credits are used for Launch Reports (BizMap AI business plans), sprint task generation, and premium AI features. Free forever: templates, community access, basic planning, browsing Insighta, and networking. Subscribers get monthly credit resets and can earn bonus credits by participating in feedback surveys. Check our transparent pricing page for exact costs—no hidden fees. Start free today, upgrade when you see the value."
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
              We're here to help you succeed. Reach out to us directly.
            </p>
            <div className="flex justify-center items-center">
              <a
                href="mailto:admin@creatives-takeover.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/90 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <Mail className="w-5 h-5" />
                Email Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeFAQ;
