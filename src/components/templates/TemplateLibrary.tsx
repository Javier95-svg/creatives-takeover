import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Zap, 
  ShoppingCart, 
  Smartphone, 
  Utensils,
  Gamepad2,
  Heart,
  GraduationCap,
  Building,
  Palette,
  Car,
  Home,
  Star,
  Clock,
  Users,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface BusinessTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: any;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  timeToLaunch: string;
  marketSize: string;
  startupCost: string;
  examples: string[];
  answers: {
    overview: string;
    market: string;
    problem: string;
    solution: string;
    channels: string;
    pricing: string;
    goals: string;
  };
  tags: string[];
  popularity: number;
}

const templates: BusinessTemplate[] = [
  {
    id: "saas-productivity",
    title: "SaaS Productivity Tool",
    category: "Software",
    description: "Build a software-as-a-service application that helps businesses or individuals be more productive",
    icon: Zap,
    difficulty: "Intermediate",
    timeToLaunch: "3-6 months",
    marketSize: "$200B+",
    startupCost: "$10K-$50K",
    examples: ["Notion", "Slack", "Trello", "Asana"],
    answers: {
      overview: "A cloud-based productivity platform that helps teams collaborate more efficiently by centralizing project management, communication, and file sharing in one intuitive workspace.",
      market: "Small to medium businesses (10-200 employees) in tech, marketing, and creative industries who struggle with scattered tools and poor team coordination. These companies typically spend $50-200 per employee monthly on various productivity tools.",
      problem: "Teams waste 2-3 hours daily switching between different apps, lose important information in email chains, and struggle to track project progress. Current solutions are either too complex or lack integration capabilities.",
      solution: "Our all-in-one workspace combines project management, real-time chat, document collaboration, and automated workflows. Unlike competitors, we offer seamless integrations with 100+ business tools and AI-powered productivity insights.",
      channels: "Content marketing targeting productivity blogs, LinkedIn ads to decision makers, partnerships with business consultants, freemium model with viral sharing features, and SEO-optimized landing pages.",
      pricing: "Freemium: Free for teams up to 5 users. Pro: $15/user/month. Enterprise: $30/user/month with advanced security. Average customer value: $2,400 annually. Main costs: cloud hosting ($2K/month), development team ($15K/month).",
      goals: "Launch MVP in 90 days with core features. Acquire 100 paying customers in first quarter. Achieve $50K MRR by month 6. Team can dedicate 40 hours/week, targeting tech-savvy SMBs initially."
    },
    tags: ["SaaS", "B2B", "Productivity", "Recurring Revenue"],
    popularity: 95
  },
  {
    id: "ecommerce-niche",
    title: "Niche E-commerce Store",
    category: "E-commerce",
    description: "Start an online store selling specialized products to a passionate niche audience",
    icon: ShoppingCart,
    difficulty: "Beginner",
    timeToLaunch: "4-8 weeks",
    marketSize: "$5B-$50B",
    startupCost: "$2K-$15K",
    examples: ["Beardbrand", "Death Wish Coffee", "Allbirds", "Warby Parker"],
    answers: {
      overview: "A direct-to-consumer e-commerce brand specializing in eco-friendly pet products for environmentally conscious pet owners who want sustainable, high-quality items for their beloved animals.",
      market: "Millennial and Gen-Z pet owners (ages 25-45) with household incomes above $50K who prioritize sustainability and are willing to pay 20-40% premium for eco-friendly products. Market size: 38M households.",
      problem: "Pet owners want sustainable products but most pet supplies are made with harmful plastics and chemicals. Current eco-friendly options are either low-quality, extremely expensive, or hard to find in stores.",
      solution: "Curated collection of 100% sustainable pet products made from recycled materials, biodegradable components, and non-toxic ingredients. Each product includes carbon footprint tracking and supports animal rescue organizations.",
      channels: "Instagram marketing with pet influencers, Facebook ads targeting eco-conscious pet groups, partnerships with local pet stores and veterinarians, SEO content about sustainable pet care, and subscription box offerings.",
      pricing: "Products priced 25% above conventional alternatives. Average order value: $65. Subscription boxes: $35/month. Gross margin: 60%. Monthly costs: inventory ($8K), marketing ($5K), operations ($2K).",
      goals: "Launch store with 50 products in 60 days. Reach $25K monthly revenue by month 4. Build email list of 5,000 subscribers. Team dedicates 30 hours/week, focusing on organic social media growth."
    },
    tags: ["E-commerce", "D2C", "Sustainable", "Pet Industry"],
    popularity: 88
  },
  {
    id: "mobile-app-local",
    title: "Local Service App",
    category: "Mobile App",
    description: "Create a mobile app that connects local service providers with customers in your area",
    icon: Smartphone,
    difficulty: "Intermediate",
    timeToLaunch: "4-8 months",
    marketSize: "$100B+",
    startupCost: "$25K-$75K",
    examples: ["TaskRabbit", "Uber", "DoorDash", "Rover"],
    answers: {
      overview: "A mobile marketplace app that connects busy homeowners with pre-vetted local handymen and contractors for same-day home repairs and maintenance services, featuring instant booking and real-time tracking.",
      market: "Homeowners aged 30-65 in suburban areas with household income above $75K who value their time and struggle to find reliable, available contractors. Target cities with 100K+ population and high home ownership rates.",
      problem: "Homeowners waste hours calling multiple contractors who don't answer, show up late, or overcharge. Emergency repairs often take days to schedule, and it's difficult to verify quality and reliability of workers.",
      solution: "On-demand platform with GPS tracking, instant quotes, background-checked professionals, transparent pricing, and same-day availability. Workers are rated and reviewed, with guaranteed completion times and insurance coverage.",
      channels: "Local Facebook advertising, Google Ads for 'handyman near me', partnerships with real estate agents and home improvement stores, referral programs, and local community engagement events.",
      pricing: "15% commission per completed job. Average job value: $200. Workers pay $99/month subscription. Revenue streams: commissions (70%), subscriptions (20%), premium features (10%). Development costs: $50K initial.",
      goals: "Launch in pilot city within 6 months. Onboard 50 service providers and complete 500 jobs in first quarter. Achieve $100K GMV by month 9. Team works full-time with $75K development budget."
    },
    tags: ["Mobile App", "Marketplace", "Local Services", "On-Demand"],
    popularity: 82
  },
  {
    id: "food-delivery-specialty",
    title: "Specialty Food Delivery",
    category: "Food & Beverage",
    description: "Launch a food delivery service focusing on a specific cuisine, dietary need, or meal type",
    icon: Utensils,
    difficulty: "Intermediate",
    timeToLaunch: "3-6 months",
    marketSize: "$150B+",
    startupCost: "$15K-$50K",
    examples: ["Blue Apron", "HelloFresh", "Purple Carrot", "Sunbasket"],
    answers: {
      overview: "A specialized meal delivery service providing authentic, chef-prepared Korean meals to Korean diaspora and K-culture enthusiasts who crave restaurant-quality Korean food at home but lack access or cooking skills.",
      market: "Korean Americans, K-pop/K-drama fans, and food enthusiasts aged 20-45 in major metropolitan areas. Primary targets are busy professionals who grew up eating Korean food or developed taste through cultural exposure.",
      problem: "Authentic Korean ingredients are expensive and hard to find. Most Korean restaurants don't deliver, and existing meal kits lack authenticity or proper preparation techniques. Busy lifestyles prevent traditional cooking.",
      solution: "Weekly delivery of pre-portioned, chef-designed Korean meals with traditional recipes, premium imported ingredients, and easy 20-minute preparation instructions. Includes cultural stories and cooking tips with each meal.",
      channels: "Social media marketing in Korean communities, partnerships with Korean cultural centers, influencer collaborations with K-food YouTubers, targeted Facebook ads, and pop-up events at Korean festivals.",
      pricing: "3 meals for 2 people: $59/week. Single meals: $24 each. Gross margin: 65%. Main costs: ingredients (35%), packaging (8%), delivery (12%), kitchen rent (15%). Customer acquisition cost: $45.",
      goals: "Launch in Los Angeles area in 90 days. Acquire 200 weekly subscribers by month 6. Achieve $80K monthly revenue. Expand to SF and NYC by year-end. Team dedicates 45 hours/week with $25K initial capital."
    },
    tags: ["Food Delivery", "Ethnic Cuisine", "Subscription", "Cultural"],
    popularity: 75
  },
  {
    id: "gaming-social",
    title: "Gaming Community Platform",
    category: "Gaming",
    description: "Build a platform that brings gamers together for tournaments, coaching, or social gaming experiences",
    icon: Gamepad2,
    difficulty: "Advanced",
    timeToLaunch: "6-12 months",
    marketSize: "$180B+",
    startupCost: "$50K-$150K",
    examples: ["Discord", "Twitch", "Steam", "Faceit"],
    answers: {
      overview: "A competitive gaming platform that organizes skill-based tournaments and matches for mobile gamers, featuring automated bracket generation, live streaming integration, and prize pools funded by entry fees and sponsorships.",
      market: "Mobile gamers aged 16-35 who play competitive games like PUBG Mobile, Mobile Legends, or Call of Duty Mobile. Target serious players who want to monetize their skills but lack access to organized competitions.",
      problem: "Mobile gaming tournaments are fragmented across different platforms, have inconsistent rules, delayed payouts, and limited prize pools. Most tournaments are poorly organized and lack proper anti-cheat measures.",
      solution: "Automated tournament platform with real-time match verification, instant prize distribution via digital wallets, integrated live streaming, and AI-powered skill matching. Mobile-first design with cross-game compatibility.",
      channels: "Partnerships with mobile game influencers and streamers, in-game advertising opportunities, social media campaigns on TikTok and YouTube, sponsorships at gaming events, and referral programs for top players.",
      pricing: "5% fee on entry fees and prize pools. Premium subscriptions ($9.99/month) for advanced features. Sponsorship deals and advertising revenue. Average monthly revenue per user: $15. Development cost: $100K.",
      goals: "Launch with 3 popular mobile games in 180 days. Host 50 tournaments monthly with $100K total prize pools. Acquire 10,000 active users by month 12. Full-time team with $120K development and marketing budget."
    },
    tags: ["Gaming", "Esports", "Mobile", "Community"],
    popularity: 78
  },
  {
    id: "health-wellness-app",
    title: "Health & Wellness App",
    category: "Health & Wellness",
    description: "Develop a digital health solution that helps people track, improve, or maintain their wellness goals",
    icon: Heart,
    difficulty: "Intermediate",
    timeToLaunch: "4-8 months",
    marketSize: "$350B+",
    startupCost: "$30K-$80K",
    examples: ["MyFitnessPal", "Headspace", "Calm", "Noom"],
    answers: {
      overview: "A mental wellness app specifically designed for new parents, offering guided meditation, sleep coaching, and community support to help navigate the emotional challenges of early parenthood and prevent postpartum depression.",
      market: "New and expecting parents aged 25-40, particularly mothers experiencing increased stress, sleep deprivation, and emotional challenges during pregnancy and first two years of parenthood. Focus on urban, educated, higher-income demographics.",
      problem: "New parents struggle with mental health issues but lack time for traditional therapy. Generic wellness apps don't address specific parental challenges like sleep deprivation, identity changes, and relationship stress.",
      solution: "Personalized wellness program with 5-15 minute guided sessions, sleep optimization for parents, partner communication tools, milestone tracking, and access to certified perinatal mental health specialists via video calls.",
      channels: "Partnerships with OB-GYNs and pediatricians, parenting blog collaborations, Instagram ads targeting new parents, partnerships with maternity brands, and referral programs through mom Facebook groups.",
      pricing: "Freemium model: Basic content free, Premium $14.99/month with expert access and personalized plans. Annual plans at discount. Average LTV: $180. Customer acquisition cost: $25. Development: $60K.",
      goals: "Launch MVP in 120 days with core meditation and sleep features. Acquire 1,000 premium subscribers by month 8. Partner with 50 healthcare providers. Team works 35 hours/week with focus on user retention and clinical validation."
    },
    tags: ["Health", "Mental Wellness", "Parenting", "Mobile App"],
    popularity: 85
  },
  {
    id: "online-education",
    title: "Online Education Platform",
    category: "Education",
    description: "Create an online learning platform teaching specialized skills or knowledge to a specific audience",
    icon: GraduationCap,
    difficulty: "Intermediate",
    timeToLaunch: "3-6 months",
    marketSize: "$250B+",
    startupCost: "$10K-$40K",
    examples: ["MasterClass", "Skillshare", "Udemy", "Coursera"],
    answers: {
      overview: "An online platform teaching practical digital marketing skills specifically for small business owners, featuring step-by-step video courses, templates, and live Q&A sessions with marketing experts.",
      market: "Small business owners with 1-25 employees who need to handle their own marketing but lack formal training. Target service-based businesses, local retailers, and solo entrepreneurs who can't afford agencies.",
      problem: "Small business owners know they need digital marketing but feel overwhelmed by constantly changing platforms and strategies. Most courses are too theoretical or designed for large companies with big budgets.",
      solution: "Practical, bite-sized courses focused on immediate implementation with real business examples. Includes done-for-you templates, weekly live coaching calls, and a community of peer business owners sharing results.",
      channels: "Content marketing through small business blogs, LinkedIn outreach to business owners, partnerships with small business associations and chambers of commerce, free webinar series, and referral programs.",
      pricing: "Monthly subscription: $97/month or $997/year. Individual courses: $197-$497. Corporate packages: $2,500/team. Average customer stays 8 months. Content creation cost: $15K initial investment.",
      goals: "Launch with 20 core courses in 90 days. Acquire 300 paying subscribers by month 6. Create partnership network of 25 business organizations. Host weekly live sessions. Team commits 40 hours/week with $25K budget."
    },
    tags: ["Online Education", "Small Business", "Digital Marketing", "Subscription"],
    popularity: 80
  }
];

const categories = [
  { id: "all", name: "All Templates", count: templates.length },
  { id: "Software", name: "Software & SaaS", count: templates.filter(t => t.category === "Software").length },
  { id: "E-commerce", name: "E-commerce", count: templates.filter(t => t.category === "E-commerce").length },
  { id: "Mobile App", name: "Mobile Apps", count: templates.filter(t => t.category === "Mobile App").length },
  { id: "Food & Beverage", name: "Food & Beverage", count: templates.filter(t => t.category === "Food & Beverage").length },
  { id: "Health & Wellness", name: "Health & Wellness", count: templates.filter(t => t.category === "Health & Wellness").length },
  { id: "Education", name: "Education", count: templates.filter(t => t.category === "Education").length }
];

const TemplateLibrary = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || template.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const useTemplate = (template: BusinessTemplate) => {
    // Store template data in localStorage for Dream2Plan page
    localStorage.setItem('bizmap_template', JSON.stringify(template));
    navigate('/bizmap-ai');
    toast.success(`${template.title} template loaded! Starting with pre-filled answers.`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "text-green-600 bg-green-100";
      case "Intermediate": return "text-orange-600 bg-orange-100";
      case "Advanced": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold creatives-font gradient-text">
          Business Plan Templates
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Jump-start your business planning with proven templates. Each template includes pre-filled answers, 
          market insights, and step-by-step guidance based on successful businesses.
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by industry, business type, or features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="adaptive-tabs grid w-full grid-cols-3 lg:grid-cols-7">
                {categories.map(category => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className="text-xs lg:text-sm"
                  >
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              variant={selectedDifficulty === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDifficulty("all")}
            >
              All Levels
            </Button>
            <Button
              variant={selectedDifficulty === "Beginner" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDifficulty("Beginner")}
            >
              Beginner
            </Button>
            <Button
              variant={selectedDifficulty === "Intermediate" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDifficulty("Intermediate")}
            >
              Intermediate
            </Button>
            <Button
              variant={selectedDifficulty === "Advanced" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDifficulty("Advanced")}
            >
              Advanced
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTemplates
          .sort((a, b) => b.popularity - a.popularity)
          .map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.id} className="glass-card hover-lift group relative overflow-hidden">
                {/* Popularity Badge */}
                {template.popularity >= 90 && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-yellow-100 text-yellow-800 gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {template.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{template.category}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.description}
                  </p>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{template.timeToLaunch}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{template.marketSize} market</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>{template.startupCost}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{template.popularity}% match</span>
                    </div>
                  </div>

                  {/* Examples */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Similar to:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.examples.slice(0, 3).map((example, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty & Tags */}
                  <div className="flex items-center justify-between">
                    <Badge className={getDifficultyColor(template.difficulty)}>
                      {template.difficulty}
                    </Badge>
                    <div className="flex gap-1">
                      {template.tags.slice(0, 2).map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button 
                    onClick={() => useTemplate(template)}
                    className="w-full mt-4"
                    size="sm"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card className="glass-card text-center p-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Search className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search terms or filters to find the perfect template for your business idea.
          </p>
          <Button onClick={() => { setSearchQuery(""); setSelectedCategory("all"); setSelectedDifficulty("all"); }}>
            Clear Filters
          </Button>
        </Card>
      )}

      {/* Footer CTA */}
      <Card className="glass-card bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="text-center p-8">
          <h3 className="text-2xl font-bold mb-3">Don't see your industry?</h3>
          <p className="text-muted-foreground mb-6">
            Start with our AI-powered business planning wizard that adapts to any industry or business model.
          </p>
          <Button asChild size="lg">
            <a href="/bizmap-ai">
              <Zap className="w-4 h-4 mr-2" />
              Start Custom Business Plan
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateLibrary;
