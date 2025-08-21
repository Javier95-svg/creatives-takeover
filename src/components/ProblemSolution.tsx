import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Clock, Brain, Target, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const ProblemSolution = () => {
  const painPoints = [
    {
      problem: {
        icon: Clock,
        title: "Scattered Ideas, No Structure",
        description: "You have brilliant business ideas floating around, but no clear path to turn them into actionable plans.",
        painPoint: "Spending weeks trying to organize thoughts into something coherent"
      },
      solution: {
        icon: Brain,
        title: "AI-Structured Business Framework",
        description: "Transform scattered thoughts into comprehensive, organized business plans in minutes.",
        outcome: "From chaos to clarity - get a structured roadmap in 3 minutes"
      }
    },
    {
      problem: {
        icon: Target,
        title: "Market Research Overwhelm",
        description: "Understanding your market feels impossible - where do you start? What data matters? How do you validate demand?",
        painPoint: "Drowning in research without knowing if your idea will actually work"
      },
      solution: {
        icon: Zap,
        title: "Instant Market Validation",
        description: "AI analyzes your market landscape and identifies your ideal customers with validation experiments you can run today.",
        outcome: "Know exactly who will pay and how to reach them in minutes"
      }
    },
    {
      problem: {
        icon: Brain,
        title: "Viability Uncertainty",
        description: "You're passionate about your idea, but have no idea if it's actually viable or profitable in the real world.",
        painPoint: "Fear of wasting months building something nobody wants"
      },
      solution: {
        icon: Target,
        title: "Real Viability Scoring",
        description: "Get detailed viability analysis based on market demand, competition, and your specific resources and constraints.",
        outcome: "Confidence in your next steps with validated business potential"
      }
    }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-card">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="text-primary font-medium">Problem → Solution</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
            Stop Wrestling With Business Planning
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Every successful business starts with the same struggles. Here's how BizMap AI transforms 
            your biggest entrepreneurial pain points into your competitive advantages.
          </p>
        </div>

        {/* Problem-Solution Cards */}
        <div className="space-y-12">
          {painPoints.map((item, index) => (
            <div 
              key={index}
              className="grid md:grid-cols-2 gap-8 items-center"
            >
              {/* Problem Card */}
              <Card className="glass-card hover-lift group border-destructive/20">
                <div className="relative">
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center">
                    <span className="text-destructive-foreground text-sm font-bold">✗</span>
                  </div>
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <item.problem.icon className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        {item.problem.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.problem.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-lg bg-destructive/5 border-l-4 border-destructive">
                    <p className="text-sm text-muted-foreground italic">
                      "<strong>{item.problem.painPoint}</strong>"
                    </p>
                  </div>
                </div>
              </Card>

              {/* Arrow */}
              <div className="flex justify-center md:justify-start">
                <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 animate-pulse-glow">
                  <ArrowRight className="w-8 h-8 text-primary" />
                </div>
                <div className="md:hidden flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 rotate-90">
                  <ArrowRight className="w-6 h-6 text-primary" />
                </div>
              </div>

              {/* Solution Card */}
              <Card className="glass-card hover-lift group border-primary/20 md:order-last">
                <div className="relative">
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-bold">✓</span>
                  </div>
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <item.solution.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        {item.solution.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.solution.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-lg bg-primary/5 border-l-4 border-primary">
                    <p className="text-sm font-semibold text-primary">
                      ✨ <strong>{item.solution.outcome}</strong>
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="glass-card p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4 gradient-text">
              Ready to Transform Your Ideas?
            </h3>
            <p className="text-muted-foreground mb-6">
              Stop struggling with business planning. Get your comprehensive BizMap in minutes, not months.
            </p>
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Button 
                asChild 
                size="lg" 
                className="btn-magnetic gradient-text font-semibold group w-full sm:w-auto"
              >
                <Link to="/dream2plan">
                  Turn My Ideas Into Plans
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto border-primary/20 hover:border-primary/40"
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