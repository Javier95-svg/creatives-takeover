import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Copy, ExternalLink, Lightbulb, TrendingUp, Users, DollarSign, Rocket, Building2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

const PromptLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const promptCategories = [
    { id: "all", name: "All Prompts", icon: Lightbulb },
    { id: "ecommerce", name: "E-commerce", icon: DollarSign },
    { id: "saas", name: "SaaS & Tech", icon: Rocket },
    { id: "local", name: "Local Business", icon: Building2 },
    { id: "consulting", name: "Consulting", icon: Users },
    { id: "marketing", name: "Marketing", icon: TrendingUp },
  ];

  const prompts = [
    {
      id: 1,
      title: "Sustainable E-commerce Store",
      category: "ecommerce",
      description: "Starting an eco-friendly online retail business",
      prompt: "I want to start an e-commerce business that sells sustainable, eco-friendly products. My target market is environmentally conscious millennials and Gen Z consumers. I have $5,000 to start, marketing experience, and can dedicate 20-30 hours per week. Help me create a business plan for a sustainable online store.",
      tags: ["sustainability", "e-commerce", "retail", "eco-friendly"],
      difficulty: "Medium"
    },
    {
      id: 2,
      title: "SaaS Project Management Tool",
      category: "saas",
      description: "Building a productivity software solution",
      prompt: "I'm a software developer who wants to create a SaaS project management tool specifically for creative agencies. I have technical skills, $10,000+ budget, and can work full-time. The tool should help agencies manage client projects, timelines, and team collaboration better than existing solutions.",
      tags: ["saas", "productivity", "B2B", "software"],
      difficulty: "Hard"
    },
    {
      id: 3,
      title: "Local Fitness Coaching",
      category: "local",
      description: "Personal training and wellness services",
      prompt: "I'm a certified personal trainer who wants to start a local fitness coaching business. I have industry expertise, limited budget under $1,000, and can work part-time initially. I want to offer both in-person and virtual training sessions to busy professionals in my city.",
      tags: ["fitness", "local", "services", "health"],
      difficulty: "Easy"
    },
    {
      id: 4,
      title: "Digital Marketing Consultancy",
      category: "consulting",
      description: "Specialized marketing services for small businesses",
      prompt: "I have 5 years of marketing experience and want to start a digital marketing consultancy focusing on small businesses. I have marketing and sales skills, moderate budget of $3,000, and can dedicate 30+ hours weekly. I want to help local businesses improve their online presence and lead generation.",
      tags: ["consulting", "marketing", "B2B", "digital"],
      difficulty: "Medium"
    },
    {
      id: 5,
      title: "Subscription Box Service",
      category: "ecommerce",
      description: "Curated monthly product subscriptions",
      prompt: "I want to launch a subscription box service for pet owners, featuring premium pet toys, treats, and accessories. I have $8,000 budget, some e-commerce experience, and can work full-time. The target audience is pet parents who want to spoil their pets with high-quality products.",
      tags: ["subscription", "pets", "e-commerce", "recurring"],
      difficulty: "Hard"
    },
    {
      id: 6,
      title: "Mobile App for Local Services",
      category: "saas",
      description: "Connecting service providers with customers",
      prompt: "I'm planning a mobile app that connects local service providers (plumbers, electricians, cleaners) with customers who need quick help. I have technical skills, $15,000 budget, and can work full-time. Think 'Uber for home services' but focused on my local market first.",
      tags: ["mobile app", "marketplace", "local services", "on-demand"],
      difficulty: "Hard"
    },
    {
      id: 7,
      title: "Content Creation Agency",
      category: "marketing",
      description: "Social media and content services",
      prompt: "I want to start a content creation agency that helps B2B companies with social media content, blog posts, and video marketing. I have marketing skills and industry connections, $2,000 budget, and can start part-time. My goal is to build long-term retainer relationships with 10-15 clients.",
      tags: ["content", "agency", "B2B", "social media"],
      difficulty: "Medium"
    },
    {
      id: 8,
      title: "Online Course Platform",
      category: "saas",
      description: "Educational technology solution",
      prompt: "I'm an educator who wants to create an online course platform specifically for professional skill development. I have teaching experience but limited technical skills, $5,000 budget, and can work 40+ hours per week. I want to focus on courses that help people advance their careers.",
      tags: ["education", "courses", "professional development", "platform"],
      difficulty: "Hard"
    }
  ];

  const filteredPrompts = prompts.filter(prompt => {
    const matchesCategory = selectedCategory === "all" || prompt.category === selectedCategory;
    const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const useInBizMap = (prompt: string) => {
    // Store the prompt in localStorage so it can be used in BizMap AI
    localStorage.setItem('bizmap_prompt', prompt);
    window.open('/dream2plan', '_blank');
    toast.success("Opening BizMap AI with this prompt!");
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800 border-green-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Hard": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Prompt Library - Ready-to-Use Business Ideas | BizMap AI</title>
        <meta name="description" content="Discover curated business idea prompts for BizMap AI. Get inspired with proven business concepts across e-commerce, SaaS, consulting, and more." />
      </Helmet>
      
      <Navigation />
      
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Prompt Library
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Get inspired with ready-to-use business idea prompts. Each prompt is crafted to help you get the most detailed and actionable business plans from BizMap AI.
            </p>
            
            {/* Search and Filter */}
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center">
                {promptCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {category.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Prompts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPrompts.map((prompt) => (
              <Card key={prompt.id} className="glass-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{prompt.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mb-3">
                        {prompt.description}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`ml-2 ${getDifficultyColor(prompt.difficulty)}`}
                    >
                      {prompt.difficulty}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {prompt.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm">
                    <p className="line-clamp-4">{prompt.prompt}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => useInBizMap(prompt.prompt)}
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Use in BizMap AI
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPrompt(prompt.prompt)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPrompts.length === 0 && (
            <div className="text-center py-12">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No prompts found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <Card className="glass-card max-w-2xl mx-auto">
              <CardContent className="p-8">
                <Rocket className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-4">Ready to Build Your Business?</h3>
                <p className="text-muted-foreground mb-6">
                  Take any of these prompts to BizMap AI and get a comprehensive business plan in minutes.
                </p>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a href="/dream2plan">Start with BizMap AI</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PromptLibrary;