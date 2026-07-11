import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  Users, 
  Settings, 
  Download,
  Shield,
  HelpCircle
} from "lucide-react";
import { RevealGroup, ScrollReveal } from "@/components/animations/ScrollReveal";

const SearchableFAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const categories = [
    { name: "All", icon: <HelpCircle className="w-4 h-4" />, count: 24 },
    { name: "Pricing", icon: <DollarSign className="w-4 h-4" />, count: 6 },
    { name: "Community", icon: <Users className="w-4 h-4" />, count: 4 },
    { name: "Features", icon: <Settings className="w-4 h-4" />, count: 8 },
    { name: "Credits", icon: <Download className="w-4 h-4" />, count: 3 },
    { name: "Security", icon: <Shield className="w-4 h-4" />, count: 3 }
  ];

  const faqData = [
    // Pricing Questions
    {
      id: 1,
      category: "Pricing",
      question: "What pricing plans do you offer?",
      answer: "We offer four plans built around the founder journey. Rookie helps you clarify with 50 credits/month. Starter helps you validate with PMF Lab, Email Templates, and 100 credits/month. Rising helps you build and launch with MVP Builder, Tech Stack Builder, GTM Strategist, and 250 credits/month. Pro helps you fundraise and scale with Find Your Angel, unlimited research views, and 600 credits/month. Discovery Calls are unlimited on every plan and cost 10 credits per confirmed booking.",
      popular: true,
      tags: ["pricing", "plans", "subscription", "rookie", "starter", "rising", "pro"]
    },
    {
      id: 2,
      category: "Pricing",
      question: "Is there a free plan available?",
      answer: "Yes. Rookie is completely free forever with no credit card required. You get 50 credits per month, free ICP Builder access, Insighta Test, Newspaper, mentor and co-founder browsing, preview access to later-stage tools, unlimited Discovery Calls at 10 credits per confirmed booking, and co-founder posting at 5 credits per published post.",
      popular: true,
      tags: ["free", "rookie", "no credit card", "credits"]
    },
    {
      id: 3,
      category: "Pricing",
      question: "Can I cancel my subscription anytime?",
      answer: "Absolutely. You can cancel Starter, Rising, or Pro at any time with no cancellation fee. Your paid access continues until the end of your current billing period, and then the account falls back to Rookie.",
      popular: false,
      tags: ["cancel", "refund", "billing", "stripe"]
    },
    {
      id: 4,
      category: "Pricing",
      question: "What's the difference between Rising and Pro plans?",
      answer: "Rising gives you 250 credits, the full BizMap AI toolset, 10 VC profiles and 10 accelerator profiles per billing cycle, full prompt library access, full email templates, and pitch deck analyzer access. Pro gives you 600 credits, unlimited VC and accelerator profile views, Angels community access, group office hours, and priority support. Discovery Calls are unlimited on both plans and cost 10 credits per confirmed booking. MVP Builder is available on every plan and charges per AI action.",
      popular: true,
      tags: ["rising", "pro", "comparison", "features"]
    },
    {
      id: 5,
      category: "Pricing",
      question: "Do credits roll over to the next month?",
      answer: "Credits do not roll over. They reset at the start of each billing cycle. If you regularly burn through your included credits before the cycle ends, the usual answer is either moving up a plan or buying extra credit packs.",
      popular: false,
      tags: ["credits", "rollover", "monthly", "reset"]
    },
    {
      id: 6,
      category: "Pricing",
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express, Discover) and process payments securely through Stripe. All transactions are encrypted with bank-level security. We currently support payments in USD.",
      popular: false,
      tags: ["payment", "credit cards", "stripe", "secure"]
    },

    // Community Questions
    {
      id: 7,
      category: "Community",
      question: "What is the Founder Stories feature?",
      answer: "Founder Stories is our community-driven space where entrepreneurs share their startup journeys, lessons learned, and advice for fellow founders. You can read stories from other founders, share your own experiences, and connect with like-minded entrepreneurs. It's designed to provide real-world insights and inspiration from people who understand the founder journey.",
      popular: true,
      tags: ["founder stories", "community", "entrepreneurs", "networking"]
    },
    {
      id: 8,
      category: "Community",
      question: "How do I connect with other founders?",
      answer: "Our platform offers multiple ways to connect: participate in Founder Stories discussions, join our Telegram community for real-time conversations, engage with other founders through comments and feedback, and attend community events. Pro members get featured profiles that increase visibility within the community.",
      popular: true,
      tags: ["networking", "founders", "telegram", "community"]
    },
    {
      id: 9,
      category: "Community",
      question: "Is the community beginner-friendly?",
      answer: "Absolutely. Our community welcomes founders at every stage, from those with just an idea to experienced entrepreneurs. The platform is designed to guide first-time founders through the entire startup journey with tools like BizMap AI that adapt to your experience level. Our Founder Stories feature includes content from both new and seasoned entrepreneurs.",
      popular: true,
      tags: ["beginner friendly", "first-time founders", "supportive", "learning"]
    },
    {
      id: 10,
      category: "Community",
      question: "Can I share my startup and get feedback?",
      answer: "Yes! You can share your startup journey through Founder Stories, showcase your progress in the community, and receive constructive feedback from other founders. Additionally, tools like Insighta Test help you gather structured feedback on your landing pages and value propositions from real users.",
      popular: false,
      tags: ["feedback", "sharing", "founder stories", "insighta"]
    },

    // Features Questions
    {
      id: 11,
      category: "Features",
      question: "What is BizMap AI and how does it work?",
      answer: "BizMap AI is your AI-powered co-founder inside the Startup Development Cycle. It helps you move from rough idea to real startup through natural conversation: clarifying the problem, shaping the offer, validating demand, planning the MVP, and deciding what to do next. It remembers your previous conversations and adapts its guidance to your startup context. Each message costs 1 credit.",
      popular: true,
      tags: ["bizmap ai", "ai co-founder", "business planning", "conversation"]
    },
    {
      id: 12,
      category: "Features",
      question: "What is PMF Lab?",
      answer: "PMF Lab (Product-Market Fit Lab) helps you analyze and improve your product-market fit. It provides frameworks, assessments, and actionable insights to ensure you're building something customers actually want. Rookie users get preview access to learn the concepts, while Starter, Rising, and Pro unlock full PMF analyses that use credits per run.",
      popular: true,
      tags: ["pmf lab", "product-market fit", "analysis", "validation"]
    },
    {
      id: 13,
      category: "Features",
      question: "How does the Pitch Deck Analyzer work?",
      answer: "The Pitch Deck Analyzer uses AI to review your pitch deck and provide detailed feedback on structure, content, clarity, and investor appeal. It identifies strengths, weaknesses, and specific improvements to help you create a more compelling deck. It unlocks on Rising and Pro and uses credits per analysis.",
      popular: true,
      tags: ["pitch deck", "analyzer", "investor", "feedback"]
    },
    {
      id: 14,
      category: "Features",
      question: "What is VC Search and how many VCs can I view?",
      answer: "VC Search helps you discover and research venture capital firms and angel investors relevant to your startup. You can filter by industry, stage, location, and investment thesis. Rookie users can browse only, Starter users can open 2 profiles per billing cycle, Rising users get 10, and Pro users have unlimited access.",
      popular: true,
      tags: ["vc search", "investors", "fundraising", "venture capital"]
    },
    {
      id: 15,
      category: "Features",
      question: "What is Insighta Test?",
      answer: "Insighta Test is our landing page and value proposition testing tool. It helps you validate your messaging, identify unclear elements, and optimize for conversions. It is included on every plan, including Rookie.",
      popular: false,
      tags: ["insighta", "landing page", "testing", "validation", "conversion"]
    },
    {
      id: 16,
      category: "Features",
      question: "What tools are included in the Prompt Library?",
      answer: "The Prompt Library contains curated prompts for startup tasks like market research, positioning, customer personas, and outreach. Rookie and Starter can use the free models only, while Rising and Pro unlock the full library. Premium prompt loading and copying still use credits where applicable.",
      popular: false,
      tags: ["prompt library", "ai prompts", "templates", "productivity"]
    },
    {
      id: 17,
      category: "Features",
      question: "What is Focus Funnel?",
      answer: "Focus Funnel is your founder execution system. It helps you turn startup goals into concrete projects and daily tasks so you do not get lost in idea overload. Features include goal tracking, project management, task prioritization, and progress visualization, all designed to keep you moving once you are inside the build and launch stages.",
      popular: false,
      tags: ["focus funnel", "goals", "tasks", "productivity", "planning"]
    },
    {
      id: 18,
      category: "Features",
      question: "How does the Tech Stack Generator work?",
      answer: "The Tech Stack Generator recommends the best technologies for your startup based on product type, budget, scale requirements, and technical context. Rookie and Starter see it in preview mode, while Rising and Pro unlock it as a credit-metered generation tool.",
      popular: false,
      tags: ["tech stack", "technology", "recommendations", "development"]
    },

    // Credits Questions
    {
      id: 19,
      category: "Credits",
      question: "How does the credit system work?",
      answer: "Credits refresh with your plan every billing cycle: Rookie 10, Starter 30, Rising 75, and Pro 150. Plan gates decide which tools you can access, and credits meter generative actions inside those unlocked tools. Demo Studio costs 4 credits on Rookie and 3 credits on paid plans. PMF Lab uses credits on Starter and above. MVP Builder is available on every plan and charges per AI action; Tech Stack Builder, GTM Strategist, and Pitch Deck Analyzer use credits per generation or analysis.",
      popular: true,
      tags: ["credits", "costs", "ai features", "monthly"]
    },
    {
      id: 20,
      category: "Credits",
      question: "What happens when I run out of credits?",
      answer: "When you run out of credits, the credit-powered actions stop until your next billing cycle or until you add more credits. Read-only and non-credit features like Stories, dashboards, and browsing remain available. The fastest path back is either a higher plan or a credit pack purchase.",
      popular: true,
      tags: ["out of credits", "upgrade", "refresh", "limitations"]
    },
    {
      id: 21,
      category: "Credits",
      question: "Which features use the most credits?",
      answer: "The biggest credit consumers are the metered AI actions: Demo Studio, PMF Lab, MVP Builder, Tech Stack Builder, GTM Strategist, Pitch Deck Analyzer, and premium prompt actions. Access is controlled by plan, but each generation or analysis still draws from your monthly credits.",
      popular: false,
      tags: ["credit costs", "features", "expensive", "affordable"]
    },

    // Security Questions
    {
      id: 22,
      category: "Security",
      question: "How secure is my startup data?",
      answer: "We use encryption for data in transit, secure cloud infrastructure, and access controls designed to keep your workspace private. Your startup notes, strategy, and planning data are protected at rest and in transit. We do not sell your proprietary information, and we do not use your private startup data as training material for public-facing AI experiences.",
      popular: true,
      tags: ["security", "encryption", "GDPR", "privacy", "data protection"]
    },
    {
      id: 23,
      category: "Security",
      question: "Is my business idea safe?",
      answer: "Yes. Your idea stays private unless you choose to share it. We do not share, sell, or expose your startup work to other users, competitors, or third parties. Your conversations, drafts, and planning data remain tied to your private workspace. And just as important, most startup success comes from execution, not from someone vaguely hearing an idea. We help you move faster while keeping your work protected.",
      popular: true,
      tags: ["privacy", "confidentiality", "business ideas", "ownership"]
    },
    {
      id: 24,
      category: "Security",
      question: "Can I delete my data if I leave the platform?",
      answer: "Yes, you have full control over your data. You can request complete deletion of your account and all associated data at any time by contacting admin@creatives-takeover.com. We comply with GDPR data deletion requirements and will remove your information within 30 days of a verified request, unless legally required to retain it.",
      popular: false,
      tags: ["data deletion", "gdpr", "account", "privacy rights"]
    }
  ];

  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="py-20 lg:py-32 bg-muted/30" id="search-faq">
      <div className="container mx-auto px-6">
        {/* Search and Filter */}
        <ScrollReveal className="max-w-4xl mx-auto mb-16">
          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-4 text-lg glass border-border"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.name)}
                className="flex items-center space-x-2"
              >
                {category.icon}
                <span>{category.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
        </ScrollReveal>

        {/* Results Summary */}
        <div className="text-center mb-12">
          <p className="text-muted-foreground">
            Showing {filteredFAQs.length} {filteredFAQs.length === 1 ? 'result' : 'results'}
            {searchQuery && ` for "${searchQuery}"`}
            {selectedCategory !== "All" && ` in ${selectedCategory}`}
          </p>
        </div>

        {/* FAQ Items */}
        <RevealGroup className="max-w-4xl mx-auto space-y-4" variant="card">
          {filteredFAQs.length === 0 ? (
            <Card className="glass border-border text-center p-8">
              <CardContent>
                <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search or browse a different category.
                </p>
                <Button variant="outline" asChild>
                  <Link to="/mentorship">
                    Ask Our Community
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredFAQs.map((faq) => (
              <Card 
                key={faq.id} 
                className="glass border-border hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => toggleExpanded(faq.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {faq.popular && (
                          <Badge className="bg-primary text-white text-xs">
                            Popular
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {faq.category}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold mb-3">{faq.question}</h3>
                      
                      {expandedItems.includes(faq.id) && (
                        <div className="animate-fade-in">
                          <p className="text-muted-foreground leading-relaxed mb-4">
                            {faq.answer}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {faq.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      {expandedItems.includes(faq.id) ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </RevealGroup>

        {/* Still Need Help */}
        <ScrollReveal className="text-center mt-16 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 max-w-4xl mx-auto" variant="card">
          <h3 className="text-2xl font-bold mb-4 gradient-text">
            Still Need Help?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Can't find the answer you're looking for? Our community and support team are here to help you succeed.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/mentorship">
                Ask Our Community
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <a href="mailto:admin@creatives-takeover.com">
                Email Us
              </a>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <a href="https://t.me/creativestakeover" target="_blank" rel="noopener noreferrer">
                Join Our Telegram
              </a>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default SearchableFAQ;
