import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  Search, 
  BarChart3, 
  Users, 
  DollarSign, 
  FileText,
  CheckCircle,
  ArrowRight,
  Clock
} from "lucide-react";

const ProcessSteps = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: Lightbulb,
      title: "Idea Input",
      description: "Share your business concept",
      details: "Tell us about your business idea in just a few sentences. Our AI will understand the core concept and begin the analysis process.",
      duration: "30 seconds",
      preview: "AI analyzes: industry type, business model, target market indicators"
    },
    {
      icon: Search,
      title: "Market Research", 
      description: "AI analyzes market conditions",
      details: "Advanced AI scans thousands of data sources to analyze market size, growth trends, competitive landscape, and industry dynamics.",
      duration: "3 minutes",
      preview: "Real-time data: market size $4.2B, growth rate 25%, 847 competitors identified"
    },
    {
      icon: Users,
      title: "Audience Analysis",
      description: "Identify your ideal customers", 
      details: "Deep demographic analysis, psychographic profiling, and customer behavior patterns to define your target audience precisely.",
      duration: "2 minutes",
      preview: "Customer personas: 3 segments, buying behaviors, pain points, preferences"
    },
    {
      icon: BarChart3,
      title: "Competitive Intelligence",
      description: "Analyze competition & positioning",
      details: "Comprehensive competitor analysis including pricing strategies, market positioning, strengths, weaknesses, and opportunity gaps.",
      duration: "4 minutes", 
      preview: "SWOT analysis, competitive matrix, differentiation opportunities identified"
    },
    {
      icon: DollarSign,
      title: "Financial Projections",
      description: "Revenue & investment forecasting",
      details: "AI-powered financial modeling including revenue projections, cost analysis, break-even calculations, and funding requirements.",
      duration: "3 minutes",
      preview: "5-year forecast: Revenue, costs, profits, ROI calculations, funding needs"
    },
    {
      icon: FileText,
      title: "Business Plan Generation",
      description: "Complete professional document",
      details: "All insights compiled into a comprehensive, investor-ready business plan with executive summary, strategy, and implementation roadmap.",
      duration: "2 minutes",
      preview: "25-page document: Executive summary, market analysis, financial projections, go-to-market strategy"
    }
  ];

  const totalDuration = "15 minutes";

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Clock className="w-4 h-4 mr-2" />
            {totalDuration} Total Process
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 takeover-gradient">
            From Idea to Professional Business Plan
          </h2>
          <p className="text-lg text-muted-foreground">
            Watch how our AI transforms your business idea into a comprehensive, 
            actionable business plan through 6 intelligent steps.
          </p>
        </div>

        {/* Progress Timeline */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="flex justify-between items-center mb-8 overflow-x-auto pb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;
              
              return (
                <div key={index} className="flex flex-col items-center min-w-[120px] cursor-pointer group">
                  <div 
                    className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 mb-3 ${
                      isCompleted 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : isActive 
                        ? 'bg-primary/20 border-primary text-primary animate-pulse' 
                        : 'bg-background border-muted-foreground/30 text-muted-foreground group-hover:border-primary/50'
                    }`}
                    onClick={() => setActiveStep(index)}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                    
                    {/* Connection Line */}
                    {index < steps.length - 1 && (
                      <div className={`absolute left-full top-1/2 w-[80px] h-0.5 -translate-y-1/2 ${
                        index < activeStep ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`} />
                    )}
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-sm font-medium mb-1 ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.duration}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Step Details */}
        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    {(() => {
                      const Icon = steps[activeStep].icon;
                      return <Icon className="w-8 h-8 text-primary" />;
                    })()}
                    <div>
                      <h3 className="text-2xl font-bold">{steps[activeStep].title}</h3>
                      <p className="text-muted-foreground">{steps[activeStep].description}</p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {steps[activeStep].details}
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2 text-primary">What you'll get:</h4>
                    <p className="text-sm text-muted-foreground">
                      {steps[activeStep].preview}
                    </p>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-6 text-center">
                    <div className="text-4xl mb-4">
                      {activeStep === 0 && "💡"}
                      {activeStep === 1 && "🔍"}  
                      {activeStep === 2 && "👥"}
                      {activeStep === 3 && "📊"}
                      {activeStep === 4 && "💰"}
                      {activeStep === 5 && "📄"}
                    </div>
                    <div className="text-2xl font-bold text-primary mb-2">
                      Step {activeStep + 1} of {steps.length}
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      Duration: {steps[activeStep].duration}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-2 mb-4">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center gap-4 mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                >
                  Previous Step
                </Button>
                
                {activeStep < steps.length - 1 ? (
                  <Button 
                    onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
                  >
                    Next Step <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                ) : (
                  <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                    <a href="/dream2plan">
                      Start My Business Plan <ArrowRight className="ml-2 w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ProcessSteps;