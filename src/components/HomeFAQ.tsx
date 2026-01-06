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
      answer: "Creatives Takeover is an AI powered platform built to help founders and creatives turn ideas into real, structured, launchable projects. It gives you a clear space to think, test, and build without the usual overwhelm of trying to figure everything out on your own. Instead of leaving you with scattered notes and half formed concepts, the platform guides you through a focused process that shows you what to build, how to build it, and what to do next.\n\nCreatives Takeover is designed for people who want to build something meaningful without needing a business background. Whether you're starting a side project, exploring a new venture, or trying to turn a creative skill into a real product, the platform gives you tools, guidance, and clarity so you can move from \"idea\" to \"built\" in a much more intuitive way."
    },
    {
      question: "How does BizMap AI help me build a business plan?",
      answer: "BizMap AI is a 7-step conversational wizard that generates your business plan in just 3 minutes, guiding you through Overview, Market, Problem, Solution, Channels, Pricing, and Goals.\n\nUnlike corporate jargon-filled templates, it feels like chatting with a co-founder who asks the right questions at the right time. You'll get a success score showing viability, automatic sprint integration to turn strategy into action, and professional PDF export for sharing with investors or partners.\n\nIt's designed for creative minds who think in conversations, not spreadsheets."
    },
    {
      question: "I don't have a clear business idea yet. Can this platform still help me?",
      answer: "Absolutely! This is actually the perfect place to start.\n\nUse our Prompt Library with hundreds of idea-sparking templates, explore Creative Entrepreneur Templates for specific niches like freelancers, creators, service businesses, and product startups, or simply chat with the BizMap chatbot to explore fuzzy concepts through natural conversation.\n\nYou can even start with voice notes or scattered thoughts, and our AI will help organize them into coherent directions. Plus, browse community stories from other founders to see real journeys that might inspire your own path forward."
    },
    {
      question: "Is Creatives Takeover only for tech startups?",
      answer: "Not even close. We're built specifically for creative-first intelligence, not corporate playbooks.\n\nWhether you're a freelance designer, indie game developer, service consultant, Etsy seller, content creator, coach, or any creative professional, our language and tools reflect your reality. We speak creativity, not VC-speak.\n\nIf you're building something with passion rather than just chasing unicorn status, you're absolutely in the right place."
    },
    {
      question: "How can I discover funding or accelerators that fit my project?",
      answer: "Insighta provides AI-powered market intelligence with real-time updates on funding opportunities, accelerators, grants, and competitions. You can filter by business stage, focus area, and deadline to find exactly what matches your needs.\n\nBookmark programs you like, get deadline reminders so you never miss an opportunity, and see peer recommendations from the community. The database refreshes automatically, so you'll always have the latest information.\n\nIt's like having a research assistant scanning the funding landscape 24/7, working tirelessly on your behalf."
    },
    {
      question: "What kind of community can I expect on the platform?",
      answer: "You'll find a Reddit-style feed where founders share genuine wins, real challenges, and honest advice without any corporate fakeness.\n\nOur community features include accountability partnership matching where you get paired with someone in your niche, daily challenges with reputation points and badges, monthly Demo Days to showcase your progress, and commitment tracking with gentle nudges if you miss check-ins. You can also use direct messaging and friend requests to build meaningful connections.\n\nThe culture here is all about collaboration over competition. We celebrate others' wins because we know there's room for everyone to succeed."
    },
    {
      question: "Are my plans and data private and secure?",
      answer: "Absolutely. Your privacy and security are our top priorities. We use Supabase-powered security with Row Level Security policies that ensure your data is encrypted and isolated.\n\nYou maintain complete control over what gets shared with the community, and your workspace is private by default. You can share reports anonymously if you want feedback without revealing your identity. All plans can be kept completely private or selectively shared, depending on your preferences.\n\nWe comply with UK data protection standards and never sell your data. Your ideas are yours, always."
    },
    {
      question: "Can I export or share the business plan created with BizMap AI?",
      answer: "Yes! You have complete flexibility with your business plans.\n\nExport them as professionally-formatted PDFs for investors or partners, share to the community feed as a post with or without your name attached, integrate directly into sprint planning to turn strategy into actionable tasks, create public shared reports to gather feedback, or use them in monthly Demo Day presentations.\n\nYou own your work completely and can distribute it however you choose, from pitch decks to portfolio pieces."
    },
    {
      question: "Who is behind Creatives Takeover and why should I trust the service?",
      answer: "Creatives Takeover is a UK-registered company founded by passionate entrepreneurs who truly understand the challenges of building something from scratch. We're deeply committed to transparency, innovation, and supporting the creative economy.\n\nYou can check our blog for real founder stories and educational resources, follow our active LinkedIn for company updates, and join our Discord to see the thriving community firsthand.\n\nWe're building in public and genuinely invested in your success because when you succeed, we succeed too."
    },
    {
      question: "How much does it cost and what happens next?",
      answer: "New users get 10 free credits per month to test the platform and see how it works for their specific needs. Credits are used for Launch Reports (BizMap AI business plans), sprint task generation, and premium AI features.\n\nYou get free forever access to templates, community access, basic planning tools, browsing Insighta, and networking opportunities. Subscribers get monthly credit resets (50 credits for Creator, 150 for Professional) and can earn bonus credits by participating in feedback surveys.\n\nCheck our transparent pricing page for exact costs with no hidden fees. Start free today and upgrade when you're ready to see even more value."
    }
  ];

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Subtle blue accent aligned with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

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
