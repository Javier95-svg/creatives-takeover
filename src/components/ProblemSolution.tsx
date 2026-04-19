import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Lightbulb, Search, Target, Zap, CheckCircle, AlertCircle, TrendingUp, Users, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const ProblemSolution = () => {
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set(prev).add(index));
          }
        });
      },
      { threshold: 0.2, rootMargin: '-50px' }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

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
          {transformations.map((item, index) => {
            const isVisible = visibleSections.has(index);
            return (
              <div 
                key={index} 
                ref={(el) => {sectionRefs.current[index] = el;}}
                data-index={index}
                className={`grid lg:grid-cols-12 gap-8 items-center transition-all duration-1000 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                } ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              >
                {/* Problem Side */}
                <div className={`lg:col-span-5 ${index % 2 === 1 ? 'lg:order-2' : ''} ${
                  isVisible ? 'animate-slide-in-left' : ''
                }`}>
                  <Card className="group glass border-destructive/30 hover:border-destructive/50 hover:shadow-2xl hover:shadow-destructive/10 transition-all duration-500 overflow-hidden transform hover:scale-105">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive/80 to-destructive/40 group-hover:from-destructive group-hover:to-destructive/60 transition-colors"></div>
                    
                    <CardContent className="p-8">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 group-hover:scale-125 group-hover:bg-destructive/20 transition-all duration-300">
                          <item.problem.icon className="w-8 h-8 text-destructive group-hover:animate-bounce" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-2xl font-bold text-foreground group-hover:text-destructive transition-colors">
                              {item.problem.title}
                            </h3>
                            <AlertCircle className="w-5 h-5 text-destructive animate-pulse" />
                          </div>
                          <p className="text-lg text-muted-foreground leading-relaxed">
                            {item.problem.description}
                          </p>
                        </div>
                      </div>

                      {/* Pain Points */}
                      <div className="space-y-3 mb-6">
                        {item.problem.painPoints.map((point, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 transition-all duration-300 ${
                              isVisible ? `animate-fade-in-up` : ''
                            }`}
                            style={{ animationDelay: isVisible ? `${idx * 150}ms` : '0ms' }}
                          >
                            <div className="w-2 h-2 rounded-full bg-destructive/60 mt-2 flex-shrink-0 animate-pulse"></div>
                            <p className="text-sm text-muted-foreground font-medium">{point}</p>
                          </div>
                        ))}
                      </div>

                      {/* Emotion */}
                      <div className="p-4 rounded-xl bg-destructive/5 border-l-4 border-destructive group-hover:bg-destructive/10 group-hover:border-destructive/80 transition-all duration-300">
                        <p className="text-lg font-semibold text-destructive group-hover:scale-105 transition-transform">
                          {item.problem.emotion}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Transformation Arrow */}
                <div className="lg:col-span-2 flex justify-center">
                  <div className={`relative ${isVisible ? 'animate-zoom-in' : ''}`}>
                    <div className="w-20 h-20 rounded-full glass border-2 border-primary/30 flex items-center justify-center transition-all duration-500 animate-pulse-glow">
                      <ArrowRight className={`w-10 h-10 text-primary ${index % 2 === 1 ? 'rotate-180 lg:rotate-0' : ''}`} />
                    </div>
                    
                    {/* Enhanced Magic Effects */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary/30 animate-ping"></div>
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-secondary/40 animate-bounce"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 animate-spiral pointer-events-none"></div>
                  </div>
                </div>

                {/* Solution Side */}
                <div className={`lg:col-span-5 ${index % 2 === 1 ? 'lg:order-1' : ''} ${
                  isVisible ? 'animate-slide-in-right' : ''
                }`}>
                  <Card className="group glass border-primary/30 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 overflow-hidden transform hover:scale-105">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary group-hover:from-primary/80 group-hover:to-secondary/80 transition-colors"></div>
                    
                    <CardContent className="p-8">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-125 group-hover:bg-primary/20 transition-all duration-300">
                          <item.solution.icon className="w-8 h-8 text-primary group-hover:animate-bounce" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                              {item.solution.title}
                            </h3>
                            <CheckCircle className="w-5 h-5 text-primary animate-pulse" />
                          </div>
                          <p className="text-lg text-muted-foreground leading-relaxed">
                            {item.solution.description}
                          </p>
                        </div>
                      </div>

                      {/* Benefits */}
                      <div className="space-y-3 mb-6">
                        {item.solution.benefits.map((benefit, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-all duration-300 ${
                              isVisible ? `animate-fade-in-up` : ''
                            }`}
                            style={{ animationDelay: isVisible ? `${(idx + 3) * 150}ms` : '0ms' }}
                          >
                            <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0 animate-pulse" />
                            <p className="text-sm text-foreground font-medium">{benefit}</p>
                          </div>
                        ))}
                      </div>

                      {/* Result & Metrics */}
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-primary/5 border-l-4 border-primary group-hover:bg-primary/10 group-hover:border-primary/80 transition-all duration-300">
                          <p className="text-lg font-bold gradient-text mb-1 group-hover:scale-105 transition-transform">
                            {item.solution.result}
                          </p>
                          <p className="text-sm text-primary font-semibold animate-bounce-subtle">
                            ⚡ {item.solution.metrics}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default ProblemSolution;
