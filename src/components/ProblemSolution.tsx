import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Lightbulb, Search, Target, Zap, CheckCircle, AlertCircle, TrendingUp, Users, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const ProblemSolution = () => {
  const transformations = [
    {
      problem: {
        icon: Lightbulb,
        title: "Scattered Ideas Everywhere",
        description: "Brilliant concepts stuck in your head, random notes, and endless 'what ifs' with no clear direction forward.",
        painPoints: [
          "Ideas scattered across notes, voice memos, and napkins",
          "No way to organize thoughts into actionable plans", 
          "Analysis paralysis - too many directions to choose from"
        ],
        emotion: "😰 Overwhelming & Frustrating"
      },
      solution: {
        icon: Target,
        title: "AI-Structured Business Framework",
        description: "Transform chaos into clarity with our intelligent framework that organizes your ideas into professional business plans.",
        benefits: [
          "All ideas organized into structured, actionable format",
          "Clear priorities and next steps automatically generated",
          "Professional business plan ready in 3 minutes"
        ],
        result: "🎯 Crystal Clear Direction",
        metrics: "3 min to organized plan"
      }
    },
    {
      problem: {
        icon: Search,
        title: "Market Research Paralysis", 
        description: "Drowning in competitor analysis, customer research, and market data without knowing what actually matters for your success.",
        painPoints: [
          "Weeks researching competitors with no clear insights",
          "Endless customer surveys that don't validate demand",
          "Information overload without actionable conclusions"
        ],
        emotion: "😵‍💫 Confused & Stuck"
      },
      solution: {
        icon: Users,
        title: "Instant Market Intelligence",
        description: "AI analyzes your market landscape and pinpoints exactly who will buy, why they'll buy, and how to reach them.",
        benefits: [
          "Precise customer segments identified automatically", 
          "Competitive advantages clearly defined",
          "Validation experiments you can run today"
        ],
        result: "💡 Market Confidence",
        metrics: "5-7 customer segments identified"
      }
    },
    {
      problem: {
        icon: AlertCircle,
        title: "Viability Uncertainty",
        description: "Passionate about your idea but terrified it won't work - no way to know if people will actually pay before you build it.",
        painPoints: [
          "Fear of wasting months on something nobody wants",
          "No reliable way to test market demand early",
          "Guessing at pricing and business model viability"
        ],
        emotion: "😰 Anxious & Doubtful"
      },
      solution: {
        icon: BarChart3,
        title: "Real Viability Scoring",
        description: "Get detailed viability analysis based on real market data, competition levels, and your specific resources.",
        benefits: [
          "Objective scoring based on market demand indicators",
          "Risk assessment with mitigation strategies",
          "Financial projections based on your actual situation"
        ],
        result: "🚀 Launch Confidence", 
        metrics: "12-15 validation experiments"
      }
    }
  ];

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background"></div>
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary/5 blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-32 right-16 w-48 h-48 rounded-full bg-secondary/5 blur-3xl animate-float"></div>

      <div className="relative container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass border border-primary/20 mb-8 animate-fade-in">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-primary font-semibold">The Transformation Journey</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-8 takeover-gradient creatives-font">
            From Chaos to Launch Ready
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Watch how BizMap AI transforms your biggest entrepreneurial frustrations into your competitive advantages. 
            <span className="text-primary font-semibold"> Real problems. Real solutions. Real results.</span>
          </p>
        </div>

        {/* Transformations */}
        <div className="space-y-20">
          {transformations.map((item, index) => (
            <div key={index} className={`stagger-child grid lg:grid-cols-12 gap-8 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              {/* Problem Side */}
              <div className={`lg:col-span-5 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <Card className="group glass border-destructive/30 hover-lift overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive/80 to-destructive/40"></div>
                  
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 group-hover:scale-110 transition-transform">
                        <item.problem.icon className="w-8 h-8 text-destructive" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-2xl font-bold text-foreground">
                            {item.problem.title}
                          </h3>
                          <AlertCircle className="w-5 h-5 text-destructive animate-bounce-subtle" />
                        </div>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                          {item.problem.description}
                        </p>
                      </div>
                    </div>

                    {/* Pain Points */}
                    <div className="space-y-3 mb-6">
                      {item.problem.painPoints.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                          <div className="w-2 h-2 rounded-full bg-destructive/60 mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-muted-foreground font-medium">{point}</p>
                        </div>
                      ))}
                    </div>

                    {/* Emotion */}
                    <div className="p-4 rounded-xl bg-destructive/5 border-l-4 border-destructive">
                      <p className="text-lg font-semibold text-destructive">
                        {item.problem.emotion}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transformation Arrow */}
              <div className="lg:col-span-2 flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full glass border-2 border-primary/30 flex items-center justify-center animate-pulse-glow">
                    <ArrowRight className={`w-10 h-10 text-primary ${index % 2 === 1 ? 'rotate-180 lg:rotate-0' : ''}`} />
                  </div>
                  
                  {/* Magic Sparkles */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary/20 animate-ping"></div>
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-secondary/30 animate-bounce-subtle"></div>
                </div>
              </div>

              {/* Solution Side */}
              <div className={`lg:col-span-5 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <Card className="group glass border-primary/30 hover-lift overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
                  
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-110 transition-transform">
                        <item.solution.icon className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-2xl font-bold text-foreground">
                            {item.solution.title}
                          </h3>
                          <CheckCircle className="w-5 h-5 text-primary animate-bounce-subtle" />
                        </div>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                          {item.solution.description}
                        </p>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-3 mb-6">
                      {item.solution.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-foreground font-medium">{benefit}</p>
                        </div>
                      ))}
                    </div>

                    {/* Result & Metrics */}
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-primary/5 border-l-4 border-primary">
                        <p className="text-lg font-bold gradient-text mb-1">
                          {item.solution.result}
                        </p>
                        <p className="text-sm text-primary font-semibold">
                          ⚡ {item.solution.metrics}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>

        {/* Success Metrics */}
        <div className="mt-24 text-center">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { number: "3 min", label: "From idea to plan", icon: Zap },
              { number: "5-7", label: "Customer segments identified", icon: Users }, 
              { number: "12+", label: "Validation experiments", icon: Target }
            ].map((stat, idx) => (
              <div key={idx} className="stagger-child glass-card text-center hover-lift">
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-4" />
                <div className="text-3xl font-bold gradient-text mb-2">{stat.number}</div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Final CTA */}
          <div className="glass p-10 rounded-3xl max-w-3xl mx-auto">
            <h3 className="text-3xl font-bold mb-4 gradient-text creatives-font">
              Ready to Transform Your Ideas?
            </h3>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Stop struggling with the chaos. Join thousands of entrepreneurs who've already 
              transformed their scattered ideas into <span className="text-primary font-semibold">launch-ready businesses</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg" 
                className="btn-start-creating text-lg px-8 py-6 h-auto font-semibold group"
              >
                <Link to="/dream2plan">
                  Turn My Ideas Into Plans
                  <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button 
                asChild 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-6 h-auto border-primary/30 hover:border-primary/50 hover:bg-primary/5"
              >
                <Link to="/services">
                  See How It Works
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;