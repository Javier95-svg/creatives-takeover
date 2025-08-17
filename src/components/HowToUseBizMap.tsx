import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Target, 
  Lightbulb, 
  BarChart3, 
  Rocket,
  ArrowRight,
  CheckCircle,
  Clock,
  DollarSign,
  Users
} from "lucide-react";

const HowToUseBizMap = () => {
  const steps = [
    {
      number: "1",
      title: "Share Your Business Idea",
      description: "Tell BizMap AI about your business concept - be as detailed or general as you'd like.",
      icon: MessageSquare,
      tips: [
        "Include your target market if known",
        "Mention any unique features or advantages", 
        "Don't worry about being perfect - AI will ask follow-ups"
      ],
      example: '"I want to start an e-commerce business selling eco-friendly home products to millennials"'
    },
    {
      number: "2", 
      title: "Provide Your Context",
      description: "Answer a few quick questions about your budget, skills, and time availability.",
      icon: Target,
      tips: [
        "Be honest about your budget constraints",
        "List all relevant skills you have",
        "Include how much time you can dedicate weekly"
      ],
      example: '"Budget: Under $5,000, Skills: Marketing and design, Time: 20-30 hours per week"'
    },
    {
      number: "3",
      title: "Get Your Custom Plan", 
      description: "Receive a comprehensive business plan with viability scoring, validation experiments, and execution phases.",
      icon: BarChart3,
      tips: [
        "Review the viability score and reasoning",
        "Focus on the validation experiments first",
        "Use the timeline as your roadmap"
      ],
      example: "Complete analysis with 7/10 viability score and 4-phase execution plan"
    },
    {
      number: "4",
      title: "Take Action & Iterate",
      description: "Follow the prioritized next steps and return to refine your plan as you progress.",
      icon: Rocket,
      tips: [
        "Start with 'This Week' action items",
        "Complete validation experiments quickly", 
        "Come back to update your progress and get new guidance"
      ],
      example: "Launch landing page test, conduct 10 customer interviews, validate pricing"
    }
  ];

  const businessTypes = [
    { name: "E-commerce", icon: DollarSign, difficulty: "Medium", timeToMVP: "6-12 weeks" },
    { name: "SaaS/Tech", icon: Rocket, difficulty: "Hard", timeToMVP: "12-20 weeks" },
    { name: "Local Business", icon: Users, difficulty: "Easy", timeToMVP: "4-8 weeks" },
    { name: "Consulting", icon: Target, difficulty: "Easy", timeToMVP: "2-6 weeks" },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800 border-green-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";  
      case "Hard": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <section id="how-to-use" className="scroll-mt-24 py-20 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-card mb-6">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Step-by-Step Guide</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 gradient-text">
            How to Use BizMap AI
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Follow these simple steps to transform your business idea into a comprehensive, actionable business plan in minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-8 mb-20">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={step.number} className="glass-card hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-8">
                  <div className="grid lg:grid-cols-2 gap-8 items-start">
                    {/* Left Side - Main Content */}
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">{step.number}</span>
                        </div>
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                      
                      <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                      <p className="text-muted-foreground mb-6 text-lg">{step.description}</p>
                      
                      <div className="bg-muted/50 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium mb-2">Example:</p>
                        <p className="text-sm italic">{step.example}</p>
                      </div>
                    </div>

                    {/* Right Side - Tips */}
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        Pro Tips
                      </h4>
                      <ul className="space-y-3">
                        {step.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="flex items-start gap-3 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Business Types */}
        <div className="text-center mb-12 animate-fade-in">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">Works for Any Business Type</h3>
          <p className="text-muted-foreground mb-8">
            BizMap AI adapts its recommendations based on your business model and constraints
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {businessTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <Card key={type.name} className="glass-card hover:shadow-md transition-all hover-scale" style={{ animationDelay: `${index * 0.1}s` }}>
                  <CardContent className="p-6 text-center">
                    <Icon className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">{type.name}</h4>
                    <div className="flex flex-col gap-2">
                      <Badge variant="outline" className={getDifficultyColor(type.difficulty)}>
                        {type.difficulty}
                      </Badge>
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {type.timeToMVP}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center animate-fade-in">
          <Card className="glass-card max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Ready to Start Building?</h3>
              <p className="text-muted-foreground mb-6">
                Join thousands of entrepreneurs who've turned their ideas into successful businesses with BizMap AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground hover-scale" asChild>
                  <a href="/dream2plan">
                    Try BizMap AI Now
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="hover-scale" asChild>
                  <a href="/prompt-library">Browse Examples</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HowToUseBizMap;