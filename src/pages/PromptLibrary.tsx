import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Copy, ExternalLink, Lightbulb, TrendingUp, Users, DollarSign, Rocket, Building2, ArrowRight, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import { multiStepPrompts, type MultiStepPrompt } from "@/data/multiStepPrompts";

const PromptLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedConcept, setSelectedConcept] = useState<MultiStepPrompt | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const promptCategories = [
    { id: "all", name: "All Prompts", icon: Lightbulb },
    { id: "ai", name: "AI & Automation", icon: Rocket },
    { id: "ecommerce", name: "E-commerce", icon: DollarSign },
    { id: "saas", name: "SaaS & Tech", icon: Rocket },
    { id: "creator", name: "Creator Economy", icon: Users },
    { id: "local", name: "Local Business", icon: Building2 },
    { id: "consulting", name: "Consulting", icon: Users },
    { id: "sustainability", name: "Green & Climate Tech", icon: TrendingUp },
    { id: "health", name: "Health & Wellness", icon: TrendingUp },
  ];

  const filteredPrompts = multiStepPrompts.filter(prompt => {
    const matchesCategory = selectedCategory === "all" || prompt.category === selectedCategory;
    const matchesSearch = prompt.conceptTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const useInBizMap = (prompt: string) => {
    localStorage.setItem("bizmap_prompt", prompt);
    navigator.clipboard.writeText(prompt);
    window.open("/bizmap-ai", "_blank");
    toast.success("Opening BizMap AI with your prompt!");
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800 border-green-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Hard": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (selectedConcept) {
    const step = selectedConcept.steps.find(s => s.step === currentStep);
    
    return (
      <div className="relative min-h-screen overflow-hidden">
        <Helmet>
          <title>Creatives Takeover</title>
        </Helmet>
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <div className="pt-16 sm:pt-20 pb-12 sm:pb-16 px-4">
            <div className="max-w-5xl mx-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedConcept(null);
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="mb-6"
              >
                ← Back to Library
              </Button>


              <Card className="glass-card mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedConcept.conceptTitle}</span>
                    <Badge variant="secondary">Step {currentStep} of 7</Badge>
                  </CardTitle>
                  <CardDescription>
                    {selectedConcept.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-6">
                    {selectedConcept.steps.map((s) => (
                      <div
                        key={s.step}
                        className={"flex flex-col items-center cursor-pointer " + (s.step === currentStep ? "opacity-100" : "opacity-50")}
                        onClick={() => setCurrentStep(s.step)}
                      >
                        <div className={"w-10 h-10 rounded-full flex items-center justify-center mb-2 " + (s.step === currentStep ? "bg-primary text-white" : s.step < currentStep ? "bg-green-500 text-white" : "bg-muted")}>
                          {s.step < currentStep ? <CheckCircle className="w-5 h-5" /> : s.step}
                        </div>
                        <span className="text-xs text-center hidden sm:block">{s.title}</span>
                      </div>
                    ))}
                  </div>

                  {step && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          Step {step.step}: {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">{step.dayRange}</p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {step.prompt}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() => useInBizMap(step.prompt)}
                          className="flex-1"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Use in BizMap AI
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => copyPrompt(step.prompt)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>

                      <div className="flex justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                          disabled={currentStep === 1}
                        >
                          Previous Step
                        </Button>
                        <Button
                          onClick={() => {
                            if (currentStep < 7) {
                              setCurrentStep(currentStep + 1);
                            } else {
                              toast.success("You have completed all 7 steps!");
                            }
                          }}
                          disabled={currentStep === 7}
                        >
                          Next Step
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Discover curated business idea prompts with complete 7-step journeys for BizMap AI. Get inspired with proven business concepts across e-commerce, SaaS, consulting, and more." />
      </Helmet>
      <AnimatedBackground />
      <div className="relative z-10">
        <Navigation />
        <div className="pt-16 sm:pt-20 pb-12 sm:pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 takeover-gradient creatives-font">
                Prompt Library
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-2">
                Get inspired with ready-to-use business idea prompts. Each concept includes 7 detailed prompts covering your complete 30-day launch journey with BizMap AI.
              </p>
              
              <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 sm:h-12 text-base touch-manipulation"
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
                        className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm touch-manipulation"
                      >
                        <Icon className="w-3 sm:w-4 h-3 sm:h-4" />
                        <span className="hidden xs:inline">{category.name}</span>
                        <span className="xs:hidden">{category.name.split(" ")[0]}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredPrompts.map((prompt) => (
                <Card key={prompt.id} className="glass-card hover:shadow-lg transition-shadow">
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <CardTitle className="text-lg sm:text-xl mb-2 leading-tight">
                          {prompt.conceptTitle}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                          {prompt.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={"ml-2 text-xs whitespace-nowrap " + getDifficultyColor(prompt.difficulty)}
                      >
                        {prompt.difficulty}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {prompt.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {prompt.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{prompt.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="bg-primary/5 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium mb-2">Complete 7-Step Journey Included:</p>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>✓ Business Concept (Days 1-2)</li>
                        <li>✓ Target Customer (Days 3-4)</li>
                        <li>✓ Validation Plan (Days 5-7)</li>
                        <li>✓ And 4 more steps...</li>
                      </ul>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedConcept(prompt);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full h-9 sm:h-10 text-sm touch-manipulation"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      View All 7 Prompts
                    </Button>
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

            <div className="mt-16 text-center">
              <Card className="glass-card max-w-2xl mx-auto">
                <CardContent className="p-8">
                  <Rocket className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-4">Ready to Build Your Business?</h3>
                  <p className="text-muted-foreground mb-6">
                    Each concept includes 7 detailed prompts to guide you through your complete 30-day launch journey with BizMap AI.
                  </p>
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <a href="/bizmap-ai">Start with BizMap AI</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PromptLibrary;
