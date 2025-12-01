import { ExternalLink, Mail } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

const HomeFAQ = () => {
  const { trackClick } = usePageAnalytics();
  const faqs = [
    {
      question: "What is Creatives Takeover?",
      answer: "Creatives Takeover is an AI powered platform built to help founders and creatives turn ideas into real, structured, launchable projects. It gives you a clear space to think, test, and build without the usual overwhelm of trying to figure everything out on your own. Instead of leaving you with scattered notes and half formed concepts, the platform guides you through a focused process that shows you what to build, how to build it, and what to do next.\n\n\n\nCreatives Takeover is designed for people who want to build something meaningful without needing a business background. Whether you're starting a side project, exploring a new venture, or trying to turn a creative skill into a real product, the platform gives you tools, guidance, and clarity so you can move from \"idea\" to \"built\" in a much more intuitive way."
    },
    {
      question: "How does BizMap AI help me build a business plan?",
      answer: "BizMap AI is a 7-step conversational wizard that generates your business plan in just 3 minutes, guiding you through Overview, Market, Problem, Solution, Channels, Pricing, and Goals. Unlike corporate jargon-filled templates, it feels like chatting with a co-founder who asks the right questions at the right time. You'll get a success score showing viability, automatic sprint integration to turn strategy into action, and professional PDF export for sharing with investors or partners. It's designed for creative minds who think in conversations, not spreadsheets."
    },
    {
      question: "I don't have a clear business idea yet. Can this platform still help me?",
      answer: "Absolutely! This is actually the perfect place to start. Use our Prompt Library with hundreds of idea-sparking templates, explore Creative Entrepreneur Templates for specific niches like freelancers, creators, service businesses, and product startups, or simply chat with the BizMap chatbot to explore fuzzy concepts through natural conversation. You can even start with voice notes or scattered thoughts, and our AI will help organize them into coherent directions. Plus, browse community stories from other founders to see real journeys that might inspire your own path forward."
    },
    {
      question: "Is Creatives Takeover only for tech startups?",
      answer: "Not even close. We're built specifically for creative-first intelligence, not corporate playbooks. Whether you're a freelance designer, indie game developer, service consultant, Etsy seller, content creator, coach, or any creative professional, our language and tools reflect your reality. We speak creativity, not VC-speak. If you're building something with passion rather than just chasing unicorn status, you're absolutely in the right place."
    },
    {
      question: "How can I discover funding or accelerators that fit my project?",
      answer: "Insighta provides AI-powered market intelligence with real-time updates on funding opportunities, accelerators, grants, and competitions. You can filter by business stage, focus area, and deadline to find exactly what matches your needs. Bookmark programs you like, get deadline reminders so you never miss an opportunity, and see peer recommendations from the community. The database refreshes automatically, so you'll always have the latest information. It's like having a research assistant scanning the funding landscape 24/7, working tirelessly on your behalf."
    },
    {
      question: "What kind of community can I expect on the platform?",
      answer: "You'll find a Reddit-style feed where founders share genuine wins, real challenges, and honest advice without any corporate fakeness. Our community features include accountability partnership matching where you get paired with someone in your niche, daily challenges with reputation points and badges, monthly Demo Days to showcase your progress, and commitment tracking with gentle nudges if you miss check-ins. You can also use direct messaging and friend requests to build meaningful connections. The culture here is all about collaboration over competition. We celebrate others' wins because we know there's room for everyone to succeed."
    },
    {
      question: "Are my plans and data private and secure?",
      answer: "Absolutely. Your privacy and security are our top priorities. We use Supabase-powered security with Row Level Security policies that ensure your data is encrypted and isolated. You maintain complete control over what gets shared with the community, and your workspace is private by default. You can share reports anonymously if you want feedback without revealing your identity. All plans can be kept completely private or selectively shared, depending on your preferences. We comply with UK data protection standards and never sell your data. Your ideas are yours, always."
    },
    {
      question: "Can I export or share the business plan created with BizMap AI?",
      answer: "Yes! You have complete flexibility with your business plans. Export them as professionally-formatted PDFs for investors or partners, share to the community feed as a post with or without your name attached, integrate directly into sprint planning to turn strategy into actionable tasks, create public shared reports to gather feedback, or use them in monthly Demo Day presentations. You own your work completely and can distribute it however you choose, from pitch decks to portfolio pieces."
    },
    {
      question: "Who is behind Creatives Takeover and why should I trust the service?",
      answer: "Creatives Takeover is a UK-registered company founded by passionate entrepreneurs who truly understand the challenges of building something from scratch. We're deeply committed to transparency, innovation, and supporting the creative economy. You can check our blog for real founder stories and educational resources, follow our active LinkedIn for company updates, and join our Discord to see the thriving community firsthand. We're building in public and genuinely invested in your success because when you succeed, we succeed too."
    },
    {
      question: "How much does it cost and what happens next?",
      answer: "New users get 5 free credits to test the platform and see how it works for their specific needs. Credits are used for Launch Reports (BizMap AI business plans), sprint task generation, and premium AI features. You get free forever access to templates, community access, basic planning tools, browsing Insighta, and networking opportunities. Subscribers get monthly credit resets and can earn bonus credits by participating in feedback surveys. Check our transparent pricing page for exact costs with no hidden fees. Start free today and upgrade when you're ready to see even more value."
    }
  ];

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background">
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

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            <span className="gradient-unified">FAQ</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Everything you need to know about Creatives Takeover, the all-in-one platform that uses AI, automation, and community support to help you plan, build, and grow your business from idea to execution.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="backdrop-blur-sm bg-card/50 rounded-2xl border border-border/50 p-4 sm:p-6 lg:p-8 shadow-2xl animate-scale-in">
            <Accordion type="single" collapsible className="space-y-3 sm:space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border border-border/50 rounded-lg px-4 sm:px-6 bg-background/50 hover:bg-background/80 transition-all duration-300 hover:shadow-lg hover:border-primary/30"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base md:text-lg font-semibold hover:text-primary transition-colors py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Trust-Building Footer */}
        <div className="mt-12 sm:mt-16 text-center animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
          <div className="backdrop-blur-sm bg-card/30 border border-border/50 rounded-xl p-6 sm:p-8 max-w-2xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Still have questions?
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              We're here to help you succeed. Reach out to us directly.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a
                href="mailto:admin@creatives-takeover.com"
                onClick={() => trackClick('Email Us', 'FAQ Contact')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/90 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <Mail className="w-5 h-5" />
                Email Us
              </a>
              <a
                href="https://t.me/creativestakeover"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick('Join Our Telegram', 'FAQ Contact')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/90 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <ExternalLink className="w-5 h-5" />
                Join Our Telegram
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeFAQ;
