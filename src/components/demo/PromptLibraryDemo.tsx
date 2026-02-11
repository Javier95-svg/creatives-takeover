import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bot, Copy, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface PromptLibraryDemoProps {
  onNavigateToBizMap?: () => void;
}

const PromptLibraryDemo = ({ onNavigateToBizMap }: PromptLibraryDemoProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = ["all", "AI & Tech", "E-commerce", "Creative", "SaaS", "Consulting"];

  const demoPrompts = [
    {
      id: 1,
      title: "AI-Powered SaaS Startup",
      category: "AI & Tech",
      prompt: "I'm building an AI-powered analytics tool for small businesses that can't afford enterprise solutions. My target market is SMBs with 10-50 employees who need simple, affordable business intelligence.",
      tags: ["AI", "SaaS", "Analytics"],
      uses: 234
    },
    {
      id: 2,
      title: "Sustainable Fashion Brand",
      category: "E-commerce",
      prompt: "I want to launch an e-commerce marketplace for sustainable fashion brands. My customers are eco-conscious millennials and Gen Z who struggle to find verified ethical fashion in one place.",
      tags: ["E-commerce", "Fashion", "Sustainability"],
      uses: 189
    },
    {
      id: 3,
      title: "Creative Design Agency",
      category: "Creative",
      prompt: "I'm starting a subscription-based unlimited design service for startups and SMBs. My solution is to provide professional branding and design at a fraction of traditional agency costs.",
      tags: ["Design", "Agency", "Subscription"],
      uses: 156
    },
    {
      id: 4,
      title: "Online Course Platform",
      category: "AI & Tech",
      prompt: "I'm creating a platform that helps experts turn their knowledge into profitable online courses with AI-assisted content creation and marketing tools.",
      tags: ["Education", "AI", "Content"],
      uses: 142
    },
    {
      id: 5,
      title: "Remote Work Consulting",
      category: "Consulting",
      prompt: "I offer consulting services to help traditional companies successfully transition to remote-first operations, including culture, tools, and processes.",
      tags: ["Consulting", "Remote", "Operations"],
      uses: 98
    },
    {
      id: 6,
      title: "Food Delivery Marketplace",
      category: "E-commerce",
      prompt: "I'm building a hyperlocal food delivery service connecting home chefs with customers who want authentic, homemade meals instead of restaurant food.",
      tags: ["Food", "Marketplace", "Local"],
      uses: 87
    }
  ];

  const filteredPrompts = demoPrompts.filter(prompt => {
    const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || prompt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleUseToBizMap = (prompt: string) => {
    // Store prompt in localStorage so Dream2Plan can pick it up
    localStorage.setItem('bizmap_prompt', prompt);
    // Also copy to clipboard as backup
    navigator.clipboard.writeText(prompt);
    // Navigate to Dream2Plan
    navigate('/bizmap-ai/chat');
    toast.success("Opening BizMap AI with your prompt!", {
      icon: <Bot className="w-4 h-4" />
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Prompt Library Demo</h2>
            <p className="text-muted-foreground">30+ pre-built business prompts to jumpstart your planning</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Badge variant="secondary" className="text-sm">
            ✨ Industry-Specific Templates
          </Badge>
          <Badge variant="secondary" className="text-sm">
            🚀 One-Click Integration
          </Badge>
          <Badge variant="secondary" className="text-sm">
            📋 Copy & Customize
          </Badge>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Find Your Perfect Prompt</CardTitle>
          <CardDescription>Search by keywords or browse by category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prompts Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredPrompts.map((prompt) => (
          <Card key={prompt.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{prompt.title}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{prompt.category}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{prompt.uses} uses</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {prompt.prompt}
              </p>
              <div className="flex flex-wrap gap-2">
                {prompt.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyPrompt(prompt.prompt)}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUseToBizMap(prompt.prompt)}
                  className="flex-1"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Use in BizMap AI
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Ready to Start Your Business Plan?</h3>
            <p className="text-muted-foreground mb-4">
              Use any of these prompts in BizMap AI to get instant personalized guidance
            </p>
            <Button size="lg" onClick={() => navigate('/bizmap-ai/chat')}>
              <Bot className="w-5 h-5 mr-2" />
              Try BizMap AI Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptLibraryDemo;
