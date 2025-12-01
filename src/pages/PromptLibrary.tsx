import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Copy, ExternalLink, Lightbulb, TrendingUp, Users, DollarSign, Rocket, Building2, ArrowRight, CheckCircle, Lock, Sparkles, Crown, User } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import PromptLibraryWallpaper from "@/components/wallpapers/PromptLibraryWallpaper";
import { multiStepPrompts, type MultiStepPrompt } from "@/data/multiStepPrompts";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomPromptChains } from "@/hooks/useCustomPromptChains";

const PromptLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedConcept, setSelectedConcept] = useState<MultiStepPrompt | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const { subscriptionData, loading: subscriptionLoading } = useSubscription();
  const { user } = useAuth();
  const { publishedChains, fetchPublishedChains, loading: chainsLoading } = useCustomPromptChains();

  const userTier = subscriptionData.subscription_tier || "free";

  // Fetch custom prompt chains on mount
  useEffect(() => {
    fetchPublishedChains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAccessToPrompt = (prompt: MultiStepPrompt) => {
    if (prompt.requiredTier === "free") return true;
    if (!user) return false;
    if (userTier === "professional" || userTier === "enterprise") return true;
    if (userTier === "creator" && prompt.requiredTier === "creator") return true;
    return false;
  };

  const canAccessStep = (prompt: MultiStepPrompt, step: number) => {
    if (step === 1) return true;
    return hasAccessToPrompt(prompt);
  };

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

  // Merge static and custom prompts
  const allPrompts = useMemo(() => {
    return [...multiStepPrompts, ...publishedChains];
  }, [publishedChains]);

  const filteredPrompts = useMemo(() => {
    return allPrompts.filter(prompt => {
      const matchesCategory = selectedCategory === "all" || prompt.category === selectedCategory;
      const matchesSearch = prompt.conceptTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [allPrompts, selectedCategory, searchQuery]);

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

  // Generate concise business model description from prompt data
  const getBusinessModelDescription = (prompt: MultiStepPrompt): string => {
    // Use the first step's prompt to extract business model info
    const step1Prompt = prompt.steps?.[0]?.prompt || "";
    const lowerPrompt = step1Prompt.toLowerCase();
    const lowerTitle = prompt.conceptTitle.toLowerCase();
    const lowerDesc = prompt.description.toLowerCase();
    
    // Extract key value proposition elements
    if (lowerPrompt.includes("reduce") || lowerPrompt.includes("cost")) {
      const costMatch = step1Prompt.match(/reduce.*?costs?.*?(\d+%|\$\d+)/i);
      if (costMatch) {
        return `Reduces costs by ${costMatch[1]} through automation and efficiency`;
      }
      if (lowerPrompt.includes("support cost") || lowerPrompt.includes("agent")) {
        return "Automates customer support to reduce operational costs by 60-80%";
      }
    }
    
    if (lowerPrompt.includes("marketplace") || lowerTitle.includes("marketplace")) {
      return "Connects buyers and sellers in a curated marketplace, earning commission on transactions";
    }
    
    if (lowerPrompt.includes("saas") || lowerTitle.includes("saas") || (lowerPrompt.includes("software") && !lowerPrompt.includes("mobile app"))) {
      return "Subscription-based software that solves specific business problems with recurring revenue";
    }
    
    if (lowerPrompt.includes("consulting") || lowerPrompt.includes("consultancy")) {
      return "Expert advisory services that help businesses achieve specific goals through strategic guidance";
    }
    
    if (lowerPrompt.includes("agency") || lowerTitle.includes("agency")) {
      return "Full-service agency delivering specialized solutions for clients on a project basis";
    }
    
    if (lowerPrompt.includes("app") && !lowerPrompt.includes("saas") && !lowerPrompt.includes("platform")) {
      return "Mobile application solving everyday problems for target users";
    }
    
    if (lowerPrompt.includes("subscription box") || lowerTitle.includes("subscription")) {
      return "Recurring revenue model delivering curated products or services monthly to subscribers";
    }
    
    if (lowerPrompt.includes("e-commerce") || lowerTitle.includes("store") || lowerTitle.includes("shop")) {
      return "Online store selling products directly to consumers with digital marketing";
    }
    
    if (lowerPrompt.includes("platform") && !lowerPrompt.includes("marketplace")) {
      return "Digital platform connecting users and providing value through network effects";
    }
    
    if (lowerPrompt.includes("service") && !lowerPrompt.includes("saas")) {
      return "Service-based business delivering specialized solutions to customers";
    }
    
    if (lowerPrompt.includes("course") || lowerTitle.includes("course") || lowerTitle.includes("bootcamp")) {
      return "Educational service teaching specific skills through structured programs";
    }
    
    if (lowerPrompt.includes("rental") || lowerTitle.includes("rental")) {
      return "Rental platform providing access to products or services on a temporary basis";
    }
    
    if (lowerPrompt.includes("monitoring") || lowerTitle.includes("monitoring")) {
      return "Monitoring service that tracks and analyzes data to provide actionable insights";
    }
    
    // Fallback: create description from conceptTitle and description
    if (prompt.description) {
      // Capitalize first letter and ensure it's a complete sentence
      const desc = prompt.description.trim();
      return desc.charAt(0).toLowerCase() + desc.slice(1);
    }
    
    return "A business solution that creates value for customers";
  };

  if (selectedConcept) {
    const step = selectedConcept.steps.find(s => s.step === currentStep);
    const isStepLocked = !canAccessStep(selectedConcept, currentStep);
    const isPremiumPrompt = selectedConcept.requiredTier !== "free";
    const getTierIcon = () => {
      if (selectedConcept.requiredTier === "professional") return Crown;
      if (selectedConcept.requiredTier === "creator") return Sparkles;
      return null;
    };
    const TierIcon = getTierIcon();

    return (
      <div className="relative min-h-screen overflow-hidden">
        <Helmet>
          <title>Creatives Takeover</title>
        </Helmet>
        <PromptLibraryWallpaper />
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
                  {selectedConcept.is_custom && selectedConcept.author_name && (
                    <div className="mb-2">
                      <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                        <User className="w-3 h-3" />
                        Created by {selectedConcept.author_name}
                      </Badge>
                    </div>
                  )}
                  <CardDescription>
                    {selectedConcept.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-6">
                    {selectedConcept.steps.map((s) => {
                      const stepLocked = !canAccessStep(selectedConcept, s.step);
                      return (
                        <div
                          key={s.step}
                          className={"flex flex-col items-center cursor-pointer " + (s.step === currentStep ? "opacity-100" : "opacity-50")}
                          onClick={() => setCurrentStep(s.step)}
                        >
                          <div className={"w-10 h-10 rounded-full flex items-center justify-center mb-2 " + (s.step === currentStep ? "bg-primary text-white" : s.step < currentStep ? "bg-green-500 text-white" : "bg-muted")}>
                            {stepLocked && s.step > 1 ? (
                              <Lock className="w-4 h-4" />
                            ) : s.step < currentStep ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              s.step
                            )}
                          </div>
                          <span className="text-xs text-center hidden sm:block">{s.title}</span>
                        </div>
                      );
                    })}
                  </div>

                  {step && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          Step {step.step}: {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">{step.dayRange}</p>
                      </div>

                      <div className="relative">
                        <div className={`bg-muted/50 rounded-lg p-4 ${isStepLocked ? "blur-md pointer-events-none select-none" : ""}`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {step.prompt}
                          </p>
                        </div>

                        {isStepLocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                            <div className="text-center p-6 max-w-md">
                              {TierIcon && (
                                <div className="flex justify-center mb-4">
                                  <TierIcon className={`w-12 h-12 ${selectedConcept.requiredTier === "professional" ? "text-amber-600" : "text-purple-600"}`} />
                                </div>
                              )}
                              <h4 className="text-lg font-semibold mb-2">
                                Upgrade to {selectedConcept.requiredTier.charAt(0).toUpperCase() + selectedConcept.requiredTier.slice(1)} to Unlock
                              </h4>
                              <p className="text-sm text-muted-foreground mb-4">
                                Get access to Steps 2-7 and complete your 30-day launch journey with premium prompts.
                              </p>
                              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                {!user && (
                                  <Button
                                    variant="outline"
                                    onClick={() => window.location.href = "/auth"}
                                  >
                                    Sign In
                                  </Button>
                                )}
                                <Button
                                  onClick={() => window.location.href = "/pricing"}
                                  className="gap-2"
                                >
                                  {TierIcon && <TierIcon className="w-4 h-4" />}
                                  Upgrade Now
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {!isStepLocked && (
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
                      )}

                      <div className="flex justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                          disabled={currentStep === 1}
                        >
                          Previous Step
                        </Button>
                        {isPremiumPrompt && currentStep === 1 && !hasAccessToPrompt(selectedConcept) ? (
                          <Button
                            onClick={() => window.location.href = "/pricing"}
                            className="gap-2"
                          >
                            {TierIcon && <TierIcon className="w-4 h-4" />}
                            Upgrade to Unlock the Full Journey
                          </Button>
                        ) : (
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
                        )}
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
      <PromptLibraryWallpaper />
      <div className="relative z-10">
        <Navigation />
        <div className="pt-16 sm:pt-20 pb-12 sm:pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 takeover-gradient creatives-font leading-tight pb-2 overflow-visible">
                Prompt Library
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-2">
                Get inspired with ready-to-use business idea prompts. Each concept includes 7 detailed prompts covering your complete 30-day launch journey with BizMap AI.
              </p>

              <div className="mb-8 sm:mb-12">
              
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

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
              {filteredPrompts.map((prompt) => (
                <Card 
                  key={prompt.id} 
                  className="glass-card hover:shadow-xl hover:shadow-primary/10 border-2 border-transparent hover:border-primary/20 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group"
                >
                  <CardHeader className="p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl sm:text-2xl font-bold mb-3 leading-tight flex items-center gap-2 group-hover:text-primary transition-colors">
                          <span className="flex-1">{prompt.conceptTitle}</span>
                          {prompt.requiredTier !== "free" && (
                            <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </CardTitle>
                        {prompt.is_custom && prompt.author_name && (
                          <div className="mb-3">
                            <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                              <User className="w-3 h-3" />
                              Created by {prompt.author_name}
                            </Badge>
                          </div>
                        )}
                        <p className="text-sm sm:text-base text-foreground/90 mb-4 leading-relaxed font-medium">
                          {prompt.description}
                        </p>
                        
                        {/* Business Model Description */}
                        <div className="flex items-start gap-2 pt-3 border-t border-border/50">
                          <Sparkles className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
                          <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
                            {getBusinessModelDescription(prompt)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={"flex-shrink-0 text-xs whitespace-nowrap h-fit " + getDifficultyColor(prompt.difficulty)}
                      >
                        {prompt.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 sm:p-8 pt-0">
                    <div className="bg-primary/5 hover:bg-primary/10 rounded-lg p-4 mb-5 transition-colors border border-primary/10">
                      <p className="text-sm font-semibold mb-3 text-foreground">This Prompt Chain Includes:</p>
                      <ul className="text-xs sm:text-sm space-y-2 text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>Business Concept (Days 1-2)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>Target Customer (Days 3-4)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>Validation Plan (Days 5-7)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>And 4 more steps...</span>
                        </li>
                      </ul>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedConcept(prompt);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full h-10 sm:h-11 text-sm font-semibold touch-manipulation group/btn hover:scale-[1.02] transition-transform"
                    >
                      <ArrowRight className="w-4 h-4 mr-2 group-hover/btn:translate-x-1 transition-transform" />
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
      </div>
      <Footer />
    </div>
  );
};

export default PromptLibrary;
